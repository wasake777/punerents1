import Link from "next/link";
import type { PostMeta } from "./types";

export const meta: PostMeta = {
  slug: "security-deposit-pune",
  title: "Security Deposit in Pune: What's Normal, What's Negotiable, How to Get It Back",
  description:
    "How many months' deposit is standard in Pune, how it compares to Mumbai and Bengaluru, what owners can legally deduct, and the exact steps that get your full deposit back when you move out.",
  date: "2026-08-05",
  minutes: 7,
  tags: ["deposit", "negotiation", "moving out"],
  faq: [
    {
      q: "How many months' deposit is normal in Pune?",
      a: "Two to three months' rent is the norm for most Pune rentals, with up to five or six months in premium buildings in Koregaon Park or Kalyani Nagar. Anything beyond six months is unusual and worth negotiating hard. This is far gentler than Bengaluru, where ten months is common.",
    },
    {
      q: "Can a landlord deduct from my deposit for painting?",
      a: "Only if the agreement says so. Many Pune agreements include a fixed painting charge (often half a month to one month's rent) deducted at exit; if yours doesn't, normal wear and tear - faded paint, minor scuffs - is not deductible. Damage beyond normal wear is.",
    },
    {
      q: "What can I do if my landlord refuses to return the deposit?",
      a: "Send a written demand referencing the registered agreement, then a lawyer's notice. Consumer forums and civil courts handle deposit disputes, and a registered leave-and-licence agreement makes the claim straightforward. Documentation - photos, the agreement, rent receipts and handover emails - decides these cases.",
    },
  ],
};

export default function Body() {
  return (
    <>
      <p>
        The deposit is the biggest cheque you write when renting in Pune - often bigger than
        brokerage and first month&apos;s rent combined - and it is also the money most often lost
        to vague agreements and bad exits. Here is what&apos;s standard, what&apos;s negotiable,
        and how to make sure it comes back.
      </p>

      <h2>What&apos;s normal in Pune</h2>
      <p>
        The Pune convention is <strong>two to three months&apos; rent</strong> as an interest-free
        refundable deposit. Premium buildings, furnished flats and addresses in{" "}
        <Link href="/rent/koregaon-park">Koregaon Park</Link> or{" "}
        <Link href="/rent/kalyani-nagar">Kalyani Nagar</Link> push it to{" "}
        <strong>five or six months</strong>. By Indian standards this is moderate -
        Bengaluru&apos;s ten-month convention is the outlier - but on a ₹25,000 flat, three months
        is still ₹75,000 locked up for as long as you stay.
      </p>
      <p>
        Deposits also vary by area and flat type. Tenants on PuneRents report deposits alongside
        rents, so the <Link href="/rent">area pages</Link> show the median deposit for each flat
        size - check yours before accepting &quot;that&apos;s the standard here&quot; at face
        value.
      </p>

      <h2>What&apos;s negotiable</h2>
      <ul>
        <li>
          <strong>The number of months.</strong> Owners quote five and settle for two or three
          more often than you&apos;d think, especially for salaried tenants with references and no
          broker in the middle. A larger deposit is a convenience for the owner, not a rule.
        </li>
        <li>
          <strong>Deposit vs rent trade.</strong> Some owners will take a slightly higher rent for
          a smaller deposit, or vice versa. If you&apos;re cash-tight at move-in, ask.
        </li>
        <li>
          <strong>Staggered payment.</strong> Half at signing, half at key handover is a
          reasonable ask and filters out fraud - no legitimate owner needs the full deposit weeks
          before possession.
        </li>
        <li>
          <strong>The painting clause.</strong> Many agreements bake in a painting deduction at
          exit (half to one month&apos;s rent). If the flat wasn&apos;t freshly painted when you
          moved in, strike or cap it.
        </li>
      </ul>

      <h2>Protect it on the way in</h2>
      <ol>
        <li>
          <strong>Pay by bank transfer</strong>, never cash, with &quot;security deposit&quot; in
          the remark. The UTR is your receipt.
        </li>
        <li>
          <strong>Get the amount and refund terms into the registered agreement</strong> - the
          amount, the refund timeline in days, and every permitted deduction, spelled out. See the{" "}
          <Link href="/blog/rent-agreement-pune-guide">rent agreement guide</Link> for the other
          clauses that matter, including police verification, which Pune owners are required to
          complete for tenants.
        </li>
        <li>
          <strong>Document the flat&apos;s condition on day one.</strong> A dated video walkthrough
          plus photos of existing damage, shared with the owner on WhatsApp or email so there is a
          timestamped record both sides acknowledged.
        </li>
        <li>
          <strong>Inventory furnished flats.</strong> List appliances and furniture with their
          condition in an annexure to the agreement.
        </li>
      </ol>

      <h2>Getting it back when you leave</h2>
      <ol>
        <li>
          <strong>Give written notice</strong> per the agreement (email counts; follow whatever
          notice period you signed).
        </li>
        <li>
          <strong>Schedule a joint inspection</strong> a few days before handover, not on moving
          day - it leaves time to fix small things yourself instead of eating an inflated
          deduction.
        </li>
        <li>
          <strong>Clear the utility trail.</strong> Pay the final electricity, gas and internet
          bills and share the receipts. Unpaid utilities are the most legitimate deduction there
          is.
        </li>
        <li>
          <strong>Exchange keys against payment.</strong> The clean convention: deposit (minus
          agreed deductions) is transferred on the day you hand over keys. If the owner needs a few
          days, get the date in writing before you leave the city.
        </li>
      </ol>

      <h2>If the owner won&apos;t pay</h2>
      <p>
        Escalate in writing: first a polite written demand citing the agreement clause, then a
        lawyer&apos;s notice (a few thousand rupees, and it resolves a surprising share of cases).
        Beyond that, deposit disputes go to the consumer forum or civil court - slow, but with a
        registered agreement, rent receipts and your move-in documentation, tenants generally win.
        The pattern in every successful recovery is the same:{" "}
        <strong>paper trail beats phone calls</strong>.
      </p>

      <h2>Know the going rate before you negotiate</h2>
      <p>
        Deposit norms are local knowledge, and owners rely on you not having it. The{" "}
        <Link href="/">PuneRents map</Link> and <Link href="/rent">area pages</Link> show
        crowdsourced rents <em>and deposits</em> for each locality and flat size - and once
        you&apos;ve signed, adding your own numbers anonymously helps the next tenant push back on
        a six-month ask.
      </p>
    </>
  );
}
