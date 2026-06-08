import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, RefreshCw, Clock, CheckCircle2, XCircle, Wallet } from "lucide-react";

export const Route = createFileRoute("/refund")({
  head: () => ({ meta: [{ title: "Cancellation & Refund Policy — HomeHero" }] }),
  component: RefundPage,
});

const QUICK = [
  { icon: Clock, label: "Cancel free", desc: "Up to 30 min before start" },
  { icon: Wallet, label: "Instant to wallet", desc: "Refund in 0–1 business days" },
  { icon: CheckCircle2, label: "Bank transfer", desc: "5–7 business days" },
  { icon: RefreshCw, label: "Quality issue?", desc: "Full refund, no questions asked" },
];

const SECTIONS = [
  {
    id: "customer-cancel",
    title: "Cancellations by the Customer",
    rows: [
      { when: "More than 30 minutes before start", refund: "100% refund", notes: "No questions asked" },
      { when: "15–30 minutes before start", refund: "50% refund", notes: "One-hour service fee retained" },
      { when: "Less than 15 minutes before start", refund: "No refund", notes: "Expert has already been dispatched" },
      { when: "After Expert arrives", refund: "No refund", notes: "You are charged for the minimum booking duration" },
    ],
  },
];

const DETAILS = [
  {
    id: "how-to-cancel",
    title: "How to Cancel",
    body: `Open the HomeHero app, go to My Bookings, tap the booking you wish to cancel, and select "Cancel Booking". You'll see the applicable refund amount before confirming. Cancellations can also be made through our website or by calling 1800-202-4040.`,
  },
  {
    id: "refund-method",
    title: "Refund Method & Timelines",
    body: `Eligible refunds are processed to one of the following destinations:

**HomeHero Wallet (instant)**: If you choose to receive your refund as wallet credits, the amount is added within minutes. Wallet credits can be used for any future booking and do not expire.

**Original payment method**: If you prefer a refund to your card or UPI account, it typically takes 5–7 business days depending on your bank. We initiate the refund within 24 hours of approval.

You will receive an email and push notification once your refund has been initiated.`,
  },
  {
    id: "expert-cancel",
    title: "Expert Cancellations",
    body: `If an Expert cancels or does not arrive within 15 minutes of the scheduled time, you are entitled to a 100% refund, regardless of when the booking was placed.

In this case, we will also offer you a priority re-booking with a verified Expert at the same rate, subject to availability.`,
  },
  {
    id: "quality",
    title: "Service Quality Issues",
    body: `If you are not satisfied with the quality of service delivered, report the issue within 24 hours of the booking end time through the app (Rate & Review screen → "Report an issue") or by contacting our support team.

Valid quality complaints are investigated within 2 business days. If upheld, you will receive:
• A full or partial refund at our discretion based on the severity of the issue
• A complimentary re-service booking (where applicable)

We take quality seriously — our Experts are rated and reviewed after every booking. Repeated complaints against an Expert result in suspension pending a review.`,
  },
  {
    id: "no-show",
    title: "No-Show by the Customer",
    body: `If you are not present at the service address when the Expert arrives and do not respond within 10 minutes, the booking may be marked as a no-show. No-shows are treated as same-day cancellations and are non-refundable.

To avoid no-show charges, please cancel in advance or reschedule through the app.`,
  },
  {
    id: "promo-wallet",
    title: "Promotional Credits & Wallet",
    body: `Promotional credits (coupon discounts, referral bonuses) are non-refundable and non-transferable. If a booking made with promotional credits is cancelled, the paid portion is refunded but the promotional portion is forfeited.

HomeHero Wallet credits have no expiry and can be used across any service on the Platform.`,
  },
  {
    id: "disputes",
    title: "Disputes",
    body: `If you disagree with a refund decision, you can escalate through the app (Support → Escalate) or by emailing refunds@homehero.com with your booking ID. Our senior support team reviews escalations within 5 business days.

Unresolved disputes are subject to the Governing Law clause in our Terms of Service.`,
  },
];

function RefundPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeft className="h-4 w-4" /> Back to home
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
          <RefreshCw className="h-5 w-5" />
        </div>
        <h1 className="text-3xl font-bold">Cancellation &amp; Refund Policy</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-10">Effective date: 1 January 2025 · Last updated: 1 June 2026</p>

      {/* Quick reference */}
      <div className="grid grid-cols-2 gap-3 mb-12 sm:grid-cols-4">
        {QUICK.map((q) => (
          <div key={q.label} className="rounded-2xl border bg-card p-4 text-center">
            <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary mb-2">
              <q.icon className="h-5 w-5" />
            </div>
            <div className="text-sm font-semibold">{q.label}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{q.desc}</div>
          </div>
        ))}
      </div>

      {/* Cancellation table */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-4">Cancellation Window &amp; Refund Amounts</h2>
        <div className="overflow-x-auto rounded-2xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">When you cancel</th>
                <th className="px-4 py-3 text-left font-semibold">Refund</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {SECTIONS[0].rows.map((r) => (
                <tr key={r.when} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">{r.when}</td>
                  <td className="px-4 py-3 font-medium">{r.refund}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Detail sections */}
      <div className="space-y-10">
        {DETAILS.map((d) => (
          <section key={d.id} id={d.id}>
            <h2 className="text-lg font-semibold mb-3">{d.title}</h2>
            <div className="space-y-3">
              {d.body.split("\n\n").map((para, i) => (
                <p key={i} className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{para}</p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-12 rounded-2xl border bg-muted/40 p-6 text-sm">
        <p className="font-medium mb-1">Need help with a refund?</p>
        <p className="text-muted-foreground">Contact us at <a href="mailto:refunds@homehero.com" className="text-primary hover:underline">refunds@homehero.com</a> with your booking ID. We resolve most refund queries within 2 business days.</p>
        <div className="mt-3 flex gap-3">
          <Link to="/support" className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">Contact support</Link>
          <Link to="/terms" className="rounded-lg border px-4 py-2 text-xs font-semibold hover:bg-muted transition-colors">Terms of Service</Link>
        </div>
      </div>
    </div>
  );
}
