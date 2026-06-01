import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Users, ShieldCheck, Briefcase, IndianRupee, CheckCircle2, XCircle,
  TrendingUp, Activity, Tag, Ticket, LayoutDashboard, Search,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin — HomeHero" }] }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!loading) {
      if (!user) router.navigate({ to: "/auth/login" });
      else if (role && role !== "ADMIN") router.navigate({ to: "/" });
    }
  }, [user, role, loading, router]);

  const { data, isLoading } = useQuery({
    enabled: role === "ADMIN",
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const [
        { count: bookings },
        { count: providers },
        { count: customers },
        { data: pending },
        { data: revenue },
        { data: recentBookings },
        { data: categories },
        { data: coupons },
      ] = await Promise.all([
        supabase.from("bookings").select("*", { count: "exact", head: true }),
        supabase.from("providers").select("*", { count: "exact", head: true }),
        supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "CUSTOMER"),
        supabase.from("providers")
          .select("id, bio, hourly_rate, experience_years, is_verified, created_at, profiles!inner(name, city, avatar_url)")
          .eq("is_verified", false).limit(20),
        supabase.from("bookings").select("platform_fee, total_amount, status, created_at"),
        supabase.from("bookings")
          .select("id, status, scheduled_date, scheduled_time, total_amount, address, categories(name)")
          .order("created_at", { ascending: false }).limit(10),
        supabase.from("categories").select("*").order("name"),
        supabase.from("coupons").select("*").order("created_at", { ascending: false }),
      ]);

      const completed = (revenue ?? []).filter((r: any) => r.status === "COMPLETED");
      const totalRevenue = completed.reduce((s: number, r: any) => s + Number(r.platform_fee || 0), 0);
      const gmv = completed.reduce((s: number, r: any) => s + Number(r.total_amount || 0), 0);

      return {
        bookings: bookings ?? 0,
        providers: providers ?? 0,
        customers: customers ?? 0,
        pending: pending ?? [],
        totalRevenue,
        gmv,
        recentBookings: recentBookings ?? [],
        categories: categories ?? [],
        coupons: coupons ?? [],
      };
    },
  });

  const verify = useMutation({
    mutationFn: async ({ id, is_verified }: { id: string; is_verified: boolean }) => {
      const { error } = await supabase.from("providers").update({ is_verified }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(v.is_verified ? "Provider approved" : "Provider rejected");
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleCategory = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("categories").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Category updated");
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (loading || isLoading) return <div className="container mx-auto px-4 py-16"><LoadingSpinner /></div>;

  const stats = [
    { icon: IndianRupee, label: "Platform revenue", value: `₹${Number(data?.totalRevenue ?? 0).toFixed(0)}`, sub: `GMV ₹${Number(data?.gmv ?? 0).toFixed(0)}`, accent: "bg-emerald-500/10 text-emerald-600" },
    { icon: Briefcase, label: "Total bookings", value: data?.bookings ?? 0, sub: "All time", accent: "bg-primary/10 text-primary" },
    { icon: Users, label: "Customers", value: data?.customers ?? 0, sub: `${data?.providers ?? 0} providers`, accent: "bg-blue-500/10 text-blue-600" },
    { icon: ShieldCheck, label: "Pending KYC", value: data?.pending.length ?? 0, sub: "Awaiting review", accent: "bg-amber-500/10 text-amber-600" },
  ];

  const filteredPending = (data?.pending ?? []).filter((p: any) =>
    !q || (p.profiles?.name ?? "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="container mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <LayoutDashboard className="h-3.5 w-3.5" /> Admin console
          </div>
          <h1 className="mt-1 text-3xl font-bold">Operations overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">Platform health, growth & moderation</p>
        </div>
        <Badge className="gap-1.5" variant="secondary">
          <Activity className="h-3.5 w-3.5 text-emerald-500" /> All systems operational
        </Badge>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border bg-card p-5">
            <div className={`grid h-10 w-10 place-items-center rounded-xl ${s.accent}`}>
              <s.icon className="h-5 w-5" />
            </div>
            <div className="mt-3 text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <TrendingUp className="h-3 w-3" /> {s.sub}
            </div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="kyc" className="mt-10">
        <TabsList>
          <TabsTrigger value="kyc">KYC Queue</TabsTrigger>
          <TabsTrigger value="bookings">Recent bookings</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="coupons">Coupons</TabsTrigger>
        </TabsList>

        <TabsContent value="kyc" className="mt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Provider verification</h2>
              <p className="text-xs text-muted-foreground">Review & approve new providers</p>
            </div>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name…" className="pl-9" />
            </div>
          </div>

          <div className="space-y-3">
            {filteredPending.length === 0 ? (
              <div className="rounded-2xl border bg-muted/30 px-6 py-12 text-center">
                <ShieldCheck className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">No providers awaiting verification.</p>
              </div>
            ) : (
              filteredPending.map((p: any) => (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-4">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 font-semibold text-primary">
                      {(p.profiles?.name ?? "P").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{p.profiles?.name ?? "Provider"}</h3>
                        <Badge variant="secondary">{p.profiles?.city ?? "—"}</Badge>
                        <span className="text-xs text-muted-foreground">{p.experience_years ?? 0} yrs exp · ₹{p.hourly_rate}/hr</span>
                      </div>
                      <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{p.bio || "No bio yet"}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => verify.mutate({ id: p.id, is_verified: false })}>
                      <XCircle className="mr-1 h-4 w-4" /> Reject
                    </Button>
                    <Button size="sm" onClick={() => verify.mutate({ id: p.id, is_verified: true })}>
                      <CheckCircle2 className="mr-1 h-4 w-4" /> Approve
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="bookings" className="mt-6">
          <div className="overflow-hidden rounded-2xl border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Address</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(data?.recentBookings ?? []).length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">No bookings yet.</td></tr>
                ) : data!.recentBookings.map((b: any) => (
                  <tr key={b.id} className="border-t">
                    <td className="px-4 py-3 font-medium">{b.categories?.name ?? "Service"}</td>
                    <td className="px-4 py-3">{b.scheduled_date} · {b.scheduled_time}</td>
                    <td className="px-4 py-3 max-w-xs truncate text-muted-foreground">{b.address}</td>
                    <td className="px-4 py-3"><Badge variant="secondary">{b.status}</Badge></td>
                    <td className="px-4 py-3 text-right font-semibold">₹{Number(b.total_amount).toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(data?.categories ?? []).map((c: any) => (
              <div key={c.id} className="rounded-2xl border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold">{c.name}</h3>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">Base ₹{c.base_price} · {c.commission_pct}% commission</div>
                  </div>
                  <Badge variant={c.is_active ? "default" : "secondary"}>{c.is_active ? "Active" : "Off"}</Badge>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-4 w-full"
                  onClick={() => toggleCategory.mutate({ id: c.id, is_active: !c.is_active })}
                >
                  {c.is_active ? "Disable" : "Enable"}
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="coupons" className="mt-6">
          {(data?.coupons ?? []).length === 0 ? (
            <div className="rounded-2xl border bg-muted/30 px-6 py-12 text-center">
              <Ticket className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">No coupons created yet.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Value</th>
                    <th className="px-4 py-3">Used</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data!.coupons.map((c: any) => (
                    <tr key={c.id} className="border-t">
                      <td className="px-4 py-3 font-mono font-semibold">{c.code}</td>
                      <td className="px-4 py-3">{c.type}</td>
                      <td className="px-4 py-3">{c.type === "PERCENT" ? `${c.value}%` : `₹${c.value}`}</td>
                      <td className="px-4 py-3">{c.used_count}{c.max_uses ? ` / ${c.max_uses}` : ""}</td>
                      <td className="px-4 py-3"><Badge variant={c.is_active ? "default" : "secondary"}>{c.is_active ? "Active" : "Off"}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
