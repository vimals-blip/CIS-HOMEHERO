import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, ShieldCheck, Users, Briefcase, Tag, Ticket,
  CheckCircle2, XCircle, Plus, RefreshCw, Search, TrendingUp,
  IndianRupee, Star, Wifi, WifiOff, ArrowUpRight, MoreHorizontal,
  BookOpen, Filter, Download, AlertCircle, Circle,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin — HomeHero" }] }),
  component: AdminDashboard,
});

type Section = "overview" | "kyc" | "providers" | "bookings" | "users" | "categories" | "coupons";

const STATUS_PILL: Record<string, string> = {
  PENDING:     "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  CONFIRMED:   "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  IN_PROGRESS: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
  COMPLETED:   "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  CANCELLED:   "bg-red-50 text-red-700 ring-1 ring-red-200",
};

const ROLE_PILL: Record<string, string> = {
  ADMIN:    "bg-violet-100 text-violet-700",
  PROVIDER: "bg-blue-100 text-blue-700",
  CUSTOMER: "bg-slate-100 text-slate-600",
};

const AVATAR_BG = [
  "bg-violet-500","bg-blue-500","bg-emerald-500",
  "bg-orange-500","bg-pink-500","bg-teal-500","bg-indigo-500",
];
function avatarBg(str: string) { return AVATAR_BG[(str?.charCodeAt(0) ?? 0) % AVATAR_BG.length]; }
function initials(name: string) { return (name ?? "?").slice(0, 2).toUpperCase(); }

function StatusDot({ status }: { status: string }) {
  const cls = status === "ONLINE" ? "bg-emerald-500" : status === "BUSY" ? "bg-amber-500" : "bg-slate-300";
  return <span className={`inline-block h-2 w-2 rounded-full ${cls}`} />;
}

// ── Sidebar ──────────────────────────────────────────────────────────────────
const NAV: { id: Section; label: string; icon: any; badge?: (d: any) => number }[] = [
  { id: "overview",    label: "Overview",    icon: LayoutDashboard },
  { id: "kyc",         label: "KYC Queue",   icon: ShieldCheck, badge: (d) => d?.pending?.length ?? 0 },
  { id: "providers",   label: "Providers",   icon: Users },
  { id: "bookings",    label: "Bookings",    icon: Briefcase },
  { id: "users",       label: "Users",       icon: BookOpen },
  { id: "categories",  label: "Categories",  icon: Tag },
  { id: "coupons",     label: "Coupons",     icon: Ticket },
];

