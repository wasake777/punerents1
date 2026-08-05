import Link from "next/link";
import type { PostMeta } from "./types";

export const meta: PostMeta = {
  slug: "rent-agreement-pune-guide",
  title: "Rent Agreement in Pune: Leave & Licence, E-Registration, Police Verification - Explained",
  description:
    "How renting paperwork works in Pune: the 11-month leave-and-licence convention, Maharashtra's online e-registration, stamp duty, mandatory tenant police verification, and the clauses that actually matter.",
  date: "2026-08-05",
  minutes: 8,
  tags: ["agreement", "legal", "renting basics"],
  faq: [
    {
      q: "Is police verification really mandatory for tenants in Pune?",
      a: "Yes. Maharashtra requires owners to submit tenant details to the local police, and Pune Police actively enforce it - many societies ask for the verification receipt before issuing a gate pass. It can be filed online through the Pune Police tenant verification portal and costs nothing.",
    },
    {
      q: "Is a notarised rent agreement valid in Pune?",
      a: "Not for what you need it for. In Maharashtra, a leave-and-licence agreement is expected to be registered; a notarised agreement is weak evidence in a dispute and often rejected as address proof by banks and passport offices. Registration is online and cheap, so there is no good reason to skip it.",
    },
    {
      q: "Who pays for rent agreement registration in Pune - owner or tenant?",
      a: "By convention the tenant pays the registration fee (₹1,000 for online registration, plus a doorstep biometric charge) and stamp duty (roughly 0.25% of the total rent for the term) is shared or paid by the tenant. In practice the total is ₹2,000-4,000 for a typical 11-month agreement and most tenants pay all of it.",
    },
  ],
};

export default function Body() {
  return (
    <>
      <p>
        Pune runs on the <strong>leave-and-licence</strong> agreement: typically eleven months,
        registered online, renewable on both sides&apos; consent. It&apos;s genuinely one of the
        better rental-paperwork systems in India - Maharashtra pioneered online registration - but
        only if you actually use it. Here&apos;s what to know before you sign.
      </p>

      <h2>Why eleven months, and why leave-and-licence</h2>
      <p>
        The eleven-month convention keeps the agreement a <em>licence to occupy</em> rather than a
        lease, which gives the owner a cleaner exit if things go wrong - and gives you a clean,
        short commitment if they do. Most Pune agreements renew annually with a negotiated
        escalation (5-10% is customary). There is no law forcing eleven months; it&apos;s simply
        the market standard, and deviating from it is a negotiation point, not a red flag.
      </p>

      <h2>Registration: online, and actually easy</h2>
      <p>
        Maharashtra&apos;s IGR department runs an e-registration system for leave-and-licence
        agreements: fill the draft online, pay stamp duty and the registration fee, and complete
        Aadhaar-based biometric verification - a technician comes to the flat, so neither side
        visits a sub-registrar office. The whole thing typically costs{" "}
        <strong>₹2,000-4,000</strong> for a mid-range Pune flat and finishes in a day or two.
      </p>
      <p>
        A <strong>notarised agreement is not a substitute</strong>. Registration is what makes the
        agreement enforceable and what banks, employers and the passport office accept as address
        proof. If an owner pushes &quot;notary is enough&quot;, the usual reason is avoiding a
        paper trail - push back.
      </p>

      <h2>Police verification: the Pune-specific step</h2>
      <p>
        Pune Police require owners to report every tenant, and enforcement is real - societies in{" "}
        <Link href="/rent/baner">Baner</Link>, <Link href="/rent/wakad">Wakad</Link> and{" "}
        <Link href="/rent/viman-nagar">Viman Nagar</Link> routinely ask new tenants for the
        verification acknowledgement before issuing move-in permissions. It&apos;s done online in
        minutes with your ID and the agreement details. Treat it as non-negotiable: it protects the
        owner from liability and protects you by creating an official record of who lives where.
      </p>

      <h2>The clauses that actually matter</h2>
      <ul>
        <li>
          <strong>Deposit amount and refund timeline.</strong> The number of months, and the exact
          number of days after vacating by which it must be refunded. Two to three months is the
          Pune norm - see the <Link href="/blog/security-deposit-pune">deposit guide</Link> for
          what&apos;s negotiable.
        </li>
        <li>
          <strong>Lock-in and notice period.</strong> Many Pune agreements have no lock-in and a
          one-month notice; some have a 2-3 month lock-in or a notice-forfeiture of deposit. Know
          which you&apos;re signing.
        </li>
        <li>
          <strong>Escalation on renewal.</strong> &quot;10% on renewal&quot; compounds fast. Ask
          for 5%, or a flat rent for the full stay if you&apos;ll sign longer.
        </li>
        <li>
          <strong>Painting and maintenance deductions.</strong> If there&apos;s a fixed painting
          charge at exit, it should be capped and stated - not discovered when you leave.
        </li>
        <li>
          <strong>What&apos;s included.</strong> Society maintenance, parking slots, club charges -
          each should be named as included or extra. Pune societies vary wildly on this.
        </li>
        <li>
          <strong>Guests, flatmates and subletting.</strong> Bachelor tenants: get the
          sharing/flatmate clause in writing, because society bye-laws on this are the most common
          source of conflict.
        </li>
      </ul>

      <h2>The process, start to finish</h2>
      <ol>
        <li>
          Negotiate rent, deposit, move-in date and the clauses above - with the area&apos;s
          reported median rent in hand (the <Link href="/rent">area guide</Link> has it).
        </li>
        <li>Verify ownership: maintenance or electricity bill in the owner&apos;s name.</li>
        <li>
          Draft and e-register the leave-and-licence agreement; both sides complete biometric
          verification.
        </li>
        <li>Pay the deposit by bank transfer against the registered agreement.</li>
        <li>
          Owner files your police verification; you collect the acknowledgement for the society
          office.
        </li>
        <li>
          Do a dated video walkthrough at move-in and share it with the owner - your deposit
          insurance for move-out day.
        </li>
      </ol>

      <h2>One last thing</h2>
      <p>
        Every clause you negotiate from data instead of vibes saves you money. The{" "}
        <Link href="/">PuneRents map</Link> shows what tenants in your building&apos;s area
        actually pay - and after you sign,{" "}
        <Link href="/">pinning your own rent</Link> anonymously gives the next tenant the same
        leverage.
      </p>
    </>
  );
}
