import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Clock, ShieldCheck, BadgeCheck, Star, ArrowRight, Quote,
  Sparkles, Users, Heart, Zap, ChevronDown, Download, MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { serviceIcon } from "@/lib/icons";
import { EmptyState } from "@/components/shared/EmptyState";
import { BannerSlider, type Slide } from "@/components/home/BannerSlider";
import { AnimatedCounter } from "@/components/shared/AnimatedCounter";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HomeHero — Trained household help at your door in minutes" },
      { name: "description", content: "Book a trained, verified expert for cleaning, dishwashing, laundry and cooking. Arrives in minutes — instant or scheduled." },
    ],
  }),
  component: Home,
});

const CITIES = ["Bengaluru", "Mumbai", "Delhi", "Hyderabad", "Pune", "Gurugram", "Noida", "Thane", "Chennai", "Kolkata", "Ahmedabad", "Jaipur"];

const FAQS = [
  { q: "How quickly does an expert arrive?", a: "In most areas, a verified expert arrives within 10 minutes of booking confirmation. Scheduled bookings guarantee your chosen time slot." },
  { q: "Are the experts background-verified?", a: "Yes. Every expert goes through Aadhaar and PAN verification before joining. We also run continuous quality checks and review every booking." },
  { q: "What if I'm not happy with the service?", a: "Report the issue within 24 hours through the app. We'll investigate and, if warranted, issue a full refund or send another expert at no extra cost — no questions asked." },
  { q: "Can I book a recurring service?", a: "Absolutely. After a booking is completed, you can rebook the same expert and set a recurring schedule (daily, weekly, or custom) directly from the app." },
  { q: "How do I pay?", a: "We accept all major cards, UPI (GPay, PhonePe, Paytm), net banking, and HomeHero Wallet credits. Payment is collected at booking; no cash needed." },
  { q: "What happens if I need to cancel?", a: "Cancel free of charge up to 30 minutes before your scheduled start time. Cancellations closer to the start time may incur a small fee. See our Cancellation & Refund Policy for details." },
  { q: "How do I become a HomeHero expert?", a: "Click 'Become an expert', complete your profile, upload your Aadhaar and PAN, and our team will verify and onboard you — usually within 48 hours." },
];

