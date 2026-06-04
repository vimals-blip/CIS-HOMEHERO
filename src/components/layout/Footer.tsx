import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-accent text-accent-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 text-lg font-semibold">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                <Sparkles className="h-4 w-4" />
              </span>
              HomeHero
            </div>
            <p className="mt-3 text-sm text-white/70">
              Trained, verified household help at your door in minutes. Cleaning, dishwashing, laundry, cooking and more.
            </p>
          </div>
          <div>
            <h4 className="mb-3 font-semibold">Services</h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li>Home Cleaning</li>
              <li>Dishwashing</li>
              <li>Kitchen & Bathroom</li>
              <li>Laundry & Cooking</li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 font-semibold">Company</h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li><Link to="/auth/signup-expert" className="transition-colors hover:text-white">Become an Expert</Link></li>
              <li><Link to="/p/$slug" params={{ slug: "terms" }} className="transition-colors hover:text-white">Terms of Service</Link></li>
              <li><Link to="/p/$slug" params={{ slug: "privacy" }} className="transition-colors hover:text-white">Privacy Policy</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 font-semibold">Get the app</h4>
            <div className="space-y-2">
              <div className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm transition-colors hover:bg-white/10">📱 App Store</div>
              <div className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm transition-colors hover:bg-white/10">🤖 Google Play</div>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t border-white/10 pt-6 text-center text-xs text-white/50">
          © {new Date().getFullYear()} HomeHero. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
