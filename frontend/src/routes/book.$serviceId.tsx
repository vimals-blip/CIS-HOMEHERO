import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Zap, CalendarClock, MapPin, Plus, Check, Tag, Wallet, Banknote, CreditCard, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { serviceIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/book/$serviceId")({
  head: () => ({ meta: [{ title: "Book a service — HomeHero" }] }),
  component: BookService,
});

const HOUR_OPTIONS = [1, 2, 3, 4];
const DAY_OPTIONS  = [1, 2, 3, 5, 7];
const HRS_PER_DAY  = 8;
const PLATFORM_FEE_PCT = 0.15;

// Numbered step header for the booking wizard.
function Step({ n, title, hint }: { n: number; title: string; hint?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{n}</span>
      <div>
        <h3 className="font-semibold leading-tight">{title}</h3>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

function BookService() {
  const { serviceId } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [geoCoords, setGeoCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Silently capture browser geolocation to attach coordinates to the booking.
  // Used as the destination for the live-tracking map.
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setGeoCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}, // permission denied or unavailable — booking still works without coords
      { maximumAge: 60000, timeout: 8000 },
    );
  }, []);

  const [durationUnit, setDurationUnit] = useState<"hours" | "days">("hours");
  const [durationValue, setDurationValue] = useState(1); // hrs or days depending on unit
  const [type, setType] = useState<"INSTANT" | "SCHEDULED">("INSTANT");
  const [scheduledAt, setScheduledAt] = useState("");
  const [selectedAddr, setSelectedAddr] = useState<string | null>(null);
  const [showNewAddr, setShowNewAddr] = useState(false);
  const [addr, setAddr] = useState({ flat: "", address_line: "", city: "", pincode: "" });
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "WALLET" | "ONLINE">("CASH");
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const { data: service, isLoading } = useQuery({
    queryKey: ["service", serviceId],
    queryFn: () => apiFetch(`/services/${serviceId}`),
  });

  const { data: addresses = [] } = useQuery({
    enabled: !!user,
    queryKey: ["addresses", user?.id],
    queryFn: () => apiFetch(`/addresses`),
  });

  const { data: wallet } = useQuery({
    enabled: !!user,
    queryKey: ["wallet", user?.id],
    queryFn: () => apiFetch(`/wallet`),
  });

  if (isLoading) return <div className="container mx-auto px-4 py-16"><LoadingSpinner /></div>;
  if (!service) return <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">Service not found.</div>;

  const Icon = serviceIcon(service.icon_name);
  const totalHours = durationUnit === "days" ? durationValue * HRS_PER_DAY : durationValue;
  const base = Number(service.rate_per_hour) * totalHours;
  const discount = coupon?.discount ?? 0;
  const total = Math.max(0, base - discount);
  const platformFee = Math.round(total * PLATFORM_FEE_PCT);
  const walletBalance = Number(wallet?.balance ?? 0);
  const walletShort = paymentMethod === "WALLET" && walletBalance < total;

  function loadRazorpay(): Promise<boolean> {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) return resolve(true);
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });
  }

  // Re-validate any applied coupon against the current base amount.
  const applyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    setCouponLoading(true);
    try {
      const res = await apiFetch("/coupons/validate", { method: "POST", body: JSON.stringify({ code, amount: base }) });
      setCoupon({ code: res.code, discount: res.discount });
      toast.success(`Coupon ${res.code} applied — you save ₹${res.discount}`);
    } catch (e: any) {
      setCoupon(null);
      toast.error(e.message ?? "Invalid coupon");
    } finally {
      setCouponLoading(false);
    }
  };

  const clearCoupon = () => { setCoupon(null); setCouponInput(""); };

  const confirm = async () => {
    if (!user) { toast.error("Please log in to book"); navigate({ to: "/auth/login" }); return; }
    if (type === "SCHEDULED" && !scheduledAt) { toast.error("Pick a date and time"); return; }
    if (walletShort) { toast.error("Insufficient wallet balance — top up or pay with cash"); return; }

    let body: any = {
      service_id: serviceId, duration_hours: totalHours, booking_type: type,
      payment_method: paymentMethod, coupon_code: coupon?.code ?? null, notes: notes.trim() || null,
    };
    if (type === "SCHEDULED") body.scheduled_at = scheduledAt.replace("T", " ") + ":00";

    if (selectedAddr) {
      body.address_id = selectedAddr;
    } else {
      if (!addr.address_line.trim() || !addr.city.trim() || !addr.pincode.trim()) {
        toast.error("Enter your address, city and pincode");
        return;
      }
      body.address_snapshot = [addr.flat, addr.address_line, addr.city, addr.pincode].filter(Boolean).join(", ");
      body.pincode = addr.pincode.trim();
      if (geoCoords) { body.lat = geoCoords.lat; body.lng = geoCoords.lng; }
    }

    setSubmitting(true);
    try {
      const booking = await apiFetch("/bookings", { method: "POST", body: JSON.stringify(body) });

      // ── Online payment: open Razorpay checkout ──────────────────────────────
      if (paymentMethod === "ONLINE" && booking.gateway_order_id) {
        if (booking.gateway_mock) {
          // Mock mode: auto-verify without opening the modal
          await apiFetch("/payments/verify", {
            method: "POST",
            body: JSON.stringify({ order_id: booking.gateway_order_id, payment_id: "pay_mock", signature: "mock_signature" }),
          });
          toast.success("Payment received — booking confirmed!");
          navigate({ to: "/track/$bookingId", params: { bookingId: booking.id } });
          return;
        }

        const loaded = await loadRazorpay();
        if (!loaded) { toast.error("Could not load payment gateway — try again"); setSubmitting(false); return; }

        new (window as any).Razorpay({
          key: booking.gateway_key_id,
          order_id: booking.gateway_order_id,
          amount: booking.gateway_amount,
          currency: booking.gateway_currency ?? "INR",
          name: "HomeHero",
          description: `${service.name} · ${durationUnit === "days" ? `${durationValue} day${durationValue > 1 ? "s" : ""}` : `${totalHours} hrs`}`,
          prefill: { email: user.email },
          theme: { color: "#7c3aed" },
          handler: async (resp: any) => {
            try {
              await apiFetch("/payments/verify", {
                method: "POST",
                body: JSON.stringify({
                  order_id: resp.razorpay_order_id,
                  payment_id: resp.razorpay_payment_id,
                  signature: resp.razorpay_signature,
                }),
              });
              toast.success("Payment received — booking confirmed!");
              navigate({ to: "/track/$bookingId", params: { bookingId: booking.id } });
            } catch (e: any) {
              toast.error(e.message ?? "Payment verification failed");
            }
          },
          modal: {
            ondismiss: () => {
              toast.error("Payment cancelled — your booking is on hold");
              setSubmitting(false);
            },
          },
        }).open();
        return;
      }

      // ── Cash / Wallet ───────────────────────────────────────────────────────
      toast.success(booking.status === "ASSIGNED" ? "Expert assigned! Tracking your booking…" : "Booking created — finding an expert…");
      navigate({ to: "/track/$bookingId", params: { bookingId: booking.id } });
    } catch (e: any) {
      toast.error(e.message ?? "Booking failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="relative overflow-hidden rounded-3xl border bg-muted">
        {service.image_url && <img src={service.image_url} alt={service.name} className="h-40 w-full object-cover sm:h-52" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-4 left-5 flex items-center gap-3 text-white">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 backdrop-blur"><Icon className="h-6 w-6" /></span>
          <div>
            <h1 className="text-2xl font-bold drop-shadow md:text-3xl">{service.name}</h1>
            <p className="text-sm text-white/85">{service.tagline} · ₹{service.rate_per_hour}/hr</p>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {/* Booking type */}
          <div className="rounded-2xl border bg-card p-5">
            <Step n={1} title="When do you need help?" />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button onClick={() => setType("INSTANT")} className={cn(
                "flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-colors",
                type === "INSTANT" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
              )}>
                <Zap className={cn("h-5 w-5", type === "INSTANT" ? "text-primary" : "text-muted-foreground")} />
                <div>
                  <div className="text-sm font-semibold">Instant</div>
                  <div className="text-xs text-muted-foreground">Expert in ~10 min</div>
                </div>
              </button>
              <button onClick={() => setType("SCHEDULED")} className={cn(
                "flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-colors",
                type === "SCHEDULED" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
              )}>
                <CalendarClock className={cn("h-5 w-5", type === "SCHEDULED" ? "text-primary" : "text-muted-foreground")} />
                <div>
                  <div className="text-sm font-semibold">Schedule</div>
                  <div className="text-xs text-muted-foreground">Pick a time</div>
                </div>
              </button>
            </div>
            {type === "SCHEDULED" && (
              <div className="mt-4">
                <Label htmlFor="when">Date & time</Label>
                <Input id="when" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="mt-1" />
              </div>
            )}
          </div>

          {/* Duration */}
          <div className="rounded-2xl border bg-card p-5">
            <Step n={2} title="How long do you need?" />

            {/* Hours / Days toggle */}
            <div className="mt-4 inline-flex rounded-xl border bg-muted p-1 gap-1">
              {(["hours", "days"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => {
                    setDurationUnit(u);
                    setDurationValue(u === "hours" ? 1 : 1);
                  }}
                  className={cn(
                    "rounded-lg px-5 py-1.5 text-sm font-semibold transition-all",
                    durationUnit === u
                      ? "bg-background shadow text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {u === "hours" ? "Hours" : "Days"}
                </button>
              ))}
            </div>

            {/* Options */}
            <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-5">
              {(durationUnit === "hours" ? HOUR_OPTIONS : DAY_OPTIONS).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDurationValue(d)}
                  className={cn(
                    "rounded-xl border-2 py-3 text-sm font-semibold transition-colors",
                    durationValue === d && durationUnit === durationUnit
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  {d} {durationUnit === "hours" ? (d === 1 ? "hr" : "hrs") : (d === 1 ? "day" : "days")}
                </button>
              ))}
            </div>

            {durationUnit === "days" && (
              <p className="mt-2 text-xs text-muted-foreground">
                1 day = {HRS_PER_DAY} hrs · priced at ₹{service.rate_per_hour}/hr
              </p>
            )}
          </div>

          {/* Address */}
          <div className="rounded-2xl border bg-card p-5">
            <Step n={3} title="Service address" />
            <div className="mt-4 space-y-2">
              {(addresses as any[]).map((a) => (
                <button key={a.id} onClick={() => { setSelectedAddr(a.id); setShowNewAddr(false); }} className={cn(
                  "flex w-full items-start gap-3 rounded-xl border-2 p-3 text-left transition-colors",
                  selectedAddr === a.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
                )}>
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{a.label}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {[a.flat, a.address_line, a.city, a.pincode].filter(Boolean).join(", ")}
                    </div>
                  </div>
                  {selectedAddr === a.id && <Check className="ml-auto h-4 w-4 text-primary" />}
                </button>
              ))}
              {!showNewAddr ? (
                <button onClick={() => { setShowNewAddr(true); setSelectedAddr(null); }}
                  className="flex items-center gap-2 rounded-xl border-2 border-dashed border-border p-3 text-sm font-medium text-muted-foreground hover:border-primary/40 hover:text-foreground">
                  <Plus className="h-4 w-4" /> Use a new address
                </button>
              ) : (
                <div className="grid gap-3 rounded-xl border p-3 sm:grid-cols-2">
                  <Input placeholder="Flat / House no." value={addr.flat} onChange={(e) => setAddr({ ...addr, flat: e.target.value })} />
                  <Input placeholder="Street / Area" value={addr.address_line} onChange={(e) => setAddr({ ...addr, address_line: e.target.value })} />
                  <Input placeholder="City" value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} />
                  <Input placeholder="Pincode" value={addr.pincode} onChange={(e) => setAddr({ ...addr, pincode: e.target.value })} />
                </div>
              )}
            </div>
            <div className="mt-4">
              <Label htmlFor="notes">Notes for the expert (optional)</Label>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1" />
            </div>
          </div>

          {/* Coupon */}
          <div className="rounded-2xl border bg-card p-5">
            <h3 className="font-semibold">Apply coupon</h3>
            {coupon ? (
              <div className="mt-3 flex items-center justify-between rounded-xl border-2 border-emerald-500/40 bg-emerald-500/5 p-3">
                <div className="flex items-center gap-2 text-sm">
                  <Tag className="h-4 w-4 text-emerald-600" />
                  <span className="font-semibold">{coupon.code}</span>
                  <span className="text-emerald-600">−₹{coupon.discount}</span>
                </div>
                <button onClick={clearCoupon} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>
            ) : (
              <div className="mt-3 flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} placeholder="Try WELCOME50 or SAVE20" className="pl-9" />
                </div>
                <Button variant="outline" onClick={applyCoupon} disabled={couponLoading || !couponInput.trim()}>
                  {couponLoading ? "…" : "Apply"}
                </Button>
              </div>
            )}
          </div>

          {/* Payment method */}
          <div className="rounded-2xl border bg-card p-5">
            <Step n={4} title="Payment method" />
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button onClick={() => setPaymentMethod("CASH")} className={cn(
                "flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-colors",
                paymentMethod === "CASH" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
              )}>
                <Banknote className={cn("h-5 w-5 shrink-0", paymentMethod === "CASH" ? "text-primary" : "text-muted-foreground")} />
                <div>
                  <div className="text-sm font-semibold">Cash</div>
                  <div className="text-xs text-muted-foreground">Pay after service</div>
                </div>
              </button>
              <button onClick={() => setPaymentMethod("WALLET")} className={cn(
                "flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-colors",
                paymentMethod === "WALLET" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
              )}>
                <Wallet className={cn("h-5 w-5 shrink-0", paymentMethod === "WALLET" ? "text-primary" : "text-muted-foreground")} />
                <div>
                  <div className="text-sm font-semibold">Wallet</div>
                  <div className="text-xs text-muted-foreground">Balance ₹{walletBalance}</div>
                </div>
              </button>
              <button onClick={() => setPaymentMethod("ONLINE")} className={cn(
                "flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-colors",
                paymentMethod === "ONLINE" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
              )}>
                <CreditCard className={cn("h-5 w-5 shrink-0", paymentMethod === "ONLINE" ? "text-primary" : "text-muted-foreground")} />
                <div>
                  <div className="text-sm font-semibold">Online</div>
                  <div className="text-xs text-muted-foreground">Card / UPI / NetBanking</div>
                </div>
              </button>
            </div>
            {walletShort && <p className="mt-2 text-xs text-destructive">Insufficient balance. Top up in your wallet or pay with cash.</p>}
            {paymentMethod === "ONLINE" && (
              <p className="mt-2 text-xs text-muted-foreground">You'll be redirected to the secure Razorpay checkout after placing the booking.</p>
            )}
          </div>
        </div>

        {/* Summary */}
        <div>
          <div className="sticky top-20 rounded-2xl border bg-card p-5">
            <h3 className="font-semibold">Order summary</h3>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {service.name} ×{" "}
                  {durationUnit === "days"
                    ? `${durationValue} day${durationValue > 1 ? "s" : ""} (${totalHours} hrs)`
                    : `${durationValue} hr${durationValue > 1 ? "s" : ""}`}
                </span>
                <span>₹{base}</span>
              </div>
              <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span>{type === "INSTANT" ? "Instant" : "Scheduled"}</span></div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600"><span>Coupon {coupon?.code}</span><span>−₹{discount}</span></div>
              )}
              <div className="my-2 border-t" />
              <div className="flex justify-between text-base font-semibold"><span>Total</span><span>₹{total}</span></div>
              <div className="text-xs text-muted-foreground">
                Incl. ₹{platformFee} platform fee ·{" "}
                {paymentMethod === "WALLET" ? "Paid from wallet" : paymentMethod === "ONLINE" ? "Pay via Razorpay" : "Pay after service"}
              </div>
            </div>
            <Button onClick={confirm} disabled={submitting || walletShort} className="mt-4 w-full" size="lg">
              {submitting
              ? (paymentMethod === "ONLINE" ? "Opening payment…" : "Booking…")
              : `${type === "INSTANT" ? "Book now" : "Schedule"} · ₹${total}`}
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">Free cancellation before the expert starts.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
