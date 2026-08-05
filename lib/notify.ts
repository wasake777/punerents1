// Server-only notification helpers for the match cron.
//
// Email: AWS SES when AWS creds AND MATCH_FROM_EMAIL are configured (SES
//        requires a verified sender identity, so without one every send would
//        fail), else Resend, else skipped.
// SMS:   AWS SNS (transactional), enabled with SMS_ENABLED=true.
//
// "skipped" means not configured - callers may still record the match so
// notifications flow once creds are added. "failed" means a real send error -
// callers should retry on the next run where it matters.

import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2";
import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import { toE164 } from "./validate";

export { toE164 };

export type SendResult = "sent" | "skipped" | "failed";

const region = process.env.AWS_REGION;
const hasAws = !!(
  region &&
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY
);

// Lazy singletons - route runs serverless, keep cold starts cheap.
let ses: SESv2Client | null = null;
let sns: SNSClient | null = null;

function fromAddress(): string {
  return process.env.MATCH_FROM_EMAIL ?? "PuneRents <onboarding@resend.dev>";
}

// The default from-address only works with Resend; SES rejects any sender
// that isn't a verified identity. So AWS creds alone aren't enough for SES -
// without MATCH_FROM_EMAIL, email falls through to Resend (and AWS creds can
// still serve SNS SMS alone).
function sesConfigured(): boolean {
  return hasAws && !!process.env.MATCH_FROM_EMAIL;
}

/** True when sendEmail has a provider to use - mirrors its selection logic. */
export function emailConfigured(): boolean {
  return sesConfigured() || !!process.env.RESEND_API_KEY;
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<SendResult> {
  if (sesConfigured()) {
    try {
      ses ??= new SESv2Client({ region });
      await ses.send(
        new SendEmailCommand({
          FromEmailAddress: fromAddress(),
          Destination: { ToAddresses: [to] },
          Content: {
            Simple: {
              Subject: { Data: subject, Charset: "UTF-8" },
              Body: { Html: { Data: html, Charset: "UTF-8" } },
            },
          },
        })
      );
      return "sent";
    } catch {
      return "failed";
    }
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) return "skipped";
  // Resend allows ~2 requests/sec and the matcher sends in parallel bursts,
  // so 429s are expected under load. Wait and retry instead of counting the
  // send as failed - a "failed" seeker email postpones that match a whole day.
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from: fromAddress(), to: [to], subject, html }),
      });
      if (res.ok) return "sent";
      if (res.status !== 429 || attempt >= 2) return "failed";
      const after = Number(res.headers.get("retry-after"));
      const secs = Number.isFinite(after) && after >= 0 ? Math.min(after, 5) : 1;
      await new Promise((r) => setTimeout(r, secs * 1000));
    } catch {
      return "failed";
    }
  }
}

export async function sendSms(
  phone: string | null,
  message: string
): Promise<SendResult> {
  if (!phone || !hasAws || process.env.SMS_ENABLED !== "true") return "skipped";
  const e164 = toE164(phone);
  if (!e164) return "failed";
  try {
    sns ??= new SNSClient({ region });
    await sns.send(
      new PublishCommand({
        PhoneNumber: e164,
        Message: message,
        MessageAttributes: {
          "AWS.SNS.SMS.SMSType": {
            DataType: "String",
            StringValue: "Transactional",
          },
        },
      })
    );
    return "sent";
  } catch {
    return "failed";
  }
}
