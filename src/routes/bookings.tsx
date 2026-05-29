import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Calendar, MapPin, Clock, Inbox } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/bookings")({
  head: () => ({ meta: [{ title: "My Bookings — HomeHero" }] }),
  component: BookingsPage,
});

const statusColor: Record<string, string> = {
  PENDING: "bg-amber-500/15 text-amber-700",
  CONFIRMED: "bg-blue-500/15 text-blue-700",
  IN_PROGRESS: "bg-purple-500/15 text-purple-700",
  COMPLETED: "bg-emerald-500/15 text-emerald-700",
  CANCELLED: "bg-red-500/15 text-red-700",
};

function BookingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.navigate({ to: "/auth/login" });
  }, [user, loading, router]);

  const { data: bookings = [], isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["my-bookings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, status, scheduled_date, scheduled_time, address, total_amount, categories(name), providers(profiles(name))")
        .eq("customer_id", user!.id)
        .order("scheduled_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

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
          bookings.map((b: any) => (
            <div key={b.id} className="rounded-2xl border bg-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{b.categories?.name ?? "Service"}</h3>
                    <Badge className={statusColor[b.status] ?? ""} variant="secondary">{b.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    with {b.providers?.profiles?.name ?? "Provider"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" />{b.scheduled_date}</span>
                    <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" />{b.scheduled_time}</span>
                    <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{b.address}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">₹{Number(b.total_amount).toFixed(0)}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
