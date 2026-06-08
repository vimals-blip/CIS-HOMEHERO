import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Clock, Star, Phone, ShieldCheck, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Avatar } from "@/components/shared/Avatar";
import { BookingTracker } from "@/components/booking/BookingTracker";
import { LiveMap } from "@/components/booking/LiveMap";
import { apiFetch } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/track/$bookingId")({
  head: () => ({ meta: [{ title: "Track your booking — HomeHero" }] }),
  component: TrackBooking,
});

const ACTIVE = ["SEARCHING", "ASSIGNED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS"];

function TrackBooking() {
  const { bookingId } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [locatedAt, setLocatedAt] = useState<number | null>(null);
  const [expertLoc, setExpertLoc] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth/login" }); }, [user, loading, navigate]);

  const { data: booking, isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["booking", bookingId],
    queryFn: () => apiFetch(`/bookings/${bookingId}`),
    // Polling is a fallback; the socket pushes updates in real time.
    refetchInterval: (q) => (ACTIVE.includes((q.state.data as any)?.status) ? 15000 : false),
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

    socket.on("booking_assigned", onAssigned);
    socket.on("booking_status_updated", onStatus);
    socket.on("payment_success", refetch);
    socket.on("booking_cancelled", onCancelled);
    socket.on("expert_location_updated", onLocation);

    return () => {
      socket.emit("unsubscribe_booking", bookingId);
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

  if (loading || isLoading) return <div className="container mx-auto px-4 py-16"><LoadingSpinner /></div>;
  if (!booking) return <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">Booking not found.</div>;

  const canCancel = ["SEARCHING", "ASSIGNED", "ON_THE_WAY"].includes(booking.status);
  const showEta = ["ASSIGNED", "ON_THE_WAY"].includes(booking.status) && booking.eta_minutes;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <Link to="/bookings" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> My bookings
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{booking.service_name}</h1>
          <p className="text-sm text-muted-foreground">
            {booking.booking_type === "INSTANT" ? "Instant booking" : `Scheduled · ${booking.scheduled_at}`} · {Number(booking.duration_hours)} hr · ₹{booking.total_amount}
          </p>
        </div>
        {showEta && (
          <div className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
            <Clock className="h-4 w-4" /> Arriving in ~{booking.eta_minutes} min
          </div>
        )}
      </div>

      {/* Live map — show from ASSIGNED onwards so customer sees expert moving towards them */}
      {["ASSIGNED", "ACCEPTED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS"].includes(booking.status) && (expertLoc || (booking.lat && booking.lng)) && (
        <div className="mt-6 space-y-1">
          <LiveMap
            height={320}
            expert={expertLoc}
            dest={booking.lat && booking.lng ? { lat: Number(booking.lat), lng: Number(booking.lng) } : null}
          />
          {!expertLoc && (
            <p className="text-center text-xs text-muted-foreground">
              Waiting for live location from your expert…
            </p>
          )}
        </div>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_280px]">
        {/* Tracker */}
        <div className="space-y-4">
          <div className="rounded-2xl border bg-card p-6">
            <h3 className="mb-5 font-semibold">Live status</h3>
            <BookingTracker status={booking.status} />
          </div>
        </div>

        {/* Expert + actions */}
        <div className="space-y-4">
          {booking.expert_name ? (
            <div className="rounded-2xl border bg-card p-5">
              <h3 className="text-sm font-semibold text-muted-foreground">Your expert</h3>
              <div className="mt-3 flex items-center gap-3">
                <Avatar src={booking.expert_avatar} name={booking.expert_name} size={48} />
                <div>
                  <div className="flex items-center gap-1 font-medium">{booking.expert_name} <ShieldCheck className="h-3.5 w-3.5 text-primary" /></div>
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
              {booking.customer_phone && ACTIVE.includes(booking.status) && (
                <Button variant="outline" size="sm" className="mt-3 w-full"><Phone className="mr-1 h-3.5 w-3.5" /> Contact</Button>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground">
              Finding the best expert near you…
            </div>
          )}

          <div className="rounded-2xl border bg-card p-5 text-sm">
            <div className="font-semibold">Address</div>
            <p className="mt-1 text-muted-foreground">{booking.address_snapshot}</p>
          </div>

          {canCancel && (
            <Button variant="outline" className="w-full text-destructive hover:text-destructive"
              disabled={cancel.isPending} onClick={() => cancel.mutate()}>
              {cancel.isPending ? "Cancelling…" : "Cancel booking"}
            </Button>
          )}
          {booking.status === "COMPLETED" && (
            <Button className="w-full" onClick={() => setReviewOpen(true)}>
              <Star className="mr-1 h-4 w-4" /> Rate your expert
            </Button>
          )}
        </div>
      </div>

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
    </div>
  );
}