function Sidebar({ active, onChange, overviewData }: { active: Section; onChange: (s: Section) => void; overviewData: any }) {
  return (
    <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r bg-[#0f1117] text-white min-h-screen sticky top-16">
      <div className="px-4 py-5 border-b border-white/10">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">Admin Console</p>
      </div>
      <nav className="flex-1 py-3 space-y-0.5 px-2">
        {NAV.map(({ id, label, icon: Icon, badge }) => {
          const count = badge?.(overviewData) ?? 0;
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={cn(
                "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-white/10 text-white"
                  : "text-white/50 hover:bg-white/5 hover:text-white/80",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">{label}</span>
              {count > 0 && (
                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] text-white/40">All systems operational</span>
        </div>
      </div>
    </aside>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color, trend }: any) {
  return (
    <div className="rounded-2xl border bg-card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className={cn("grid h-10 w-10 place-items-center rounded-xl", color)}>
          <Icon className="h-5 w-5" />
        </div>
        {trend != null && (
          <span className="flex items-center gap-0.5 text-xs font-medium text-emerald-600">
            <ArrowUpRight className="h-3 w-3" />{trend}
          </span>
        )}
      </div>
      <div>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
      {sub && <div className="text-[11px] text-muted-foreground border-t pt-2">{sub}</div>}
    </div>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────
function SectionHead({ title, desc, action }: { title: string; desc?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        {desc && <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
function AdminDashboard() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [section, setSection] = useState<Section>("overview");

  // Filter states
  const [kycQ, setKycQ] = useState("");
  const [provQ, setProvQ] = useState(""); const [provCity, setProvCity] = useState(""); const [provStatus, setProvStatus] = useState("all"); const [provVerified, setProvVerified] = useState("all");
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponForm, setCouponForm] = useState({ code: "", type: "FLAT", value: "", max_uses: "" });
  const [catOpen, setCatOpen] = useState(false);
  const [catForm, setCatForm] = useState({ name: "", base_price: "", commission_pct: "15", icon_name: "Sparkles" });

  useEffect(() => {
    if (!loading) {
      if (!user) router.navigate({ to: "/auth/login" });
      else if (role && role !== "ADMIN") router.navigate({ to: "/" });
    }
  }, [user, role, loading, router]);

  const { data, isLoading } = useQuery({
    enabled: role === "ADMIN",
    queryKey: ["admin-overview"],
    queryFn: () => apiFetch('/admin/overview'),
  });

  const { data: allProviders = [], isLoading: provsLoading } = useQuery({
    enabled: role === "ADMIN" && section === "providers",
    queryKey: ["admin-providers", provQ, provCity, provStatus, provVerified],
    queryFn: () => {
      const p = new URLSearchParams({ limit: "50" });
      if (provQ) p.set("q", provQ);
      if (provCity) p.set("city", provCity);
      if (provStatus !== "all") p.set("status", provStatus);
      if (provVerified !== "all") p.set("is_verified", provVerified);
      return apiFetch(`/admin/providers?${p}`);
    },
  });

  const { data: allUsers = [], isLoading: usersLoading } = useQuery({
    enabled: role === "ADMIN" && section === "users",
    queryKey: ["admin-users"],
    queryFn: () => apiFetch('/admin/users?limit=100'),
  });

  const { data: allBookings = [], isLoading: bookingsLoading } = useQuery({
    enabled: role === "ADMIN" && section === "bookings",
    queryKey: ["admin-bookings"],
    queryFn: () => apiFetch('/admin/bookings?limit=50'),
  });

  const verify = useMutation({
    mutationFn: ({ id, is_verified }: { id: string; is_verified: boolean }) =>
      apiFetch(`/providers/${id}`, { method: 'PATCH', body: JSON.stringify({ is_verified }) }),
    onSuccess: (_d, v) => {
      toast.success(v.is_verified ? "Provider approved" : "Provider rejected");
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
      qc.invalidateQueries({ queryKey: ["admin-providers"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleCategory = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      apiFetch(`/categories/${id}`, { method: 'PATCH', body: JSON.stringify({ is_active }) }),
    onSuccess: () => { toast.success("Category updated"); qc.invalidateQueries({ queryKey: ["admin-overview"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleCoupon = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      apiFetch(`/admin/coupons/${id}`, { method: 'PATCH', body: JSON.stringify({ is_active }) }),
    onSuccess: () => { toast.success("Coupon updated"); qc.invalidateQueries({ queryKey: ["admin-overview"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const createCoupon = useMutation({
    mutationFn: (body: object) => apiFetch('/admin/coupons', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success("Coupon created"); setCouponOpen(false);
      setCouponForm({ code: "", type: "FLAT", value: "", max_uses: "" });
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const createCategory = useMutation({
    mutationFn: (body: object) => apiFetch('/categories', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success("Category created"); setCatOpen(false);
      setCatForm({ name: "", base_price: "", commission_pct: "15", icon_name: "Sparkles" });
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (loading || isLoading) return <div className="flex h-[60vh] items-center justify-center"><LoadingSpinner /></div>;

  // ── Derived chart data ───────────────────────────────────────────────────
  const categoryChartData = (data?.categories ?? []).map((c: any) => ({
    name: c.name,
    price: Number(c.base_price),
    commission: Number(c.commission_pct),
  }));

  const bookingStatusData = [
    { name: "Completed", value: (data?.recentBookings ?? []).filter((b: any) => b.status === "COMPLETED").length, color: "#10b981" },
    { name: "Pending",   value: (data?.recentBookings ?? []).filter((b: any) => b.status === "PENDING").length,   color: "#f59e0b" },
    { name: "Cancelled", value: (data?.recentBookings ?? []).filter((b: any) => b.status === "CANCELLED").length, color: "#ef4444" },
    { name: "Other",     value: (data?.recentBookings ?? []).filter((b: any) => !["COMPLETED","PENDING","CANCELLED"].includes(b.status)).length, color: "#6366f1" },
  ].filter(d => d.value > 0);

  const filteredPending = (data?.pending ?? []).filter((p: any) =>
    !kycQ || (p.profiles?.name ?? "").toLowerCase().includes(kycQ.toLowerCase())
  );

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <Sidebar active={section} onChange={setSection} overviewData={data} />

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">

          {/* ── OVERVIEW ─────────────────────────────────────────────────── */}
          {section === "overview" && (
            <div className="space-y-8">
              <div>
                <h1 className="text-2xl font-bold">Operations Overview</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Platform health, revenue & growth</p>
              </div>

              {/* KPIs */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={IndianRupee} label="Platform Revenue" value={`₹${Number(data?.totalRevenue ?? 0).toLocaleString('en-IN')}`} sub={`GMV ₹${Number(data?.gmv ?? 0).toLocaleString('en-IN')}`} color="bg-emerald-500/10 text-emerald-600" />
                <StatCard icon={Briefcase}   label="Total Bookings"   value={data?.bookings ?? 0}   sub="All time" color="bg-primary/10 text-primary" />
                <StatCard icon={Users}       label="Customers"        value={data?.customers ?? 0}  sub={`+ ${data?.providers ?? 0} providers`} color="bg-blue-500/10 text-blue-600" />
                <StatCard icon={ShieldCheck} label="Pending KYC"      value={data?.pending?.length ?? 0} sub="Awaiting review" color="bg-amber-500/10 text-amber-600"
                  trend={data?.pending?.length > 0 ? `${data.pending.length} new` : null} />
              </div>

              {/* Charts row */}
              <div className="grid gap-6 lg:grid-cols-5">
                {/* Category pricing bar */}
                <div className="lg:col-span-3 rounded-2xl border bg-card p-5">
                  <div className="mb-4">
                    <h3 className="font-semibold">Service Categories</h3>
                    <p className="text-xs text-muted-foreground">Base price by category</p>
                  </div>
                  {categoryChartData.length === 0 ? (
                    <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">No categories yet</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={categoryChartData} barCategoryGap="35%">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
                        <Tooltip formatter={(v: any) => [`₹${v}`, "Base price"]} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                        <Bar dataKey="price" radius={[6, 6, 0, 0]}>
                          {categoryChartData.map((_: any, i: number) => (
                            <Cell key={i} fill={["#6366f1","#10b981","#f59e0b","#3b82f6","#ec4899"][i % 5]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Booking status donut */}
                <div className="lg:col-span-2 rounded-2xl border bg-card p-5">
                  <div className="mb-4">
                    <h3 className="font-semibold">Booking Status</h3>
                    <p className="text-xs text-muted-foreground">Recent 10 bookings</p>
                  </div>
                  {bookingStatusData.length === 0 ? (
                    <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">No booking data</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={bookingStatusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                          {bookingStatusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Recent bookings + pending KYC side-by-side */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Recent bookings */}
                <div className="rounded-2xl border bg-card overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b">
                    <div>
                      <h3 className="font-semibold">Recent Bookings</h3>
                      <p className="text-xs text-muted-foreground">Last 5</p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => setSection("bookings")}>
                      View all <ArrowUpRight className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                  <div className="divide-y">
                    {(data?.recentBookings ?? []).slice(0, 5).length === 0 ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">No bookings yet</p>
                    ) : (data?.recentBookings ?? []).slice(0, 5).map((b: any) => (
                      <div key={b.id} className="flex items-center justify-between px-5 py-3">
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{b.category_name ?? "Service"}</div>
                          <div className="text-xs text-muted-foreground">{b.customer_name ?? "—"} · {String(b.scheduled_date).slice(0,10)}</div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_PILL[b.status] ?? "")}>{b.status}</span>
                          <span className="text-sm font-semibold">₹{Number(b.total_amount).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pending KYC mini-list */}
                <div className="rounded-2xl border bg-card overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b">
                    <div>
                      <h3 className="font-semibold">KYC Queue</h3>
                      <p className="text-xs text-muted-foreground">{filteredPending.length} providers awaiting</p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => setSection("kyc")}>
                      Review all <ArrowUpRight className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                  <div className="divide-y">
                    {filteredPending.length === 0 ? (
                      <div className="flex flex-col items-center py-8 gap-2">
                        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                        <p className="text-sm text-muted-foreground">All caught up!</p>
                      </div>
                    ) : filteredPending.slice(0, 5).map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between px-5 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white", avatarBg(p.profiles?.name ?? ""))}>
                            {initials(p.profiles?.name ?? "P")}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-sm truncate">{p.profiles?.name ?? "Provider"}</div>
                            <div className="text-xs text-muted-foreground">{p.profiles?.city ?? "—"} · {p.experience_years ?? 0}y exp</div>
                          </div>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => verify.mutate({ id: p.id, is_verified: false })}>
                            <XCircle className="h-3 w-3" />
                          </Button>
                          <Button size="sm" className="h-7 px-2 text-xs" onClick={() => verify.mutate({ id: p.id, is_verified: true })}>
                            <CheckCircle2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── KYC QUEUE ────────────────────────────────────────────────── */}
          {section === "kyc" && (
            <div>
              <SectionHead title="KYC Queue" desc="Review and approve provider verification requests" />
              <div className="relative mb-5 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={kycQ} onChange={e => setKycQ(e.target.value)} placeholder="Search by name…" className="pl-9" />
              </div>
              {filteredPending.length === 0 ? (
                <div className="flex flex-col items-center py-20 gap-3 rounded-2xl border bg-muted/20">
                  <div className="grid h-14 w-14 place-items-center rounded-full bg-emerald-100"><CheckCircle2 className="h-7 w-7 text-emerald-600" /></div>
                  <p className="font-medium">All caught up!</p>
                  <p className="text-sm text-muted-foreground">No providers awaiting verification.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredPending.map((p: any) => (
                    <div key={p.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-5 hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-base font-bold text-white", avatarBg(p.profiles?.name ?? ""))}>
                          {initials(p.profiles?.name ?? "P")}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold">{p.profiles?.name ?? "Provider"}</span>
                            {p.profiles?.city && <Badge variant="secondary" className="text-[10px]">{p.profiles.city}</Badge>}
                            <span className="text-xs text-muted-foreground">{p.experience_years ?? 0} yrs exp · ₹{Number(p.hourly_rate).toLocaleString('en-IN')}/hr</span>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground line-clamp-1">{p.bio || "No bio provided"}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => verify.mutate({ id: p.id, is_verified: false })}>
                          <XCircle className="mr-1.5 h-3.5 w-3.5" /> Reject
                        </Button>
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => verify.mutate({ id: p.id, is_verified: true })}>
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Approve
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── PROVIDERS ────────────────────────────────────────────────── */}
          {section === "providers" && (
            <div>
              <SectionHead title="Providers" desc={`${allProviders.length} service professionals`} />
              <div className="flex flex-wrap gap-3 mb-5">
                <div className="relative flex-1 min-w-52">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={provQ} onChange={e => setProvQ(e.target.value)} placeholder="Search by name…" className="pl-9" />
                </div>
                <Input value={provCity} onChange={e => setProvCity(e.target.value)} placeholder="City…" className="w-32" />
                <Select value={provStatus} onValueChange={setProvStatus}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="ONLINE">Online</SelectItem>
                    <SelectItem value="OFFLINE">Offline</SelectItem>
                    <SelectItem value="BUSY">Busy</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={provVerified} onValueChange={setProvVerified}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="Verified" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="true">Verified only</SelectItem>
                    <SelectItem value="false">Unverified</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {provsLoading ? (
                <div className="flex h-40 items-center justify-center"><LoadingSpinner /></div>
              ) : allProviders.length === 0 ? (
                <div className="flex flex-col items-center py-16 rounded-2xl border bg-muted/20 gap-2">
                  <Users className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No providers match your filters</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border bg-card">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30 text-xs font-medium text-muted-foreground">
                      <tr>
                        <th className="px-5 py-3.5 text-left">Provider</th>
                        <th className="px-5 py-3.5 text-left">Location</th>
                        <th className="px-5 py-3.5 text-left">Rate</th>
                        <th className="px-5 py-3.5 text-left">Rating</th>
                        <th className="px-5 py-3.5 text-left">Status</th>
                        <th className="px-5 py-3.5 text-left">Verified</th>
                        <th className="px-5 py-3.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allProviders.map((p: any) => (
                        <tr key={p.id} className="border-t hover:bg-muted/20 transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white", avatarBg(p.name ?? ""))}>
                                {initials(p.name ?? "P")}
                              </div>
                              <div>
                                <div className="font-medium">{p.name ?? "Provider"}</div>
                                <div className="text-xs text-muted-foreground">{p.phone ?? "—"}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-muted-foreground">{p.city ?? "—"}</td>
                          <td className="px-5 py-3 font-medium">₹{Number(p.hourly_rate).toLocaleString('en-IN')}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              <span>{Number(p.avg_rating).toFixed(1)}</span>
                              <span className="text-muted-foreground text-xs">({p.review_count})</span>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-1.5">
                              <StatusDot status={p.status} />
                              <span className="text-xs capitalize">{(p.status ?? "offline").toLowerCase()}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            {p.is_verified
                              ? <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" />Verified</span>
                              : <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600"><AlertCircle className="h-3.5 w-3.5" />Pending</span>}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <Button size="sm" variant="outline" className="h-7 text-xs"
                              onClick={() => verify.mutate({ id: p.id, is_verified: !p.is_verified })}>
                              {p.is_verified ? "Revoke" : "Approve"}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── BOOKINGS ─────────────────────────────────────────────────── */}
          {section === "bookings" && (
            <div>
              <SectionHead title="All Bookings" desc="Complete platform booking history"
                action={
                  <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["admin-bookings"] })}>
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
                  </Button>
                }
              />
              {bookingsLoading ? (
                <div className="flex h-40 items-center justify-center"><LoadingSpinner /></div>
              ) : (
                <div className="overflow-hidden rounded-2xl border bg-card">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30 text-xs font-medium text-muted-foreground">
                      <tr>
                        <th className="px-5 py-3.5 text-left">Service</th>
                        <th className="px-5 py-3.5 text-left">Customer</th>
                        <th className="px-5 py-3.5 text-left">Provider</th>
                        <th className="px-5 py-3.5 text-left">Scheduled</th>
                        <th className="px-5 py-3.5 text-left">Status</th>
                        <th className="px-5 py-3.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allBookings.length === 0 ? (
                        <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">No bookings yet</td></tr>
                      ) : allBookings.map((b: any) => (
                        <tr key={b.id} className="border-t hover:bg-muted/20 transition-colors">
                          <td className="px-5 py-3 font-medium">{b.category_name ?? "Service"}</td>
                          <td className="px-5 py-3 text-muted-foreground">{b.customer_name ?? "—"}</td>
                          <td className="px-5 py-3 text-muted-foreground">{b.provider_name ?? "—"}</td>
                          <td className="px-5 py-3 text-xs">
                            <div>{String(b.scheduled_date).slice(0,10)}</div>
                            <div className="text-muted-foreground">{String(b.scheduled_time).slice(0,5)}</div>
                          </td>
                          <td className="px-5 py-3">
                            <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-semibold", STATUS_PILL[b.status] ?? "")}>
                              {b.status}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right font-semibold">₹{Number(b.total_amount).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── USERS ────────────────────────────────────────────────────── */}
          {section === "users" && (
            <div>
              <SectionHead title="Users" desc={`${allUsers.length} registered accounts`} />
              {usersLoading ? (
                <div className="flex h-40 items-center justify-center"><LoadingSpinner /></div>
              ) : (
                <div className="overflow-hidden rounded-2xl border bg-card">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30 text-xs font-medium text-muted-foreground">
                      <tr>
                        <th className="px-5 py-3.5 text-left">User</th>
                        <th className="px-5 py-3.5 text-left">Role</th>
                        <th className="px-5 py-3.5 text-left">Location</th>
                        <th className="px-5 py-3.5 text-left">Phone</th>
                        <th className="px-5 py-3.5 text-left">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allUsers.length === 0 ? (
                        <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">No users found</td></tr>
                      ) : allUsers.map((u: any) => (
                        <tr key={u.id} className="border-t hover:bg-muted/20 transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white", avatarBg(u.name ?? u.email ?? ""))}>
                                {initials(u.name ?? u.email ?? "?")}
                              </div>
                              <div>
                                <div className="font-medium">{u.name ?? "—"}</div>
                                <div className="text-xs text-muted-foreground">{u.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-semibold", ROLE_PILL[u.role] ?? "bg-slate-100 text-slate-600")}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-muted-foreground">{u.city ?? "—"}</td>
                          <td className="px-5 py-3 text-muted-foreground">{u.phone ?? "—"}</td>
                          <td className="px-5 py-3 text-xs text-muted-foreground">
                            {u.created_at ? new Date(u.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── CATEGORIES ───────────────────────────────────────────────── */}
          {section === "categories" && (
            <div>
              <SectionHead title="Service Categories" desc="Manage available services on the platform"
                action={
                  <Dialog open={catOpen} onOpenChange={setCatOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" /> Add Category</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-sm">
                      <DialogHeader><DialogTitle>New Category</DialogTitle></DialogHeader>
                      <div className="space-y-3 mt-2">
                        <div><Label>Name</Label><Input value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} placeholder="e.g. Pest Control" className="mt-1" /></div>
                        <div className="grid grid-cols-2 gap-3">
                          <div><Label>Base price (₹)</Label><Input type="number" value={catForm.base_price} onChange={e => setCatForm({...catForm, base_price: e.target.value})} className="mt-1" /></div>
                          <div><Label>Commission %</Label><Input type="number" value={catForm.commission_pct} onChange={e => setCatForm({...catForm, commission_pct: e.target.value})} className="mt-1" /></div>
                        </div>
                        <div><Label>Icon name</Label>
                          <Select value={catForm.icon_name} onValueChange={v => setCatForm({...catForm, icon_name: v})}>
                            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {["Sparkles","Wrench","Zap","Hammer","PaintBucket","AirVent","Scissors","Home"].map(n => (
                                <SelectItem key={n} value={n}>{n}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button className="w-full mt-2" disabled={createCategory.isPending} onClick={() => {
                          if (!catForm.name) { toast.error("Name is required"); return; }
                          createCategory.mutate({ name: catForm.name, base_price: Number(catForm.base_price)||0, commission_pct: Number(catForm.commission_pct)||15, icon_name: catForm.icon_name||"Sparkles" });
                        }}>
                          {createCategory.isPending ? "Creating…" : "Create Category"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                }
              />
              <div className="overflow-hidden rounded-2xl border bg-card">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 text-xs font-medium text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3.5 text-left">Category</th>
                      <th className="px-5 py-3.5 text-left">Base Price</th>
                      <th className="px-5 py-3.5 text-left">Commission</th>
                      <th className="px-5 py-3.5 text-left">Status</th>
                      <th className="px-5 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.categories ?? []).length === 0 ? (
                      <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">No categories yet</td></tr>
                    ) : (data?.categories ?? []).map((c: any) => (
                      <tr key={c.id} className="border-t hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3 font-medium">{c.name}</td>
                        <td className="px-5 py-3 font-semibold">₹{Number(c.base_price).toLocaleString('en-IN')}</td>
                        <td className="px-5 py-3 text-muted-foreground">{c.commission_pct}%</td>
                        <td className="px-5 py-3">
                          {c.is_active
                            ? <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600"><Circle className="h-2 w-2 fill-emerald-500 text-emerald-500" />Active</span>
                            : <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground"><Circle className="h-2 w-2 fill-slate-300 text-slate-300" />Disabled</span>}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Button size="sm" variant="outline" className="h-7 text-xs"
                            onClick={() => toggleCategory.mutate({ id: c.id, is_active: !c.is_active })}>
                            {c.is_active ? "Disable" : "Enable"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── COUPONS ──────────────────────────────────────────────────── */}
          {section === "coupons" && (
            <div>
              <SectionHead title="Coupons" desc="Discount codes and promotions"
                action={
                  <Dialog open={couponOpen} onOpenChange={setCouponOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" /> New Coupon</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-sm">
                      <DialogHeader><DialogTitle>Create Coupon</DialogTitle></DialogHeader>
                      <div className="space-y-3 mt-2">
                        <div><Label>Code</Label><Input value={couponForm.code} onChange={e => setCouponForm({...couponForm, code: e.target.value.toUpperCase()})} placeholder="e.g. SAVE20" className="mt-1 font-mono tracking-widest" /></div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Type</Label>
                            <Select value={couponForm.type} onValueChange={v => setCouponForm({...couponForm, type: v})}>
                              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="FLAT">Flat (₹)</SelectItem>
                                <SelectItem value="PERCENT">Percent (%)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div><Label>Value</Label><Input type="number" value={couponForm.value} onChange={e => setCouponForm({...couponForm, value: e.target.value})} className="mt-1" /></div>
                        </div>
                        <div><Label>Max uses <span className="text-muted-foreground">(optional)</span></Label><Input type="number" value={couponForm.max_uses} onChange={e => setCouponForm({...couponForm, max_uses: e.target.value})} className="mt-1" /></div>
                        <Button className="w-full mt-2" disabled={createCoupon.isPending} onClick={() => {
                          if (!couponForm.code || !couponForm.value) { toast.error("Code and value are required"); return; }
                          createCoupon.mutate({ code: couponForm.code, type: couponForm.type, value: Number(couponForm.value), max_uses: couponForm.max_uses ? Number(couponForm.max_uses) : undefined });
                        }}>
                          {createCoupon.isPending ? "Creating…" : "Create Coupon"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                }
              />
              {(data?.coupons ?? []).length === 0 ? (
                <div className="flex flex-col items-center py-16 rounded-2xl border bg-muted/20 gap-2">
                  <Ticket className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No coupons yet. Create your first one.</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border bg-card">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30 text-xs font-medium text-muted-foreground">
                      <tr>
                        <th className="px-5 py-3.5 text-left">Code</th>
                        <th className="px-5 py-3.5 text-left">Discount</th>
                        <th className="px-5 py-3.5 text-left">Usage</th>
                        <th className="px-5 py-3.5 text-left">Status</th>
                        <th className="px-5 py-3.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data!.coupons.map((c: any) => (
                        <tr key={c.id} className="border-t hover:bg-muted/20 transition-colors">
                          <td className="px-5 py-3 font-mono font-semibold tracking-widest text-xs">{c.code}</td>
                          <td className="px-5 py-3 font-semibold">
                            {c.type === "PERCENT" ? `${c.value}% off` : `₹${Number(c.value).toLocaleString('en-IN')} off`}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">{c.used_count}</span>
                              {c.max_uses && (
                                <>
                                  <span className="text-muted-foreground">/ {c.max_uses}</span>
                                  <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                                    <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, (c.used_count / c.max_uses) * 100)}%` }} />
                                  </div>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            {c.is_active
                              ? <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600"><Circle className="h-2 w-2 fill-emerald-500 text-emerald-500" />Active</span>
                              : <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground"><Circle className="h-2 w-2 fill-slate-300 text-slate-300" />Inactive</span>}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <Button variant="outline" size="sm" className="h-7 text-xs"
                              onClick={() => toggleCoupon.mutate({ id: c.id, is_active: !c.is_active })}>
                              {c.is_active ? "Disable" : "Enable"}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
