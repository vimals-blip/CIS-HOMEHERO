import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Inbox, Star } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { BookingCard } from "@/components/booking/BookingCard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/bookings")({
  head: () => ({ meta: [{ title: "My Bookings — HomeHero" }] }),
  component: BookingsPage,
});

function BookingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  const [reviewBookingId, setReviewBookingId] = useState<string | null>(null);
  const [reviewProviderId, setReviewProviderId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (!loading && !user) router.navigate({ to: "/auth/login" });
  }, [user, loading, router]);

  const { data: bookings = [], isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["my-bookings", user?.id],
    queryFn: () => apiFetch(`/bookings?customer_id=${user!.id}`),
  });

  const cancelBooking = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/bookings/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'CANCELLED' }) }),
    onSuccess: () => {
      toast.success("Booking cancelled");
      qc.invalidateQueries({ queryKey: ["my-bookings"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const submitReview = useMutation({
    mutationFn: () =>
      apiFetch('/reviews', {
        method: 'POST',
        body: JSON.stringify({ booking_id: reviewBookingId, provider_id: reviewProviderId, rating, comment }),
      }),
    onSuccess: () => {
      toast.success("Review submitted!");
      setReviewBookingId(null);
      setReviewProviderId(null);
      setRating(5);
      setComment("");
      qc.invalidateQueries({ queryKey: ["my-bookings"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openReview = (bookingId: string) => {
    const booking = (bookings as any[]).find((b) => b.id === bookingId);
    if (booking) {
      setReviewBookingId(bookingId);
      setReviewProviderId(booking.provider_id);
    }
  };

  if (loading || isLoading) return <div className="container mx-auto px-4 py-16"><LoadingSpinner /></div>;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold">My Bookings</h1>
      <p className="mt-1 text-sm text-muted-foreground">Track and manage your service bookings</p>

      <div className="mt-8 space-y-3">
        {bookings.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No bookings yet"
            description="Book a service from the home page to get started."
            action={<Button asChild><Link to="/">Browse services</Link></Button>}
          />
        ) : (
          (bookings as any[]).map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              onCancel={(id) => cancelBooking.mutate(id)}
              onReview={openReview}
              cancelling={cancelBooking.isPending}
            />
          ))
        )}
      </div>

      {/* Review dialog */}
      <Dialog open={!!reviewBookingId} onOpenChange={(open) => !open && setReviewBookingId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Leave a review</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Rating</Label>
              <div className="mt-2 flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setRating(n)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star className={`h-7 w-7 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Comment (optional)</Label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience…"
                rows={3}
              />
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
