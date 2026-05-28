import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Calendar as CalendarIcon, Check, MapPin, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ProviderCard, type ProviderCardData } from "@/components/provider/ProviderCard";
import { TimeSlotGrid } from "@/components/booking/TimeSlotGrid";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/book/$categoryId")({
  head: () => ({ meta: [{ title: "Book a service — HomeHero" }] }),
  component: BookService,
});

function BookService() {
  const { categoryId } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedProvider, setSelectedProvider] = useState<ProviderCardData | null>(null);
  const [date, setDate] = useState<Date | undefined>();
  const [slot, setSlot] = useState<string | undefined>();
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [coupon, setCoupon] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: category } = useQuery({
    queryKey: ["category", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").eq("id", categoryId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ["providers-by-category", categoryId],
    queryFn: async (): Promise<ProviderCardData[]> => {
      const { data, error } = await supabase
        .from("provider_categories")
        .select("custom_price, providers!inner(id, bio, experience_years, hourly_rate, is_verified, avg_rating, review_count, profiles!inner(name, avatar_url, city))")
        .eq("category_id", categoryId);
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        id: row.providers.id,
        name: row.providers.profiles?.name ?? "Provider",
        avatarUrl: row.providers.profiles?.avatar_url,
        bio: row.providers.bio,
        hourlyRate: Number(row.custom_price ?? row.providers.hourly_rate),
        avgRating: Number(row.providers.avg_rating) || 0,
        reviewCount: row.providers.review_count,
        isVerified: row.providers.is_verified,
        city: row.providers.profiles?.city,
        experienceYears: row.providers.experience_years,
      }));
    },
  });

  const basePrice = Number(category?.base_price ?? 0);
  const commission = Number(category?.commission_pct ?? 15);
  const discount = coupon.trim().toUpperCase() === "FIRST10" ? Math.round(basePrice * 0.1) : 0;
  const total = Math.max(0, basePrice - discount);
  const platformFee = Math.round(total * (commission / 100));
  const providerAmount = total - platformFee;

  const pickProvider = (p: ProviderCardData) => { setSelectedProvider(p); setStep(2); };

  const confirm = async () => {
    if (!user) { toast.error("Please log in to book"); navigate({ to: "/auth/login" }); return; }
    if (!selectedProvider || !date || !slot || !address.trim()) { toast.error("Missing booking details"); return; }
    setSubmitting(true);
    const { data, error } = await supabase.from("bookings").insert({
      customer_id: user.id,
      provider_id: selectedProvider.id,
      category_id: categoryId,
      scheduled_date: format(date, "yyyy-MM-dd"),
      scheduled_time: slot + ":00",
      status: "PENDING",
      address: address.trim(),
      total_amount: total,
      platform_fee: platformFee,
      provider_amount: providerAmount,
      notes: notes.trim() || null,
      coupon_code: coupon.trim() || null,
    }).select().single();
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    // Stub payment record
    await supabase.from("payments").insert({
      booking_id: data!.id, amount: total, status: "CREATED",
    });
    toast.success("Booking confirmed! Provider will be notified.");
    navigate({ to: "/" });
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold md:text-3xl">
        Book {category?.name ?? "a service"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">Starting at ₹{basePrice}</p>

      {/* Progress */}
      <div className="mt-6 flex items-center gap-2">
        {[
          { n: 1, label: "Choose pro" },
          { n: 2, label: "Schedule" },
          { n: 3, label: "Confirm" },
        ].map((s, i, arr) => (
          <div key={s.n} className="flex flex-1 items-center gap-2">
            <div className={cn(
              "grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 text-xs font-semibold",
              step === s.n && "border-primary bg-primary text-primary-foreground",
              step > s.n && "border-primary bg-primary/10 text-primary",
              step < s.n && "border-border text-muted-foreground"
            )}>
              {step > s.n ? <Check className="h-3.5 w-3.5" /> : s.n}
            </div>
            <span className={cn("text-sm font-medium", step >= s.n ? "text-foreground" : "text-muted-foreground")}>
              {s.label}
            </span>
            {i < arr.length - 1 && <div className={cn("h-0.5 flex-1", step > s.n ? "bg-primary" : "bg-border")} />}
          </div>
        ))}
      </div>

      <div className="mt-8">
        {step === 1 && (
          <>
            {isLoading ? (
              <LoadingSpinner />
            ) : providers.length === 0 ? (
              <EmptyState
                title="No providers yet for this category"
                description="Check back soon — we're onboarding pros every day."
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {providers.map((p) => (
                  <button key={p.id} type="button" onClick={() => pickProvider(p)} className="text-left">
                    <ProviderCard p={p} />
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {step === 2 && selectedProvider && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-6">
              <div className="rounded-2xl border bg-card p-5">
                <h3 className="font-semibold">Pick a date</h3>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="mt-3 w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="rounded-2xl border bg-card p-5">
                <h3 className="font-semibold">Pick a time slot</h3>
                <div className="mt-3"><TimeSlotGrid value={slot} onChange={setSlot} /></div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border bg-card p-5">
                <h3 className="font-semibold">Service address</h3>
                <div className="mt-3 space-y-3">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="House/flat, street, area, city"
                      className="pl-9"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
                  </div>
                </div>
              </div>

              <Button className="w-full" size="lg" disabled={!date || !slot || !address.trim()} onClick={() => setStep(3)}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 3 && selectedProvider && date && slot && (
          <div className="grid gap-6 md:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              <div className="rounded-2xl border bg-card p-5">
                <h3 className="font-semibold">Provider</h3>
                <div className="mt-3 flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 font-semibold text-primary">
                    {selectedProvider.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium">{selectedProvider.name}</div>
                    <div className="text-sm text-muted-foreground">
                      ⭐ {selectedProvider.avgRating.toFixed(1)} · {selectedProvider.reviewCount} reviews
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border bg-card p-5">
                <h3 className="font-semibold">Schedule</h3>
                <div className="mt-3 text-sm">
                  <div><span className="text-muted-foreground">Date: </span>{format(date, "PPP")}</div>
                  <div><span className="text-muted-foreground">Time: </span>{slot}</div>
                  <div className="mt-2"><span className="text-muted-foreground">Address: </span>{address}</div>
                </div>
              </div>

              <div className="rounded-2xl border bg-card p-5">
                <h3 className="font-semibold">Apply coupon</h3>
                <div className="mt-3 flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="Try FIRST10" className="pl-9" />
                  </div>
                </div>
                {discount > 0 && (
                  <p className="mt-2 text-sm text-success">Coupon applied — saved ₹{discount}</p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="sticky top-20 rounded-2xl border bg-card p-5">
                <h3 className="font-semibold">Order summary</h3>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">{category?.name}</span><span>₹{basePrice}</span></div>
                  {discount > 0 && (
                    <div className="flex justify-between text-success"><span>Discount</span><span>-₹{discount}</span></div>
                  )}
                  <div className="my-2 border-t" />
                  <div className="flex justify-between font-semibold"><span>Total</span><span>₹{total}</span></div>
                  <div className="text-xs text-muted-foreground">Platform fee ₹{platformFee} · Provider gets ₹{providerAmount}</div>
                </div>
                <Button onClick={confirm} disabled={submitting} className="mt-4 w-full" size="lg">
                  {submitting ? "Processing…" : `Pay ₹${total}`}
                </Button>
                <p className="mt-2 text-center text-xs text-muted-foreground">Razorpay integration stub — booking will be marked pending payment.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
