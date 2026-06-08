import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileText } from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Terms of Service — HomeHero" }] }),
  component: TermsPage,
});

const SECTIONS = [
  {
    id: "acceptance",
    title: "1. Acceptance of Terms",
    body: `By accessing or using HomeHero (the "Platform"), you agree to be bound by these Terms of Service. If you do not agree to all terms, you may not use the Platform. These Terms apply to all users — customers who book services ("Customers") and service professionals who fulfill them ("Experts").

We may update these Terms from time to time. Continued use of the Platform after an update constitutes acceptance of the revised Terms. We will notify registered users of material changes via email or an in-app notice.`,
  },
  {
    id: "platform",
    title: "2. Platform Description",
    body: `HomeHero is an on-demand marketplace that connects Customers with background-verified household service Experts for tasks including but not limited to cleaning, dishwashing, laundry, cooking assistance, and kitchen organisation.

HomeHero does not directly employ Experts. Experts operate as independent service providers. HomeHero provides the technology platform, payment processing, quality monitoring, and dispute resolution infrastructure.`,
  },
  {
    id: "accounts",
    title: "3. User Accounts",
    body: `To book or fulfill services, you must create an account. You agree to provide accurate, current, and complete information and to update it promptly if it changes.

You are responsible for safeguarding your password and for all activity under your account. Notify us immediately at help@homehero.com if you suspect unauthorised access.

Accounts are personal and non-transferable. You may not create multiple accounts to circumvent bans, rate limits, or promotional restrictions. HomeHero reserves the right to suspend or terminate accounts that violate these Terms.`,
  },
  {
    id: "booking",
    title: "4. Booking & Payment",
    body: `Bookings are confirmed in real time subject to Expert availability. Prices are quoted per hour and include applicable taxes. No hidden charges are applied unless you request additional hours.

Payment is collected at the time of booking through our payment gateway (Razorpay). HomeHero does not store full card details; your card data is tokenised by our PCI-DSS-compliant payment partner.

In the event of a payment failure, the booking is not confirmed. You will be prompted to retry with the same or a different payment method.`,
  },
  {
    id: "cancellations",
    title: "5. Cancellations & Refunds",
    body: `Customers may cancel a booking up to 30 minutes before the scheduled start time for a full refund. Cancellations within 30 minutes of the start time incur a cancellation fee equal to one hour of service at the booked rate.

Refunds for eligible cancellations are processed to your original payment method within 5–7 business days, or immediately to your HomeHero wallet if you choose that option.

For full details, see our Cancellation & Refund Policy.`,
  },
  {
    id: "expert-obligations",
    title: "6. Expert Obligations",
    body: `Experts must maintain valid identity documents (Aadhaar, PAN) on the Platform at all times. Experts agree to arrive on time, behave respectfully, and complete the booked service to the standard described.

Experts must not solicit direct contact with Customers outside the Platform, accept payments directly, or recruit Customers to a competing service.

Failure to uphold quality standards may result in suspension, reduced visibility in search results, or permanent removal from the Platform following a review.`,
  },
  {
    id: "customer-obligations",
    title: "7. Customer Obligations",
    body: `Customers agree to provide a safe working environment for Experts, including adequate space, equipment, and materials where applicable. Customers must not ask Experts to perform tasks that are outside the scope of the booked service or that would put them at risk.

Harassment, abuse, or discrimination towards Experts is a violation of these Terms and will result in immediate account suspension and potential legal action.`,
  },
  {
    id: "intellectual-property",
    title: "8. Intellectual Property",
    body: `All Platform content — including the HomeHero name, logo, product design, and software — is owned by or licensed to HomeHero Private Limited and is protected by applicable intellectual property laws.

You may not copy, modify, distribute, or create derivative works from Platform content without our prior written permission.`,
  },
  {
    id: "liability",
    title: "9. Limitation of Liability",
    body: `To the fullest extent permitted by law, HomeHero shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Platform or any services booked through it.

Our aggregate liability to any user shall not exceed the amount you paid for the service giving rise to the claim in the three months preceding the event. This limitation does not apply to cases of wilful misconduct or gross negligence by HomeHero.`,
  },
  {
    id: "governing-law",
    title: "10. Governing Law & Disputes",
    body: `These Terms are governed by the laws of India. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts of Bengaluru, Karnataka.

We encourage you to contact our support team first — most issues can be resolved quickly without formal proceedings.`,
  },
  {
    id: "contact",
    title: "11. Contact",
    body: `For questions about these Terms, reach us at:\n\nHomeHero Private Limited\nNo. 42, 3rd Floor, Koramangala 4th Block\nBengaluru – 560 034, Karnataka, India\n\nEmail: legal@homehero.com\nPhone: 1800-202-4040 (toll-free, Mon–Sat 9 AM–6 PM IST)`,
  },
];

function TermsPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeft className="h-4 w-4" /> Back to home
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
          <FileText className="h-5 w-5" />
        </div>
        <h1 className="text-3xl font-bold">Terms of Service</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-10">Effective date: 1 January 2025 · Last updated: 1 June 2026</p>

      <div className="space-y-10">
        {SECTIONS.map((s) => (
          <section key={s.id} id={s.id}>
            <h2 className="text-lg font-semibold mb-3">{s.title}</h2>
            <div className="space-y-3">
              {s.body.split("\n\n").map((para, i) => (
                <p key={i} className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{para}</p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-12 rounded-2xl border bg-muted/40 p-6 text-sm">
        <p className="font-medium mb-1">Have a question about these terms?</p>
        <p className="text-muted-foreground">Our support team is available Monday to Saturday, 9 AM – 6 PM IST.</p>
        <div className="mt-3 flex gap-3">
          <Link to="/support" className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">Contact support</Link>
          <Link to="/refund" className="rounded-lg border px-4 py-2 text-xs font-semibold hover:bg-muted transition-colors">Refund policy</Link>
        </div>
      </div>
    </div>
  );
}
