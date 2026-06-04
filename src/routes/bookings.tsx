import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Inbox, ArrowRight, Clock, Zap, CalendarClock, MapPin, Star } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Avatar } from "@/components/shared/Avatar";
import { Button } from "@/components/ui/button";
import { serviceIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/bookings")({
  head: () => ({ meta: [{ title: "My Bookings — HomeHero" }] }),
  component: BookingsPage,
});

const ACTIVE = ["SEARCHING", "ASSIGNED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS"];
const TABS = [
  { id: "active", label: "Active" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
  { id: "all", label: "All" },
] as const;
type Tab = typeof TABS[number]["id"];

function matchesTab(status: string, tab: Tab) {
  if (tab === "all") return true;
  if (tab === "active") return ACTIVE.includes(status);
  if (tab === "completed") return status === "COMPLETED";
  return status === "CANCELLED";
}

function BookingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("active");

  useEffect(() => { if (!loading && !user) router.navigate({ to: "/auth/login" }); }, [user, loading, router]);

  const { data: bookings = [], isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["my-bookings", user?.id],
    queryFn: () => apiFetch(`/bookings`),
    refetchInterval: 10000,
  });

  if (loading || isLoading) return <div className="container mx-auto px-4 py-16"><LoadingSpinner /></div>;

  const all = bookings as any[];
  const counts = {
    active: all.filter((b) => ACTIVE.includes(b.status)).length,
    completed: all.filter((b) => b.status === "COMPLETED").length,
    cancelled: all.filter((b) => b.status === "CANCELLED").length,
    all: all.length,
  };
  const totalSpent = all.filter((b) => b.status === "COMPLETED").reduce((s, b) => s + Number(b.total_amount), 0);
  const filtered = all.filter((b) => matchesTab(b.status, tab));

  return (
    <div className="container mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">My Bookings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Track and manage your household help</p>
        </div>
        <div className="flex gap-3">
          <div className="rounded-xl border bg-card px-4 py-2 text-center">
            <div className="text-lg font-bold">{counts.all}</div>
            <div className="text-[11px] text-muted-foreground">Total</div>
          </div>
          <div className="rounded-xl border bg-card px-4 py-2 text-center">
            <div className="text-lg font-bold">₹{totalSpent.toLocaleString("en-IN")}</div>
            <div className="text-[11px] text-muted-foreground">Spent</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 overflow-x-auto rounded-xl border bg-muted/40 p-1">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={cn(
            "flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            tab === t.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}>
            {t.label} <span className="ml-1 text-xs text-muted-foreground">{counts[t.id]}</span>
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {filtered.length === 0 ? (
          <EmptyState icon={Inbox} title={`No ${tab === "all" ? "" : tab} bookings`} description="Book a service from the home page to get started."
            action={<Button asChild><Link to="/">Browse services</Link></Button>} />
        ) : (
          filtered.map((b) => {
            const Icon = serviceIcon(b.service_icon);
            const isActive = ACTIVE.includes(b.status);
            return (
              <Link key={b.id} to="/track/$bookingId" params={{ bookingId: b.id }}
                className={cn(
                  "group flex gap-4 overflow-hidden rounded-2xl border bg-card transition-all hover:border-primary/40 hover:shadow-md",
                  isActive && "ring-1 ring-primary/30",
                )}>
                {/* Service image */}
                <div className="relative hidden h-auto w-28 shrink-0 overflow-hidden bg-muted sm:block">
                  {b.service_image && <img src={b.service_image} alt="" loading="lazy" className="h-full w-full object-cover" />}
                  <span className="absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-lg bg-black/40 text-white backdrop-blur"><Icon className="h-4 w-4" /></span>
                </div>

                <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 py-4 pr-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{b.service_name}</span>
                    <StatusBadge status={b.status} />
                    {isActive && <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" /> Live</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      {b.booking_type === "INSTANT" ? <Zap className="h-3 w-3" /> : <CalendarClock className="h-3 w-3" />}
                      {b.booking_type === "INSTANT" ? "Instant" : b.scheduled_at}
                    </span>
                    <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {Number(b.duration_hours)} hr</span>
                    <span className="inline-flex max-w-[200px] items-center gap-1 truncate"><MapPin className="h-3 w-3" /> {b.address_snapshot}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {b.expert_name ? (
                        <>
                          <Avatar src={b.expert_avatar} name={b.expert_name} size={22} />
                          <span className="text-xs text-muted-foreground">{b.expert_name}</span>
                        </>
                      ) : <span className="text-xs text-muted-foreground">Finding expert…</span>}
                      {b.status === "COMPLETED" && <span className="inline-flex items-center gap-0.5 text-[11px] text-amber-500"><Star className="h-3 w-3 fill-amber-400 text-amber-400" /> Rate</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">₹{b.total_amount}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
