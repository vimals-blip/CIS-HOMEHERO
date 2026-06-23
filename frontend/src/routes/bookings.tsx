import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { 
  Inbox, ArrowRight, Clock, Zap, CalendarClock, MapPin, Star,
  ChevronLeft, ChevronRight, AlertCircle, Sparkles, Receipt, ChevronDown, MessageSquare
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Avatar } from "@/components/shared/Avatar";
import { Button } from "@/components/ui/button";
import { serviceIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { AnimatedCounter } from "@/components/shared/AnimatedCounter";
import { playUISound } from "@/lib/sound-ui";
import { ChatDrawer } from "@/components/chat/ChatDrawer";

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
  const [tab, setTab] = useState<Tab>("all");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const itemsPerPage = 5;

  const [chatOpen, setChatOpen] = useState(false);
  const [chatRecipientId, setChatRecipientId] = useState<string | null>(null);
  const [chatRecipientName, setChatRecipientName] = useState("");
  const [chatBookingId, setChatBookingId] = useState<string | null>(null);

  const handleChatOpen = (expertId: string, expertName: string, bookingId: string) => {
    setChatRecipientId(expertId);
    setChatRecipientName(expertName);
    setChatBookingId(bookingId);
    setChatOpen(true);
  };

  useEffect(() => { 
    if (!loading && !user) router.navigate({ to: "/auth/login" }); 
  }, [user, loading, router]);

  const { data: bookings = [], isLoading, isError } = useQuery({
    enabled: !!user,
    queryKey: ["my-bookings", user?.id],
    queryFn: () => apiFetch(`/bookings`),
    refetchInterval: 10000,
  });

  if (loading || isLoading) return <div className="container mx-auto px-4 py-16"><LoadingSpinner /></div>;
  if (isError) return <div className="container mx-auto px-4 py-16 text-center text-destructive">Failed to load bookings. Please refresh and try again.</div>;

  const all = bookings as any[];
  
  // Counts
  const counts = {
    active: all.filter((b) => ACTIVE.includes(b.status)).length,
    completed: all.filter((b) => b.status === "COMPLETED").length,
    cancelled: all.filter((b) => b.status === "CANCELLED").length,
    all: all.length,
  };

  const totalSpent = all.filter((b) => b.status === "COMPLETED").reduce((s, b) => s + Number(b.total_amount), 0);
  
  // Separate live active bookings for top shelf display
  const liveBookings = all.filter((b) => ACTIVE.includes(b.status));
  
  // Filter for history list based on selected tab
  const filtered = all.filter((b) => matchesTab(b.status, tab));
  
  // Paginated items
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (page - 1) * itemsPerPage;
  const paginatedItems = filtered.slice(startIndex, startIndex + itemsPerPage);

  const handleTabChange = (newTab: Tab) => {
    playUISound("click");
    setTab(newTab);
    setExpandedId(null);
    setPage(1);
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      {/* Header and Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">My Bookings</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Track live requests and review past services</p>
        </div>
        <div className="flex gap-4 shrink-0">
          <div className="rounded-2xl border bg-card/60 px-5 py-3 text-center shadow-sm min-w-[100px]">
            <div className="text-2xl font-extrabold text-foreground">
              <AnimatedCounter value={counts.all} />
            </div>
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">Total</div>
          </div>
          <div className="rounded-2xl border bg-card/60 px-5 py-3 text-center shadow-sm min-w-[120px]">
            <div className="text-2xl font-extrabold text-primary">
              <AnimatedCounter value={totalSpent} prefix="₹" />
            </div>
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">Spent</div>
          </div>
        </div>
      </div>

      {/* Live / Active Bookings Top Shelf */}
      {liveBookings.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </span>
            <h2 className="text-lg font-bold text-foreground">Live Requests & Active Jobs ({liveBookings.length})</h2>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {liveBookings.map((b) => {
              const Icon = serviceIcon(b.service_icon);
              return (
                <Link 
                  key={b.id} 
                  to="/track/$bookingId" 
                  params={{ bookingId: b.id }}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-primary/30 bg-card p-5 shadow-md hover:shadow-lg hover:border-primary/50 transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">{b.service_name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5 inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {Number(b.duration_hours)} hr
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-primary/10 pt-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 max-w-[180px] truncate">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/70" /> {b.address_snapshot}
                    </span>
                    <span className="font-extrabold text-foreground">₹{b.total_amount}</span>
                  </div>

                  <div className="mt-4 flex items-center justify-between bg-primary/10 -mx-5 -mb-5 px-5 py-2.5 text-xs font-bold text-primary group-hover:bg-primary/15 transition-all">
                    <span>Track Status Live</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Booking History Section */}
      <div className="mt-10">
        <h2 className="text-xl font-bold text-foreground mb-4">Booking History</h2>
        
        {/* Tab Controls */}
        <div className="flex gap-1 overflow-x-auto rounded-2xl border bg-muted/40 p-1">
          {TABS.map((t) => (
            <button 
              key={t.id} 
              onClick={() => handleTabChange(t.id)} 
              className={cn(
                "flex-1 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
                tab === t.id 
                  ? "bg-card text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label} 
              <span className={cn(
                "ml-1.5 rounded-full px-2 py-0.5 text-xs",
                tab === t.id ? "bg-muted text-muted-foreground" : "bg-muted/60 text-muted-foreground"
              )}>
                {counts[t.id]}
              </span>
            </button>
          ))}
        </div>

        {/* Compact Bookings List */}
        <div className="mt-6 space-y-3">
          {paginatedItems.length === 0 ? (
            <EmptyState 
              icon={Inbox} 
              title={`No ${tab === "all" ? "" : tab} bookings found`} 
              description="You don't have any bookings matching this selection."
              action={<Button asChild><Link to="/">Browse services</Link></Button>} 
            />
          ) : (
            paginatedItems.map((b) => {
              const Icon = serviceIcon(b.service_icon);
              const isActive = ACTIVE.includes(b.status);
              const isExpanded = expandedId === b.id;
              return (
                <div 
                  key={b.id} 
                  onClick={() => {
                    playUISound("click");
                    setExpandedId(isExpanded ? null : b.id);
                  }}
                  className={cn(
                    "group flex flex-col overflow-hidden rounded-2xl border bg-card p-4 transition-all cursor-pointer hover:border-primary/40 hover:shadow-md",
                    isActive && "ring-1 ring-primary/30 bg-primary/[0.01]",
                    isExpanded && "border-primary/40 shadow-sm"
                  )}
                >
                  <div className="flex items-center gap-4">
                    {/* Compact service image icon */}
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                      {b.service_image ? (
                        <img src={b.service_image} alt="" loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-primary/10 flex items-center justify-center text-primary"><Icon className="h-5 w-5" /></div>
                      )}
                      <span className="absolute bottom-1 right-1 grid h-5 w-5 place-items-center rounded-md bg-black/60 text-white backdrop-blur-[2px]"><Icon className="h-3 w-3" /></span>
                    </div>

                    {/* Core details */}
                    <div className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2.5">
                          <span className="font-bold text-foreground text-sm sm:text-base group-hover:text-primary transition-colors">{b.service_name}</span>
                          <StatusBadge status={b.status} />
                        </div>
                        
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1 font-medium">
                            {b.booking_type === "INSTANT" ? <Zap className="h-3 w-3 text-amber-500" /> : <CalendarClock className="h-3 w-3" />}
                            {b.booking_type === "INSTANT" ? "Instant" : b.scheduled_at}
                          </span>
                          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {Number(b.duration_hours)} hr</span>
                          <span className="inline-flex max-w-[150px] sm:max-w-[200px] lg:max-w-[300px] items-center gap-1 truncate"><MapPin className="h-3 w-3" /> {b.address_snapshot}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0 border-t sm:border-0 border-border">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {b.expert_name ? (
                            <>
                              <Avatar src={b.expert_avatar} name={b.expert_name} size={20} />
                              <span className="hidden sm:inline font-medium">{b.expert_name}</span>
                            </>
                          ) : (
                            <span className="font-medium italic text-muted-foreground/85">
                              {isActive ? "Matching..." : "No expert assigned"}
                            </span>
                          )}
                          {b.status === "COMPLETED" && (
                            <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">
                              <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" /> Rated
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-extrabold text-foreground text-sm sm:text-base">₹{b.total_amount}</span>
                          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-300", isExpanded && "rotate-180 text-primary")} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Section */}
                  {isExpanded && (
                    <div 
                      className="mt-4 border-t border-border pt-4 text-xs space-y-3 transition-all duration-300 animate-in fade-in slide-in-from-top-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <span className="font-bold text-foreground block mb-1">Service Instructions</span>
                          <p className="text-muted-foreground text-xs bg-muted/40 p-3 rounded-xl border border-border/40">
                            {b.notes || "No special instructions provided for this booking."}
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          <span className="font-bold text-foreground block mb-1">Pricing & Payment Details</span>
                          <div className="flex justify-between text-muted-foreground">
                            <span>Base Rate:</span>
                            <span className="font-semibold text-foreground">₹{b.rate_per_hour}/hr</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>Duration:</span>
                            <span className="font-semibold text-foreground">{Number(b.duration_hours)} hours</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground border-t border-dashed pt-1.5 font-bold">
                            <span className="text-foreground">Total Payout:</span>
                            <span className="text-primary">₹{b.total_amount}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2 justify-end">
                        {isActive && b.expert_id && (
                          <Button 
                            size="sm" 
                            variant="secondary" 
                            className="h-8 text-[11px] font-bold text-primary bg-primary/10 hover:bg-primary/20 border-0" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleChatOpen(b.expert_id, b.expert_name, b.id);
                            }}
                          >
                            <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Chat
                          </Button>
                        )}
                        {b.status === "COMPLETED" && (
                          <Button size="sm" variant="outline" className="h-8 text-[11px] font-bold" onClick={() => window.open(`/invoice/${b.id}`, "_blank")}>
                            <Receipt className="mr-1.5 h-3.5 w-3.5" /> Invoice
                          </Button>
                        )}
                        <Button size="sm" className="h-8 text-[11px] font-bold" asChild>
                          <Link to="/track/$bookingId" params={{ bookingId: b.id }}>
                            {isActive ? "Track Status Live" : "View Full Details"} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between border-t pt-4">
            <p className="text-xs text-muted-foreground font-medium">
              Showing <span className="font-bold text-foreground">{startIndex + 1}</span> to <span className="font-bold text-foreground">{Math.min(startIndex + itemsPerPage, filtered.length)}</span> of <span className="font-bold text-foreground">{filtered.length}</span> bookings
            </p>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage((p) => Math.max(p - 1, 1))} 
                disabled={page === 1}
                className="h-8 px-3 rounded-xl gap-1"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <span className="text-xs text-muted-foreground font-bold px-2">
                Page {page} of {totalPages}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))} 
                disabled={page === totalPages}
                className="h-8 px-3 rounded-xl gap-1"
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <ChatDrawer 
        open={chatOpen} 
        onOpenChange={setChatOpen} 
        recipientId={chatRecipientId} 
        recipientName={chatRecipientName} 
        type="BOOKING" 
        bookingId={chatBookingId} 
      />
    </div>
  );
}
