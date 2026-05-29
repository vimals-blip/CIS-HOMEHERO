import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Calendar, MapPin, Clock, Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/provider/jobs")({
  head: () => ({ meta: [{ title: "Jobs — HomeHero" }] }),
  component: JobsPage,
});

function JobsPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading) {
      if (!user) router.navigate({ to: "/auth/login" });
      else if (role && role !== "PROVIDER" && role !== "ADMIN") router.navigate({ to: "/" });
    }
  }, [user, role, loading, router]);

  const { data: jobs = [], isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["provider-jobs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, status, scheduled_date, scheduled_time, address, total_amount, provider_amount, notes, categories(name), profiles!bookings_customer_id_fkey(name)")
        .eq("provider_id", user!.id)
        .order("scheduled_date", { ascending: true });
      if (error) {
        // fallback without explicit fkey hint
        const { data: d2 } = await supabase
          .from("bookings")
          .select("id, status, scheduled_date, scheduled_time, address, total_amount, provider_amount, notes, categories(name)")
          .eq("provider_id", user!.id)
          .order("scheduled_date", { ascending: true });
        return d2 ?? [];
      }
      return data ?? [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("bookings").update({ status: status as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Job updated");
      qc.invalidateQueries({ queryKey: ["provider-jobs"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (loading || isLoading) return <div className="container mx-auto px-4 py-16"><LoadingSpinner /></div>;

  const nextStatus = (s: string) =>
    s === "PENDING" ? "CONFIRMED" : s === "CONFIRMED" ? "IN_PROGRESS" : s === "IN_PROGRESS" ? "COMPLETED" : null;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold">Job board</h1>
      <p className="mt-1 text-sm text-muted-foreground">Your assigned bookings</p>

      <div className="mt-8 space-y-3">
        {jobs.length === 0 ? (
          <EmptyState icon={Briefcase} title="No jobs yet" description="New bookings will appear here as customers book your services." />
        ) : (
          jobs.map((j: any) => {
            const next = nextStatus(j.status);
            return (
              <div key={j.id} className="rounded-2xl border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{j.categories?.name ?? "Service"}</h3>
                      <Badge variant="secondary">{j.status}</Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" />{j.scheduled_date}</span>
                      <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" />{j.scheduled_time}</span>
                      <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{j.address}</span>
                    </div>
                    {j.notes && <p className="mt-2 text-sm">{j.notes}</p>}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">₹{Number(j.provider_amount ?? j.total_amount).toFixed(0)}</div>
                    {next && (
                      <Button
                        size="sm"
                        className="mt-2"
                        disabled={updateStatus.isPending}
                        onClick={() => updateStatus.mutate({ id: j.id, status: next })}
                      >
                        Mark {next.replace("_", " ").toLowerCase()}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
