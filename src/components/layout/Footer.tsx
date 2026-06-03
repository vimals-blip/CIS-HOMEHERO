import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-accent text-accent-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 font-semibold text-lg">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                <Sparkles className="h-4 w-4" />
              </span>
              HomeHero
            </div>
            <p className="mt-3 text-sm text-white/70">
              Trusted home services at your doorstep. Background-verified professionals in under 10 minutes.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Services</h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li>Deep Cleaning</li>
              <li>Plumbing</li>
              <li>Electrical</li>
              <li>Carpentry</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Company</h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li><Link to="/" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link to="/auth/signup-provider" className="hover:text-white transition-colors">Become a Pro</Link></li>
              <li><span className="cursor-pointer hover:text-white transition-colors">Contact</span></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Download App</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm cursor-pointer hover:bg-white/10 transition-colors">
                <span>📱</span> App Store
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm cursor-pointer hover:bg-white/10 transition-colors">
                <span>🤖</span> Google Play
              </div>
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
