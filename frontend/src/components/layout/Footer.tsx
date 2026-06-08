import { Link } from "@tanstack/react-router";
import { Sparkles, BadgeCheck, ShieldCheck, Clock, Mail, Phone } from "lucide-react";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t bg-accent text-accent-foreground">
      {/* Trust strip */}
      <div className="border-b border-white/10">
        <div className="container mx-auto grid grid-cols-1 gap-4 px-4 py-6 sm:grid-cols-3">
          {[
            { icon: BadgeCheck, title: "Verified experts", desc: "Aadhaar & PAN checked" },
            { icon: Clock, title: "Arrives in ~10 min", desc: "Instant or scheduled" },
            { icon: ShieldCheck, title: "Service guarantee", desc: "Not happy? We'll fix it" },
          ].map((t) => (
            <div key={t.title} className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10">
                <t.icon className="h-5 w-5 text-primary-glow" />
              </span>
              <div>
                <div className="text-sm font-semibold">{t.title}</div>
                <div className="text-xs text-white/60">{t.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2 text-lg font-semibold">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                <Sparkles className="h-4 w-4" />
              </span>
              HomeHero
            </Link>
            <p className="mt-3 text-sm text-white/70">
              Trained, verified household help at your door in minutes. Cleaning, dishwashing, laundry, cooking and more.
            </p>
            <div className="mt-4 space-y-1.5">
              <a href="mailto:help@homehero.com" className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors">
                <Mail className="h-3.5 w-3.5" /> help@homehero.com
              </a>
              <a href="tel:18002024040" className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors">
                <Phone className="h-3.5 w-3.5" /> 1800-202-4040 (toll-free)
              </a>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="mb-3 font-semibold">Services</h4>
            <ul className="space-y-2 text-sm text-white/70">
              {["Home Cleaning", "Dishwashing", "Kitchen & Bathroom", "Laundry & Folding", "Cooking Assistance"].map((s) => (
                <li key={s}>
                  <Link to="/" hash="services" className="transition-colors hover:text-white">{s}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* For you */}
          <div>
            <h4 className="mb-3 font-semibold">For customers</h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li><Link to="/" hash="services" className="transition-colors hover:text-white">Book a service</Link></li>
              <li><Link to="/bookings" className="transition-colors hover:text-white">My bookings</Link></li>
              <li><Link to="/wallet" className="transition-colors hover:text-white">Wallet</Link></li>
              <li><Link to="/support" className="transition-colors hover:text-white">Help & support</Link></li>
              <li><Link to="/auth/signup-expert" className="transition-colors hover:text-white">Become an expert</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="mb-3 font-semibold">Company</h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li><Link to="/terms" className="transition-colors hover:text-white">Terms of Service</Link></li>
              <li><Link to="/privacy" className="transition-colors hover:text-white">Privacy Policy</Link></li>
              <li><Link to="/refund" className="transition-colors hover:text-white">Cancellation &amp; Refunds</Link></li>
              <li>
                <a href="mailto:help@homehero.com" className="inline-flex items-center gap-1.5 transition-colors hover:text-white">
                  Contact us
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row">
          <span>© {year} HomeHero Private Limited. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link to="/terms" className="hover:text-white/80">Terms</Link>
            <Link to="/privacy" className="hover:text-white/80">Privacy</Link>
            <Link to="/refund" className="hover:text-white/80">Refunds</Link>
            <Link to="/support" className="hover:text-white/80">Support</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
