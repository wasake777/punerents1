// lib/notify sendEmail: provider selection (SES vs Resend vs skipped) and
// Resend 429 retry semantics. notify.ts reads AWS env at module load, so each
// test sets env first and re-imports via loadNotify().
import { beforeEach, describe, expect, it, vi } from "vitest";

const sesSend = vi.fn(async () => ({}));
vi.mock("@aws-sdk/client-sesv2", () => ({
  // `function` (not arrows): the mocked classes are called with `new`.
  SESv2Client: vi.fn(function (this: { send: typeof sesSend }) {
    this.send = sesSend;
  }),
  SendEmailCommand: vi.fn(function (this: { input: unknown }, input: unknown) {
    this.input = input;
  }),
}));
vi.mock("@aws-sdk/client-sns", () => ({
  SNSClient: vi.fn(function (this: { send: () => Promise<object> }) {
    this.send = async () => ({});
  }),
  PublishCommand: vi.fn(function (this: { input: unknown }, input: unknown) {
    this.input = input;
  }),
}));

async function loadNotify() {
  vi.resetModules();
  return await import("@/lib/notify");
}

function setAwsEnv() {
  process.env.AWS_REGION = "ap-south-1";
  process.env.AWS_ACCESS_KEY_ID = "AKIATEST";
  process.env.AWS_SECRET_ACCESS_KEY = "secret";
}

/** fetch stub that answers each call with the next status in the list. */
function stubResendFetch(...statuses: number[]) {
  let call = 0;
  const fetchMock = vi.fn(async () => {
    const status = statuses[Math.min(call++, statuses.length - 1)];
    return new Response("{}", {
      status,
      // Retry-After: 0 keeps the retry path fast in tests.
      headers: status === 429 ? { "retry-after": "0" } : {},
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  for (const k of [
    "AWS_REGION", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY",
    "RESEND_API_KEY", "MATCH_FROM_EMAIL", "SMS_ENABLED",
  ]) {
    delete process.env[k];
  }
});

describe("provider selection", () => {
  it("skips when nothing is configured", async () => {
    const { sendEmail, emailConfigured } = await loadNotify();
    expect(emailConfigured()).toBe(false);
    expect(await sendEmail("a@b.co", "s", "<p>x</p>")).toBe("skipped");
  });

  it("sends via Resend when only RESEND_API_KEY is set", async () => {
    process.env.RESEND_API_KEY = "re_test";
    const fetchMock = stubResendFetch(200);
    const { sendEmail, emailConfigured } = await loadNotify();

    expect(emailConfigured()).toBe(true);
    expect(await sendEmail("a@b.co", "s", "<p>x</p>")).toBe("sent");
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(sesSend).not.toHaveBeenCalled();
  });

  it("uses SES when AWS creds and MATCH_FROM_EMAIL are both set", async () => {
    setAwsEnv();
    process.env.MATCH_FROM_EMAIL = "PuneRents <match@example.com>";
    const fetchMock = stubResendFetch(200);
    const { sendEmail } = await loadNotify();

    expect(await sendEmail("a@b.co", "s", "<p>x</p>")).toBe("sent");
    expect(sesSend).toHaveBeenCalledOnce();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back to Resend when AWS creds lack MATCH_FROM_EMAIL (no verified SES sender)", async () => {
    setAwsEnv();
    process.env.RESEND_API_KEY = "re_test";
    const fetchMock = stubResendFetch(200);
    const { sendEmail, emailConfigured } = await loadNotify();

    expect(emailConfigured()).toBe(true);
    expect(await sendEmail("a@b.co", "s", "<p>x</p>")).toBe("sent");
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(sesSend).not.toHaveBeenCalled();
  });

  it("skips when AWS creds are set but neither MATCH_FROM_EMAIL nor RESEND_API_KEY", async () => {
    setAwsEnv();
    const { sendEmail, emailConfigured } = await loadNotify();
    expect(emailConfigured()).toBe(false);
    expect(await sendEmail("a@b.co", "s", "<p>x</p>")).toBe("skipped");
    expect(sesSend).not.toHaveBeenCalled();
  });

  it("reports failed when SES rejects the send", async () => {
    setAwsEnv();
    process.env.MATCH_FROM_EMAIL = "match@example.com";
    sesSend.mockRejectedValueOnce(new Error("sandbox: address not verified"));
    const { sendEmail } = await loadNotify();
    expect(await sendEmail("a@b.co", "s", "<p>x</p>")).toBe("failed");
  });
});

describe("Resend retry on 429", () => {
  it("retries a rate-limited send and succeeds", async () => {
    process.env.RESEND_API_KEY = "re_test";
    const fetchMock = stubResendFetch(429, 200);
    const { sendEmail } = await loadNotify();

    expect(await sendEmail("a@b.co", "s", "<p>x</p>")).toBe("sent");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives up after the retry budget on persistent 429s", async () => {
    process.env.RESEND_API_KEY = "re_test";
    const fetchMock = stubResendFetch(429);
    const { sendEmail } = await loadNotify();

    expect(await sendEmail("a@b.co", "s", "<p>x</p>")).toBe("failed");
    expect(fetchMock).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it("does not retry non-429 errors", async () => {
    process.env.RESEND_API_KEY = "re_test";
    const fetchMock = stubResendFetch(500);
    const { sendEmail } = await loadNotify();

    expect(await sendEmail("a@b.co", "s", "<p>x</p>")).toBe("failed");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("does not retry network errors", async () => {
    process.env.RESEND_API_KEY = "re_test";
    const fetchMock = vi.fn(async () => {
      throw new Error("ECONNRESET");
    });
    vi.stubGlobal("fetch", fetchMock);
    const { sendEmail } = await loadNotify();

    expect(await sendEmail("a@b.co", "s", "<p>x</p>")).toBe("failed");
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