// Built-in showcase slides — used when no CMS banners are configured.
const HERO_SLIDES: Slide[] = [
  {
    image_url: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1400&q=75",
    title: "Sparkling clean homes, on demand",
    subtitle: "Trained, verified experts at your door in ~10 minutes.",
  },
  {
    image_url: "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1400&q=75",
    title: "Kitchen & dishwashing help",
    subtitle: "Hand over the mess — book by the hour, instant or scheduled.",
  },
  {
    image_url: "https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=1400&q=75",
    title: "Laundry, folded and sorted",
    subtitle: "Reliable help for the chores you'd rather skip.",
  },
  {
    image_url: "https://images.unsplash.com/photo-1466637574441-749b8f19452f?auto=format&fit=crop&w=1400&q=75",
    title: "Home-style cooking assistance",
    subtitle: "Fresh meals prepped by trained kitchen experts.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left text-base font-semibold hover:text-primary transition-colors group"
      >
        <span className="group-hover:translate-x-0.5 transition-transform duration-200 text-foreground">{q}</span>
        <ChevronDown className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300", open && "rotate-180 text-primary")} />
      </button>
      <div className={cn("overflow-hidden transition-all duration-300 ease-in-out", open ? "max-h-40 pb-5" : "max-h-0")}>
        <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

function Home() {
  const { data: services = [], isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: () => apiFetch("/services"),
  });

  const { data: banners = [] } = useQuery({
    queryKey: ["banners"],
    queryFn: () => apiFetch("/cms/banners"),
  });
  // Use CMS banners when configured; otherwise the built-in showcase slides.
  const slides: Slide[] = (banners as any[]).length > 0
    ? (banners as any[]).map((b) => ({
        image_url: b.image_url,
        title: b.title,
        subtitle: b.subtitle,
        link_url: b.link_url,
      }))
    : HERO_SLIDES;

  return (
    <div className="bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-950 text-white dark:bg-black py-16 md:py-24 lg:py-32 border-b border-white/5">
        {/* Soft radial glow backgrounds / Mesh */}
        <div className="absolute -right-24 -top-24 h-[600px] w-[600px] rounded-full bg-primary/20 blur-[130px] opacity-75 pointer-events-none" />
        <div className="absolute -bottom-32 -left-24 h-[500px] w-[500px] rounded-full bg-indigo-500/10 blur-[120px] opacity-60 pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none [mask-image:radial-gradient(ellipse_60%_50%_at_50%_45%,#000_70%,transparent_100%)]" />
        
        <div className="container relative mx-auto px-4">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
            {/* Left Column (Content) */}
            <div className="lg:col-span-7 flex flex-col items-start text-left">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold tracking-wide uppercase backdrop-blur-md mb-6">
                <Zap className="h-4 w-4 text-primary-glow animate-pulse" /> Experts arrive in ~10 minutes
              </span>
              <h1 className="text-4xl font-extrabold leading-[1.15] md:text-6xl tracking-tight text-white">
                Household help, <br />
                <span className="bg-gradient-to-r from-primary-glow via-primary to-purple-400 bg-clip-text text-transparent glow-text-primary">
                  at your door in minutes
                </span>
              </h1>
              <p className="mt-6 text-base text-white/80 max-w-xl leading-relaxed md:text-lg">
                Book a trained, background-verified expert for cleaning, cooking, laundry, and more.
                Our dispatch system finds the closest professional instantly. Transparent rates, no hidden fees.
              </p>
              
              {/* CTA Buttons */}
              <div className="mt-10 flex flex-wrap items-center gap-4 w-full sm:w-auto">
                <Button asChild size="lg" className="h-14 px-8 rounded-2xl bg-primary hover:bg-primary/95 hover:scale-[1.02] active:scale-[0.98] transition-all text-white text-base font-semibold shadow-lg shadow-primary/30 w-full sm:w-auto">
                  <a href="#services">Book a service <ArrowRight className="ml-2 h-5 w-5" /></a>
                </Button>
                <Button asChild size="lg" variant="secondary" className="h-14 px-8 rounded-2xl bg-white/10 hover:bg-white/15 hover:scale-[1.02] active:scale-[0.98] transition-all text-white text-base font-semibold border border-white/15 backdrop-blur-md w-full sm:w-auto">
                  <Link to="/auth/signup-expert">Become an expert</Link>
                </Button>
              </div>
              
              {/* Core trust badges */}
              <div className="mt-10 border-t border-white/10 pt-8 w-full flex flex-wrap items-center gap-x-8 gap-y-4 text-xs sm:text-sm text-white/60">
                <span className="inline-flex items-center gap-2 font-medium">
                  <BadgeCheck className="h-5 w-5 text-primary-glow" /> Aadhaar & PAN verified
                </span>
                <span className="inline-flex items-center gap-2 font-medium">
                  <Heart className="h-5 w-5 text-primary-glow" /> 100% Female workforce
                </span>
                <span className="inline-flex items-center gap-2 font-medium">
                  <Star className="h-5 w-5 text-primary-glow fill-primary-glow" /> 4.8★ (74k+ reviews)
                </span>
              </div>
            </div>
            
            {/* Right Column (Visual Image & Floating Widgets) */}
            <div className="lg:col-span-5 relative mt-6 lg:mt-0 px-4 md:px-12 lg:px-0">
              {/* Glow under the main image */}
              <div className="absolute inset-0 -m-6 rounded-full bg-gradient-to-tr from-primary/15 to-primary-glow/15 blur-3xl opacity-75 pointer-events-none" />
              
              {/* Main Hero Image - Optimized for LCP */}
              <div className="relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl bg-muted aspect-[1.1] md:aspect-[4/3] lg:aspect-[1.1] w-full">
                <img 
                  src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80" 
                  alt="Trained household cleaner working" 
                  fetchpriority="high"
                  className="h-full w-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
              </div>
              
              {/* Widget 1: Top Left - Lakshmi Nair Avatar card */}
              <div className="absolute -left-2 sm:-left-6 top-8 backdrop-blur-md bg-white/10 dark:bg-black/30 border border-white/20 shadow-xl rounded-2xl p-3 flex items-center gap-3 text-white max-w-[210px] animate-float-slow">
                <img src="https://randomuser.me/api/portraits/women/68.jpg" alt="Lakshmi Nair" className="h-10 w-10 rounded-full border border-white/40 object-cover shrink-0" />
                <div>
                  <p className="text-xs font-semibold leading-tight text-white">Lakshmi Nair</p>
                  <p className="text-[10px] text-white/70">Cleaning Specialist</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-[10px] font-bold text-yellow-400">4.9</span>
                    <span className="text-[9px] text-white/60">(312 jobs)</span>
                  </div>
                </div>
              </div>
              
              {/* Widget 2: Bottom Right - Verified card */}
              <div className="absolute -right-2 sm:-right-6 bottom-8 backdrop-blur-md bg-white/15 dark:bg-black/40 border border-white/20 shadow-xl rounded-2xl p-3 flex items-center gap-3 text-white max-w-[220px] animate-float-medium">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">✓ Aadhaar Verified</p>
                  <p className="text-[10px] text-white/80">Background & PAN vetted</p>
                </div>
              </div>
              
              {/* Widget 3: Middle Left - Arrived Card with pulsing indicator */}
              <div className="absolute -left-6 sm:-left-10 bottom-24 backdrop-blur-md bg-white/10 dark:bg-black/30 border border-white/20 shadow-xl rounded-2xl p-3 flex items-center gap-3 text-white max-w-[190px] animate-float-fast">
                <div className="relative flex h-3.5 w-3.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                </div>
                <div>
                  <p className="text-xs font-bold text-white">⚡ Arriving in ~10m</p>
                  <p className="text-[9px] text-white/70">Live GPS tracking active</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats (Overlapping Card) */}
      <section className="relative -mt-10 px-4 z-10">
        <div className="container mx-auto max-w-5xl">
          <div className="rounded-3xl border bg-card/85 backdrop-blur-md p-8 md:p-10 shadow-xl grid grid-cols-2 gap-8 md:grid-cols-4">
            {[
              { icon: Users, label: "Bookings completed", raw: 62, suffix: "L+", decimals: 0 },
              { icon: BadgeCheck, label: "Verified experts", raw: 15000, suffix: "+", decimals: 0 },
              { icon: Star, label: "Avg. rating", raw: 4.8, suffix: " / 5", decimals: 1 },
              { icon: Clock, label: "Avg. arrival", raw: 10, prefix: "~", suffix: " min", decimals: 0 },
            ].map((s) => (
              <div key={s.label} className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary shrink-0"><s.icon className="h-6 w-6" /></div>
                <div>
                  <div className="text-2xl font-extrabold text-foreground md:text-3xl">
                    <AnimatedCounter value={s.raw} decimals={s.decimals} prefix={s.prefix} suffix={s.suffix} />
                  </div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="container mx-auto scroll-mt-24 px-4 py-20">
        <div className="mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">What do you need help with?</h2>
            <p className="mt-2 text-sm text-muted-foreground">Pick a service and book instantly by the hour</p>
          </div>
          {!isLoading && (services as any[]).length > 0 && (
            <span className="self-start sm:self-auto rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary">
              {(services as any[]).length} services available
            </span>
          )}
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-3xl border bg-card animate-pulse">
                <div className="h-44 w-full bg-muted" />
                <div className="flex items-center justify-between gap-2 p-5">
                  <div className="h-3.5 w-24 rounded bg-muted" />
                  <div className="h-5 w-12 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : (services as any[]).length === 0 ? (
          <EmptyState icon={Sparkles} title="No services available yet"
            description="We're adding services in your area. Please check back soon." />
        ) : (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
            {(services as any[]).map((s) => {
              const Icon = serviceIcon(s.icon_name);
              return (
                <Link key={s.id} to="/book/$serviceId" params={{ serviceId: s.id }}
                  className="group glass-card hover-glow overflow-hidden rounded-3xl transition-all duration-300 shadow-sm">
                  <div className="relative h-44 overflow-hidden bg-muted">
                    {s.image_url && <img src={s.image_url} alt={s.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    
                    {/* Floating service badge */}
                    <div className="absolute top-3 right-3 shrink-0 rounded-full bg-white/20 backdrop-blur-md border border-white/20 px-2.5 py-1 text-[10px] font-bold text-white uppercase tracking-wider">
                      Hourly
                    </div>
                    
                    <div className="absolute bottom-3.5 left-4 flex items-center gap-2.5 text-white">
                      <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/25 backdrop-blur-md border border-white/10"><Icon className="h-4 w-4" /></span>
                      <span className="font-bold text-base md:text-lg drop-shadow">{s.name}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 p-5">
                    <span className="truncate text-xs text-muted-foreground font-medium">{s.tagline}</span>
                    <span className="shrink-0 text-base font-extrabold text-primary">₹{s.rate_per_hour}<span className="text-xs font-semibold text-muted-foreground">/hr</span></span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* How it works */}
      <section className="relative overflow-hidden border-y bg-muted/40 py-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_60%,var(--border)_100%)] opacity-30 pointer-events-none" />
        <div className="container mx-auto px-4 relative">
          <div className="text-center max-w-xl mx-auto">
            <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl text-foreground">How it works</h2>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">Book trusted help at your doorstep in three simple steps</p>
          </div>
          
          <div className="relative mx-auto mt-16 grid max-w-5xl gap-8 md:grid-cols-3">
            {/* Connecting line on desktop */}
            <div className="absolute left-[15%] right-[15%] top-10 hidden h-[2px] bg-gradient-to-r from-primary/10 via-primary/30 to-primary/10 md:block" />
            
            {[
              { icon: Sparkles, title: "1. Pick a service", desc: "Choose exactly what you need help with from our catalog." },
              { icon: Clock, title: "2. Choose duration", desc: "Select how many hours you need and choose instant or scheduled arrival." },
              { icon: ShieldCheck, title: "3. Expert arrives", desc: "Track your fully verified specialist on a map as they head to your location." },
            ].map((s, i) => (
              <div key={s.title} className="group relative rounded-3xl border bg-card p-8 text-center transition-all duration-300 hover:shadow-lg hover:border-primary/20">
                <div className="relative mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 group-hover:scale-105 transition-transform duration-300">
                  <s.icon className="h-7 w-7" />
                  <span className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-background border border-primary/20 text-xs font-bold text-primary shadow-sm">{i + 1}</span>
                </div>
                <h3 className="mt-6 text-lg font-bold tracking-tight text-foreground">{s.title.substring(3)}</h3>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Offers (CMS Banners) - Rendered if active */}
      {slides.length > 0 && (
        <section className="container mx-auto px-4 py-20">
          <div className="mb-10 text-center max-w-xl mx-auto">
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Featured Promotions</h2>
            <p className="mt-2 text-sm text-muted-foreground">Handpicked offers and platform updates just for you</p>
          </div>
          <div className="mx-auto max-w-4xl">
            <BannerSlider slides={slides} />
          </div>
        </section>
      )}

      {/* Why us (Trained, trusted, on time) */}
      <section className="container mx-auto px-4 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Text Column */}
          <div className="lg:col-span-5 flex flex-col items-start text-left">
            <span className="text-xs font-extrabold text-primary tracking-wider uppercase bg-primary/10 px-3.5 py-1.5 rounded-full mb-4">
              Gold Standard Vetting
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl text-foreground">
              We set the gold standard <br />for household help
            </h2>
            <p className="mt-4 text-base text-muted-foreground leading-relaxed">
              We understand that inviting someone into your home requires complete trust. That's why every expert undergoes rigorous offline validation, background screening, and hands-on skill training before they ever pick up a job.
            </p>
            <div className="mt-8 flex gap-4">
              <div className="flex -space-x-3">
                <img className="inline-block h-10 w-10 rounded-full ring-2 ring-background object-cover" src="https://randomuser.me/api/portraits/women/32.jpg" alt="User 1" />
                <img className="inline-block h-10 w-10 rounded-full ring-2 ring-background object-cover" src="https://randomuser.me/api/portraits/women/44.jpg" alt="User 2" />
                <img className="inline-block h-10 w-10 rounded-full ring-2 ring-background object-cover" src="https://randomuser.me/api/portraits/women/52.jpg" alt="User 3" />
              </div>
              <div className="text-xs text-muted-foreground flex flex-col justify-center">
                <span className="font-bold text-foreground">Trusted by 10,000+ homes</span>
                <span>in Bengaluru, Mumbai & Delhi</span>
              </div>
            </div>
          </div>
          
          {/* Right Grid Column */}
          <div className="lg:col-span-7 grid gap-6 sm:grid-cols-2">
            {[
              { icon: BadgeCheck, title: "Background verified", desc: "Comprehensive Aadhaar, PAN, and address verification before onboarding." },
              { icon: Heart, title: "Empowered workforce", desc: "Trained, equipped, and financially independent female professionals." },
              { icon: ShieldCheck, title: "100% Service guarantee", desc: "Not satisfied? We will redo the service or offer a full refund instantly." },
              { icon: Clock, title: "Instant or scheduled", desc: "Get immediate help within minutes or book a slot that works for you." },
              { icon: Star, title: "Professionally trained", desc: "Rigorous physical training sessions and continuous quality checks." },
              { icon: Zap, title: "Transparent billing", desc: "Fixed hourly rates with no hidden overheads or surprise charges." },
            ].map((f) => (
              <div key={f.title} className="group rounded-3xl border bg-card p-6 transition-all duration-300 hover:shadow-md hover:border-primary/20">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-300"><f.icon className="h-6 w-6" /></div>
                <h3 className="mt-5 font-bold text-base tracking-tight text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cities */}
      <section className="border-y bg-muted/40 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Now serving across India</h2>
          <p className="mt-2 text-sm text-muted-foreground">Instant service booking available in major urban areas</p>
          <div className="mx-auto mt-8 flex max-w-4xl flex-wrap justify-center gap-2.5">
            {CITIES.map((c) => (
              <span key={c} className="rounded-full border bg-card px-4 py-2 text-sm font-semibold text-muted-foreground shadow-sm hover:border-primary/30 transition-colors duration-200">{c}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-muted/20 border-b py-24">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl text-foreground">What our customers say</h2>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">Read reviews from verified bookings in your neighborhood</p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
            {[
              { name: "Aditi M.", role: "Booked home cleaning", avatar: "https://randomuser.me/api/portraits/women/12.jpg", quote: "Booked in a minute and the expert arrived in ten. My home has never looked better." },
              { name: "Karthik R.", role: "Booked dishwashing", avatar: "https://randomuser.me/api/portraits/men/32.jpg", quote: "Reliable, fast and friendly. The live tracking is genuinely useful." },
              { name: "Neha S.", role: "Booked cooking help", avatar: "https://randomuser.me/api/portraits/women/24.jpg", quote: "Loved the verified badge and transparent pricing. Felt completely safe." },
            ].map((t) => (
              <div key={t.name} className="relative rounded-3xl border bg-card p-8 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/20">
                <Quote className="absolute right-6 top-6 h-10 w-10 text-primary/10" />
                <div className="flex items-center gap-1 mb-5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-foreground/90 leading-relaxed italic">"{t.quote}"</p>
                <div className="mt-6 flex items-center gap-3 border-t border-border pt-4">
                  <img src={t.avatar} alt={t.name} className="h-10 w-10 rounded-full object-cover border border-border shrink-0" />
                  <div>
                    <div className="text-sm font-bold text-foreground">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container mx-auto max-w-3xl px-4 py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">Frequently asked questions</h2>
          <p className="mt-3 text-sm text-muted-foreground">Everything you need to know about booking with HomeHero</p>
        </div>
        <div className="rounded-3xl border bg-card px-8 py-2 shadow-sm">
          {FAQS.map((f) => <FaqItem key={f.q} q={f.q} a={f.a} />)}
        </div>
        <div className="mt-8 text-center text-sm text-muted-foreground">
          Still have questions?{" "}
          <Link to="/support" className="font-semibold text-primary hover:underline inline-flex items-center gap-1">
            <MessageCircle className="h-4 w-4 shrink-0" /> Contact support
          </Link>
        </div>
      </section>

      {/* App download strip */}
      <section className="border-y bg-muted/40">
        <div className="container mx-auto flex flex-col items-center justify-between gap-6 px-4 py-16 md:flex-row">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary mb-3">
              <Download className="h-3.5 w-3.5" /> Available now
            </span>
            <h3 className="text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">Book in seconds from the app</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">Live expert tracking, one-tap rebooking, and exclusive app-only promotions.</p>
          </div>
          <div className="flex gap-4 shrink-0 w-full sm:w-auto">
            <a href="#" className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-2xl border bg-card px-6 py-3.5 text-sm font-semibold transition-all hover:border-primary/40 hover:bg-muted/30">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" /></svg>
              App Store
            </a>
            <a href="#" className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-2xl border bg-card px-6 py-3.5 text-sm font-semibold transition-all hover:border-primary/40 hover:bg-muted/30">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M3.18 23.76c.35.19.75.2 1.12.03l11.11-6.38-2.54-2.54-9.69 8.89zm14.6-8.41L5.57 8.73 3.18.24C2.8.07 2.36.12 2.02.37L13.84 12l3.94 3.35zm2.4-5.16L17.14 8.5 13.84 12l3.3 3.5 2.93-1.68c.83-.47.83-1.24.11-1.63zM4.29.21L3.18.24 2.02.37 2 .4l1.18 1.14L5.57 8.73 15.26 3.6 4.29.21z" /></svg>
              Google Play
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden rounded-3xl mx-4 my-10 bg-slate-950 text-white dark:bg-zinc-950 py-16 border border-white/5 shadow-2xl">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        
        <div className="container relative mx-auto flex flex-col items-center justify-between gap-8 px-8 md:flex-row">
          <div className="text-center md:text-left">
            <h3 className="text-3xl font-extrabold tracking-tight md:text-4xl text-white">Want to earn as a home expert?</h3>
            <p className="text-sm text-white/70 mt-2.5 max-w-lg">Get flexible hours, steady dispatches, transparent earnings, and belong to an empowering community that supports you.</p>
          </div>
          <Button asChild size="lg" className="h-14 px-8 rounded-2xl bg-primary hover:bg-primary/95 hover:scale-[1.02] active:scale-[0.98] transition-all text-white text-base font-semibold shadow-lg shadow-primary/30 shrink-0 w-full sm:w-auto">
            <Link to="/auth/signup-expert">Start earning <ArrowRight className="ml-2 h-5 w-5" /></Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
