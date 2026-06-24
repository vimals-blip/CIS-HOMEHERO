import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Clock, Star, Phone, ShieldCheck, ArrowLeft, FileText, User, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Avatar } from "@/components/shared/Avatar";
import { BookingTracker } from "@/components/booking/BookingTracker";
import { LiveMap } from "@/components/booking/LiveMap";
import { apiFetch, API_BASE, getAccessToken } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/track/$bookingId")({
  head: () => ({ meta: [{ title: "Track your booking — HomeHero" }] }),
  component: TrackBooking,
});

const ACTIVE = ["SEARCHING", "ASSIGNED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS"];

const STATUS_PILL: Record<string, string> = {
  SEARCHING:   "bg-amber-100 text-amber-700",
  ASSIGNED:    "bg-blue-100 text-blue-700",
  ON_THE_WAY:  "bg-indigo-100 text-indigo-700",
  ARRIVED:     "bg-cyan-100 text-cyan-700",
  IN_PROGRESS: "bg-violet-100 text-violet-700",
  COMPLETED:   "bg-emerald-100 text-emerald-700",
  CANCELLED:   "bg-red-100 text-red-700",
};

function TrackBooking() {
  const { bookingId } = Route.useParams();
  const { user, role, loading } = useAuth();
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [locatedAt, setLocatedAt] = useState<number | null>(null);
  const [expertLoc, setExpertLoc] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth/login" }); }, [user, loading, navigate]);

  // Handle Stripe redirect return: /track/ID?stripe_done=SESSION_ID
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("stripe_done");
    if (!sessionId) return;
    window.history.replaceState({}, "", window.location.pathname);
    apiFetch("/payments/verify", {
      method: "POST",
      body: JSON.stringify({ order_id: sessionId, payment_id: sessionId, signature: "stripe" }),
    })
      .then(() => {
        toast.success("Payment confirmed — booking is active!");
        qc.invalidateQueries({ queryKey: ["booking", bookingId] });
      })
      .catch((e: any) => toast.error(e.message ?? "Payment verification failed"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const { data: booking, isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["booking", bookingId],
    queryFn: () => apiFetch(`/bookings/${bookingId}`),
    // Poll faster while SEARCHING (5s) since the expert may come online any moment.
    // Other active statuses poll at 15s as a fallback; socket pushes arrive instantly.
    refetchInterval: (q) => {
      const st = (q.state.data as any)?.status;
      if (st === "SEARCHING") return 5000;
      if (ACTIVE.includes(st)) return 15000;
      return false;
    },
  });

  // Seed initial expert position from the booking's stored current_lat/lng so the
  // map renders immediately instead of waiting up to 10 s for the first socket ping.
  useEffect(() => {
    if (booking?.expert_lat && booking?.expert_lng && !expertLoc) {
      setExpertLoc({ lat: Number(booking.expert_lat), lng: Number(booking.expert_lng) });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking?.expert_lat, booking?.expert_lng]);

  // Live updates via Socket.IO — refetch on any booking event for this booking.
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    if (!socket) return;

    const refetch = () => qc.invalidateQueries({ queryKey: ["booking", bookingId] });
    const onAssigned = () => { toast.success("Expert assigned!"); refetch(); };
    const onStatus = (p: any) => { if (p?.message) toast.info(p.message); refetch(); };
    const onCancelled = () => { toast.info("Booking cancelled"); refetch(); };
    const onLocation = (p: any) => {
      setLocatedAt(Date.now());
      if (p?.lat != null && p?.lng != null) setExpertLoc({ lat: Number(p.lat), lng: Number(p.lng) });
    };

    const sub = () => socket.emit("subscribe_booking", bookingId, () => {});
    if (socket.connected) sub(); else socket.once("connect", sub);

    // Re-subscribe + refetch after reconnection (network drop, phone wake, etc.)
    // The assignment event may have been emitted while the socket was disconnected.
    const onReconnect = () => { sub(); refetch(); };
    socket.on("connect", onReconnect);

    socket.on("booking_assigned", onAssigned);
    socket.on("booking_status_updated", onStatus);
    socket.on("payment_success", refetch);
    socket.on("booking_cancelled", onCancelled);
    socket.on("expert_location_updated", onLocation);

    return () => {
      socket.emit("unsubscribe_booking", bookingId);
      socket.off("connect", onReconnect);
      socket.off("booking_assigned", onAssigned);
      socket.off("booking_status_updated", onStatus);
      socket.off("payment_success", refetch);
      socket.off("booking_cancelled", onCancelled);
      socket.off("expert_location_updated", onLocation);
    };
  }, [user, bookingId, qc]);

  const cancel = useMutation({
    mutationFn: () => apiFetch(`/bookings/${bookingId}/cancel`, { method: "POST", body: JSON.stringify({ reason: "Cancelled by customer" }) }),
    onSuccess: () => { toast.success("Booking cancelled"); qc.invalidateQueries({ queryKey: ["booking", bookingId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const submitReview = useMutation({
    mutationFn: () => apiFetch("/reviews", { method: "POST", body: JSON.stringify({ booking_id: bookingId, rating, comment }) }),
    onSuccess: () => { toast.success("Thanks for your review!"); setReviewOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const handleDownloadPdf = async () => {
    try {
      const toastId = toast.loading("Generating PDF...");
      const token = getAccessToken();
      const res = await fetch(`${API_BASE}/bookings/${bookingId}/invoice/pdf`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to download");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${bookingId.slice(-8).toUpperCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("PDF downloaded!", { id: toastId });
    } catch (e: any) {
      toast.error("Failed to download PDF invoice.");
    }
  };

  if (loading || isLoading) return <div className="container mx-auto px-4 py-16"><LoadingSpinner /></div>;
  if (!booking) return <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">Booking not found.</div>;

  const canCancel = !isAdmin && ["SEARCHING", "ASSIGNED", "ON_THE_WAY"].includes(booking.status);
  const showEta   = ["ASSIGNED", "ON_THE_WAY"].includes(booking.status) && booking.eta_minutes;
  const showMap   = ["ASSIGNED", "ACCEPTED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS"].includes(booking.status)
                    && (expertLoc || (booking.lat && booking.lng));

  return (
    <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">

      {/* Back link — admin goes to admin panel, others go to /bookings */}
      {isAdmin ? (
        <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <LayoutDashboard className="h-4 w-4" /> Admin panel
        </Link>
      ) : (
        <Link to="/bookings" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> My bookings
        </Link>
      )}

      {/* Admin banner */}
      {isAdmin && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-xs font-medium text-violet-700">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          Admin view — you can track this booking in real time.
          <span className={cn("ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold", STATUS_PILL[booking.status] ?? "bg-muted text-muted-foreground")}>
            {booking.status}
          </span>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{booking.service_name}</h1>
          <p className="text-sm text-muted-foreground">
            {booking.booking_type === "INSTANT" ? "Instant booking" : `Scheduled · ${booking.scheduled_at}`}
            {" · "}{Number(booking.duration_hours)} hr{" · "}₹{booking.total_amount}
          </p>
        </div>
        {showEta && (
          <div className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
            <Clock className="h-4 w-4" /> Arriving in ~{booking.eta_minutes} min
          </div>
        )}
      </div>

      {/* Live map */}
      {showMap && (
        <div className="mt-6 space-y-1">
          <LiveMap
            height={320}
            expert={expertLoc}
            dest={booking.lat && booking.lng ? { lat: Number(booking.lat), lng: Number(booking.lng) } : null}
          />
          {!expertLoc && (
            <p className="text-center text-xs text-muted-foreground">
              Waiting for live location from expert…
            </p>
          )}
        </div>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_280px]">
        {/* Status tracker */}
        <div className="space-y-4">
          <div className="rounded-2xl border bg-card p-6">
            <h3 className="mb-5 font-semibold">Live status</h3>
            <BookingTracker status={booking.status} />
          </div>

          {/* Admin: customer info card */}
          {isAdmin && booking.customer_name && (
            <div className="rounded-2xl border bg-card p-5">
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Customer</h3>
              <div className="flex items-center gap-3">
                <Avatar src={booking.customer_avatar} name={booking.customer_name} size={44} />
                <div>
                  <div className="flex items-center gap-1.5 font-medium">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    {booking.customer_name}
                  </div>
                  {booking.customer_phone && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" /> {booking.customer_phone}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Expert card */}
          {booking.expert_name ? (
            <div className="rounded-2xl border bg-card p-5">
              <h3 className="text-sm font-semibold text-muted-foreground">
                {isAdmin ? "Assigned expert" : "Your expert"}
              </h3>
              <div className="mt-3 flex items-center gap-3">
                <Avatar src={booking.expert_avatar} name={booking.expert_name} size={48} />
                <div>
                  <div className="flex items-center gap-1 font-medium">
                    {booking.expert_name} <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  </div>
                  {booking.expert_rating != null && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {Number(booking.expert_rating).toFixed(1)}
                    </div>
                  )}
                </div>
              </div>
              {locatedAt && ["ON_THE_WAY", "ARRIVED"].includes(booking.status) && (
                <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Live location updating
                </div>
              )}
              {!isAdmin && booking.customer_phone && ACTIVE.includes(booking.status) && (
                <Button variant="outline" size="sm" className="mt-3 w-full">
                  <Phone className="mr-1 h-3.5 w-3.5" /> Contact
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground">
              {isAdmin ? "No expert assigned yet." : "Finding the best expert near you…"}
            </div>
          )}

          {/* Address */}
          <div className="rounded-2xl border bg-card p-5 text-sm">
            <div className="font-semibold">Address</div>
            <p className="mt-1 text-muted-foreground">{booking.address_snapshot}</p>
          </div>

          {/* Payment info — shown to admin */}
          {isAdmin && (
            <div className="rounded-2xl border bg-card p-5 text-sm space-y-1.5">
              <div className="font-semibold">Payment</div>
              <div className="flex justify-between text-muted-foreground">
                <span>Method</span><span className="font-medium text-foreground">{booking.payment_method ?? "—"}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Status</span>
                <span className={cn("font-medium", booking.payment_status === "PAID" ? "text-emerald-600" : "text-amber-600")}>
                  {booking.payment_status ?? "—"}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Total</span><span className="font-medium text-foreground">₹{booking.total_amount}</span>
              </div>
            </div>
          )}

          {/* Customer actions — hidden from admin */}
          {canCancel && (
            <Button variant="outline" className="w-full text-destructive hover:text-destructive"
              disabled={cancel.isPending} onClick={() => cancel.mutate()}>
              {cancel.isPending ? "Cancelling…" : "Cancel booking"}
            </Button>
          )}
          {!isAdmin && booking.status === "COMPLETED" && (
            <Button className="w-full" onClick={() => setReviewOpen(true)}>
              <Star className="mr-1 h-4 w-4" /> Rate your expert
            </Button>
          )}
          {booking.status === "COMPLETED" && (
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => window.open(`/invoice/${bookingId}`, "_blank")}>
                <FileText className="mr-1 h-4 w-4" /> View HTML
              </Button>
              <Button variant="outline" className="flex-1" onClick={handleDownloadPdf}>
                <FileText className="mr-1 h-4 w-4" /> Get PDF
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Review dialog — customers only */}
      {!isAdmin && (
        <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Rate your expert</DialogTitle></DialogHeader>
            <div className="mt-2 space-y-4">
              <div className="flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setRating(n)} className="transition-transform hover:scale-110">
                    <Star className={`h-8 w-8 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                  </button>
                ))}
              </div>
              <div>
                <Label>Comment (optional)</Label>
                <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="How was the service?" />
              </div>
              <Button className="w-full" disabled={submitReview.isPending} onClick={() => submitReview.mutate()}>
                {submitReview.isPending ? "Submitting…" : "Submit review"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
