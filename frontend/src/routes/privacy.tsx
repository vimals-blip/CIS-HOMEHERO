import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Lock } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Privacy Policy — HomeHero" }] }),
  component: PrivacyPage,
});

const SECTIONS = [
  {
    id: "overview",
    title: "1. Overview",
    body: `HomeHero Private Limited ("HomeHero", "we", "us") is committed to protecting your privacy. This Privacy Policy describes what personal data we collect, why we collect it, how we use it, and your rights over it.

This policy applies to the HomeHero mobile app, website, and any related services (collectively, the "Platform"). By using the Platform, you consent to the practices described here.`,
  },
  {
    id: "data-collected",
    title: "2. Information We Collect",
    body: `**Account data**: Name, email address, phone number, city, and (for Experts) gender and professional bio.

**Identity documents** (Experts only): Aadhaar number, PAN card, and a selfie for identity verification. These are stored securely and used solely for KYC purposes.

**Booking data**: Services booked, date/time, addresses, duration, and payment amounts.

**Location data**: Approximate location to match you with nearby Experts and to enable live Expert tracking during an active booking. We collect precise GPS coordinates only when you have an active session with location permission granted.

**Payment data**: Transaction IDs, payment status, and last-four-digits of cards for receipts. Full card details are handled exclusively by our PCI-DSS-certified payment partner (Razorpay) and are never stored on our servers.

**Device & usage data**: IP address, device type, OS version, app version, page visits, and in-app actions. We use this for security monitoring, performance optimisation, and product improvement.

**Communications**: Support messages, reviews, ratings, and any other content you submit to us.`,
  },
  {
    id: "use",
    title: "3. How We Use Your Information",
    body: `We use your data to:

• Create and manage your account
• Match Customers with available Experts
• Process payments and issue refunds
• Enable real-time Expert tracking
• Verify Expert identities (KYC)
• Send booking confirmations, reminders, and receipts
• Respond to support requests
• Detect and prevent fraud or abuse
• Improve and personalise the Platform experience
• Comply with legal obligations

We do not use your data for any purpose incompatible with the above without your explicit consent.`,
  },
  {
    id: "sharing",
    title: "4. Information Sharing",
    body: `We share your data only in the following circumstances:

**With Experts**: When you book a service, we share your first name, booking address, service details, and contact number with the assigned Expert.

**With Customers**: When you are assigned a booking as an Expert, Customers can see your name, profile photo, average rating, and approximate distance.

**With service providers**: We share data with trusted third parties that help us operate the Platform, including Razorpay (payments), Firebase (push notifications), and cloud hosting providers. All such parties are bound by data processing agreements.

**For legal reasons**: We may disclose data if required by law, court order, or to protect the rights, safety, or property of HomeHero, our users, or the public.

We do not sell, rent, or trade your personal data to third-party advertisers.`,
  },
  {
    id: "security",
    title: "5. Data Security",
    body: `We use industry-standard security measures to protect your data, including TLS encryption in transit, encrypted storage for sensitive fields, role-based access controls, and regular security audits.

Despite these measures, no system is completely secure. If you suspect a security breach affecting your account, notify us immediately at security@homehero.com.`,
  },
  {
    id: "retention",
    title: "6. Data Retention",
    body: `We retain your account data for as long as your account is active, plus a period required by applicable law (typically 3–7 years for financial records).

You may request deletion of your account and associated personal data at any time (see Your Rights below). Deletion requests are processed within 30 days. Some data may be retained in anonymised or aggregated form for analytics.`,
  },
  {
    id: "rights",
    title: "7. Your Rights",
    body: `Under applicable data protection law, you have the right to:

• **Access**: Request a copy of the personal data we hold about you.
• **Correction**: Ask us to correct inaccurate or incomplete data.
• **Deletion**: Ask us to erase your personal data (subject to legal retention requirements).
• **Portability**: Receive your data in a structured, machine-readable format.
• **Objection**: Object to certain processing activities, such as direct marketing.
• **Withdraw consent**: Where processing is based on consent, withdraw it at any time.

To exercise any of these rights, contact us at privacy@homehero.com. We will respond within 30 days.`,
  },
  {
    id: "cookies",
    title: "8. Cookies & Tracking",
    body: `The HomeHero website uses essential cookies to maintain session state and security. We do not use third-party advertising cookies.

You can control cookie preferences through your browser settings. Disabling cookies may affect certain Platform features.`,
  },
  {
    id: "children",
    title: "9. Children's Privacy",
    body: `The Platform is not directed at children under 18. We do not knowingly collect personal data from minors. If you believe a child has provided us with personal information, contact us at privacy@homehero.com and we will delete it promptly.`,
  },
  {
    id: "changes",
    title: "10. Changes to This Policy",
    body: `We may update this Privacy Policy periodically. We will notify registered users of material changes via email or an in-app notice at least 14 days before they take effect. The "Last updated" date at the top of this page reflects the most recent revision.`,
  },
  {
    id: "contact",
    title: "11. Contact & Grievance Officer",
    body: `If you have questions or concerns about this Privacy Policy or our data practices, contact our Grievance Officer:

HomeHero Private Limited
Attn: Data Privacy Officer
No. 42, 3rd Floor, Koramangala 4th Block
Bengaluru – 560 034, Karnataka, India

Email: privacy@homehero.com
Phone: 1800-202-4040 (toll-free, Mon–Sat 9 AM–6 PM IST)

We aim to respond to all privacy enquiries within 7 business days.`,
  },
];

function PrivacyPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeft className="h-4 w-4" /> Back to home
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
          <Lock className="h-5 w-5" />
        </div>
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
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
        <p className="font-medium mb-1">Questions about your data?</p>
        <p className="text-muted-foreground">Write to privacy@homehero.com — we respond within 7 business days.</p>
        <div className="mt-3 flex gap-3">
          <a href="mailto:privacy@homehero.com" className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">Email us</a>
          <Link to="/terms" className="rounded-lg border px-4 py-2 text-xs font-semibold hover:bg-muted transition-colors">Terms of Service</Link>
        </div>
      </div>
    </div>
  );
}
