import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard, ShieldCheck, Users, Briefcase, Tag, Ticket,
  CheckCircle2, XCircle, Plus, RefreshCw, Search, IndianRupee,
  Star, BookOpen, Circle, AlertCircle, Wallet, LifeBuoy, Settings as SettingsIcon, Send, ArrowLeft,
  ScrollText, KeyRound, FileText, ExternalLink, Trash2, Pencil, BarChart2, BellRing,
  ImageIcon, Upload, Loader2, X, MapPin,
} from "lucide-react";
import { startBookingAlarm } from "@/lib/sound";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts";
import { apiFetch, uploadFile } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Avatar } from "@/components/shared/Avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin — HomeHero" }] }),
  component: AdminDashboard,
});

type Section = "overview" | "kyc" | "experts" | "bookings" | "users" | "services" | "coupons" | "settlements" | "support" | "reports" | "settings" | "admins" | "audit";

const STATUS_PILL: Record<string, string> = {
  SEARCHING:   "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  ASSIGNED:    "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  ON_THE_WAY:  "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
  ARRIVED:     "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200",
  IN_PROGRESS: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
  COMPLETED:   "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  CANCELLED:   "bg-red-50 text-red-700 ring-1 ring-red-200",
};
const ROLE_PILL: Record<string, string> = {
  ADMIN: "bg-violet-100 text-violet-700", EXPERT: "bg-blue-100 text-blue-700", CUSTOMER: "bg-slate-100 text-slate-600",
};
function StatusDot({ status }: { status: string }) {
  const cls = status === "ONLINE" ? "bg-emerald-500" : status === "BUSY" ? "bg-amber-500" : "bg-slate-300";
  return <span className={`inline-block h-2 w-2 rounded-full ${cls}`} />;
}

const NAV: { id: Section; label: string; icon: any; badge?: (d: any) => number; superOnly?: boolean }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "kyc",      label: "KYC Queue", icon: ShieldCheck, badge: (d) => d?.pending?.length ?? 0 },
  { id: "experts",  label: "Experts", icon: Users },
  { id: "bookings", label: "Bookings", icon: Briefcase },
  { id: "users",    label: "Users", icon: BookOpen },
  { id: "services", label: "Services", icon: Tag },
  { id: "coupons",  label: "Coupons", icon: Ticket },
  { id: "settlements", label: "Settlements", icon: Wallet },
  { id: "support", label: "Support", icon: LifeBuoy },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "settings", label: "Settings", icon: SettingsIcon, superOnly: true },
  { id: "admins", label: "Admins", icon: ShieldCheck, superOnly: true },
  { id: "audit", label: "Audit Log", icon: ScrollText, superOnly: true },
];

function Sidebar({ active, onChange, data, isSuperAdmin }: { active: Section; onChange: (s: Section) => void; data: any; isSuperAdmin: boolean }) {
  return (
    <aside className="sticky top-16 hidden min-h-screen w-56 shrink-0 flex-col border-r bg-[#0f1117] text-white lg:flex">
      <div className="border-b border-white/10 px-4 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">{isSuperAdmin ? "Super Admin" : "Admin Console"}</p>
      </div>
      <nav className="flex-1 space-y-0.5 px-2 py-3">
        {NAV.filter((n) => !(n as any).superOnly || isSuperAdmin).map(({ id, label, icon: Icon, badge }) => {
          const count = badge?.(data) ?? 0;
          return (
            <button key={id} onClick={() => onChange(id)} className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
              active === id ? "bg-white/10 text-white" : "text-white/50 hover:bg-white/5 hover:text-white/80",
            )}>
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">{label}</span>
              {count > 0 && <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">{count}</span>}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: any) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-card p-5">
      <div className={cn("grid h-10 w-10 place-items-center rounded-xl", color)}><Icon className="h-5 w-5" /></div>
      <div>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
      {sub && <div className="border-t pt-2 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function SectionHead({ title, desc, action }: { title: string; desc?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        {desc && <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

const PAGE_SIZE = 20;

// Lightweight pager: a full page of results implies there may be a next page.
function Pager({ page, onPage, count }: { page: number; onPage: (p: number) => void; count: number }) {
  const hasNext = count === PAGE_SIZE;
  if (page === 1 && !hasNext) return null;
  return (
    <div className="mt-3 flex items-center justify-end gap-2">
      <span className="text-xs text-muted-foreground">Page {page}</span>
      <Button variant="outline" size="sm" className="h-8" disabled={page === 1} onClick={() => onPage(page - 1)}>Prev</Button>
      <Button variant="outline" size="sm" className="h-8" disabled={!hasNext} onClick={() => onPage(page + 1)}>Next</Button>
    </div>
  );
}

function AdminDashboard() {
  const { user, role, loading } = useAuth();
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
  const isSuperAdmin = role === "SUPER_ADMIN";
  const router = useRouter();
  const qc = useQueryClient();
  const [section, setSection] = useState<Section>("overview");
  const [kycQ, setKycQ] = useState("");
  const [kycTab, setKycTab] = useState<"pending" | "rejected" | "all">("pending");
  const [expQ, setExpQ] = useState(""); const [expStatus, setExpStatus] = useState("all"); const [expVerified, setExpVerified] = useState("all");
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponForm, setCouponForm] = useState({ code: "", type: "FLAT", value: "", max_uses: "" });
  const [svcOpen, setSvcOpen] = useState(false);
  const [editSvcId, setEditSvcId] = useState<string | null>(null);
  const BLANK_SVC = { name: "", slug: "", tagline: "", description: "", image_url: "", rate_per_hour: "", min_hours: "1", platform_fee_pct: "15", icon_name: "Sparkles", sort_order: "0", is_active: true };
  const [svcForm, setSvcForm] = useState<typeof BLANK_SVC>(BLANK_SVC);
  const [svcImageUploading, setSvcImageUploading] = useState(false);
  const [reportType, setReportType] = useState("revenue");
  const toDateStr = (d: Date) => d.toISOString().slice(0, 10);
  const [reportFrom, setReportFrom] = useState(() => toDateStr(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));
  const [reportTo, setReportTo] = useState(() => toDateStr(new Date()));
  const [reportTriggered, setReportTriggered] = useState(false);
  const [ticketStatusFilter, setTicketStatusFilter] = useState("ALL");
  const stopAdminAlarmRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!loading) {
      if (!user) router.navigate({ to: "/auth/login" });
      else if (role && role !== "ADMIN" && role !== "SUPER_ADMIN") router.navigate({ to: "/" });
    }
  }, [user, role, loading, router]);

  const { data, isLoading } = useQuery({ enabled: isAdmin, queryKey: ["admin-overview"], queryFn: () => apiFetch("/admin/overview"), refetchInterval: 15000 });

  // Ring alarm when bookings are stuck in SEARCHING (no expert assigned) — stop when cleared.
  useEffect(() => {
    const recentBookings = data?.recentBookings ?? [];
    const searchingCount = recentBookings.filter((b: any) => b.status === "SEARCHING").length;
    if (searchingCount > 0 && !stopAdminAlarmRef.current) {
      stopAdminAlarmRef.current = startBookingAlarm();
    } else if (searchingCount === 0 && stopAdminAlarmRef.current) {
      stopAdminAlarmRef.current();
      stopAdminAlarmRef.current = null;
    }
  }, [data?.recentBookings]);

  useEffect(() => { return () => { stopAdminAlarmRef.current?.(); }; }, []);

  const [expPage, setExpPage] = useState(1);
  useEffect(() => { setExpPage(1); }, [expQ, expStatus, expVerified]);
  const { data: experts = [], isLoading: expLoading } = useQuery({
    enabled: isAdmin && section === "experts",
    queryKey: ["admin-experts", expQ, expStatus, expVerified, expPage],
    queryFn: () => {
      const p = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(expPage) });
      if (expQ) p.set("q", expQ);
      if (expStatus !== "all") p.set("status", expStatus);
      if (expVerified !== "all") p.set("is_verified", expVerified);
      return apiFetch(`/admin/experts?${p}`);
    },
  });

  const [userQ, setUserQ] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [userRoleFilter, setUserRoleFilter] = useState("ALL");
  useEffect(() => { setUserPage(1); }, [userQ, userRoleFilter]);
  const { data: users = [], isLoading: usersLoading } = useQuery({
    enabled: isAdmin && section === "users", queryKey: ["admin-users", userQ, userPage, userRoleFilter],
    queryFn: () => {
      const p = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(userPage) });
      if (userQ) p.set("q", userQ);
      if (userRoleFilter === "BLOCKED") p.set("is_blocked", "true");
      else if (userRoleFilter !== "ALL") p.set("role", userRoleFilter);
      return apiFetch(`/admin/users?${p}`);
    },
  });
  const [bkPage, setBkPage] = useState(1);
  const { data: allBookings = [], isLoading: bookingsLoading } = useQuery({
    enabled: isAdmin && section === "bookings", queryKey: ["admin-bookings", bkPage],
    queryFn: () => apiFetch(`/admin/bookings?limit=${PAGE_SIZE}&page=${bkPage}`),
  });
  const { data: withdrawals = [], isLoading: wdLoading } = useQuery({
    enabled: isAdmin && section === "settlements", queryKey: ["admin-withdrawals"], queryFn: () => apiFetch("/admin/withdrawals"),
  });

  const { data: allServices = [], isLoading: servicesLoading, refetch: refetchServices } = useQuery({
    enabled: isAdmin && section === "services",
    queryKey: ["admin-services"],
    queryFn: () => apiFetch("/services?all=true"),
  });

  const { data: reportData, isLoading: reportLoading, refetch: fetchReport } = useQuery({
    enabled: false,
    queryKey: ["admin-report", reportType, reportFrom, reportTo],
    queryFn: () => apiFetch(`/admin/reports?type=${reportType}&from=${reportFrom}&to=${reportTo}`),
  });

  const actWithdrawal = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      apiFetch(`/admin/withdrawals/${id}`, { method: "PATCH", body: JSON.stringify({ action }) }),
    onSuccess: (_d, v) => { toast.success(`Withdrawal ${v.action}d`); qc.invalidateQueries({ queryKey: ["admin-withdrawals"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  // KYC document review
  const [docsExpert, setDocsExpert] = useState<{ id: string; name: string } | null>(null);
  const { data: expertDocs = [], isLoading: docsLoading } = useQuery({
    enabled: !!docsExpert, queryKey: ["admin-expert-docs", docsExpert?.id], queryFn: () => apiFetch(`/experts/${docsExpert!.id}/documents`),
  });
  const reviewDoc = useMutation({
    mutationFn: ({ docId, status }: { docId: string; status: string }) =>
      apiFetch(`/admin/experts/${docsExpert!.id}/documents/${docId}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: (_d, v) => { toast.success(`Document ${v.status.toLowerCase()}`); qc.invalidateQueries({ queryKey: ["admin-expert-docs", docsExpert?.id] }); },
    onError: (e: any) => toast.error(e.message),
  });

  // Support
  const [openTicket, setOpenTicket] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const { data: tickets = [], isLoading: ticketsLoading } = useQuery({
    enabled: isAdmin && section === "support", queryKey: ["admin-tickets"], queryFn: () => apiFetch("/support/tickets"),
  });
  const { data: ticketThread } = useQuery({
    enabled: !!openTicket, queryKey: ["admin-ticket", openTicket], queryFn: () => apiFetch(`/support/tickets/${openTicket}`),
  });
  const ticketReply = useMutation({
    mutationFn: () => apiFetch(`/support/tickets/${openTicket}/messages`, { method: "POST", body: JSON.stringify({ body: reply }) }),
    onSuccess: () => { setReply(""); qc.invalidateQueries({ queryKey: ["admin-ticket", openTicket] }); qc.invalidateQueries({ queryKey: ["admin-tickets"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const ticketStatus = useMutation({
    mutationFn: (status: string) => apiFetch(`/support/tickets/${openTicket}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => { toast.success("Ticket updated"); qc.invalidateQueries({ queryKey: ["admin-ticket", openTicket] }); qc.invalidateQueries({ queryKey: ["admin-tickets"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  // Payment gateway config
  const [payCfgGateway, setPayCfgGateway] = useState<"RAZORPAY" | "STRIPE">("RAZORPAY");
  const [payCfgMode, setPayCfgMode] = useState<"TEST" | "LIVE">("TEST");
  const [payCfgFields, setPayCfgFields] = useState<Record<string, string>>({});
  const { data: payCfgRaw } = useQuery({
    enabled: isSuperAdmin && section === "settings",
    queryKey: ["admin-payment-config"],
    queryFn: () => apiFetch("/admin/payment-config"),
  });
  // Sync loaded config into local state (TanStack Query v5 — no onSuccess in useQuery)
  useEffect(() => {
    if (!payCfgRaw) return;
    const d = payCfgRaw as Record<string, string>;
    if (d.payment_gateway) setPayCfgGateway(d.payment_gateway as "RAZORPAY" | "STRIPE");
    if (d.payment_mode)    setPayCfgMode(d.payment_mode as "TEST" | "LIVE");
    setPayCfgFields(d);
  }, [payCfgRaw]);
  const savePayConfig = useMutation({
    mutationFn: (cfg: Record<string, string>) => apiFetch("/admin/payment-config", { method: "POST", body: JSON.stringify(cfg) }),
    onSuccess: () => toast.success("Payment gateway settings saved"),
    onError: (e: any) => toast.error(e.message),
  });

  // Settings / CMS
  const [settingEdits, setSettingEdits] = useState<Record<string, string>>({});
  const [newCity, setNewCity] = useState("");
  const { data: settings = [], isLoading: settingsLoading } = useQuery({
    enabled: isAdmin && section === "settings", queryKey: ["admin-settings"], queryFn: () => apiFetch("/admin/settings"),
  });
  const { data: cities = [] } = useQuery({
    enabled: isAdmin && section === "settings", queryKey: ["admin-cities"], queryFn: () => apiFetch("/admin/cities"),
  });
  const saveSetting = useMutation({
    mutationFn: (s: { key: string; value: string; is_public: boolean }) => apiFetch("/admin/settings", { method: "POST", body: JSON.stringify(s) }),
    onSuccess: () => { toast.success("Setting saved"); qc.invalidateQueries({ queryKey: ["admin-settings"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const addCity = useMutation({
    mutationFn: (name: string) => apiFetch("/admin/cities", { method: "POST", body: JSON.stringify({ name }) }),
    onSuccess: () => { toast.success("City added"); setNewCity(""); qc.invalidateQueries({ queryKey: ["admin-cities"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const toggleCity = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => apiFetch(`/admin/cities/${id}`, { method: "PATCH", body: JSON.stringify({ is_active }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-cities"] }),
    onError: (e: any) => toast.error(e.message),
  });

  // Banners + CMS pages
  const [banner, setBanner] = useState({ title: "", image_url: "" });
  const [pageSlug, setPageSlug] = useState("terms");
  const [pageForm, setPageForm] = useState({ title: "", body: "" });
  const { data: banners = [] } = useQuery({
    enabled: isAdmin && section === "settings", queryKey: ["admin-banners"], queryFn: () => apiFetch("/admin/banners"),
  });
  useQuery({
    enabled: isAdmin && section === "settings", queryKey: ["admin-page", pageSlug],
    queryFn: async () => { const p = await apiFetch(`/cms/pages/${pageSlug}`).catch(() => null); setPageForm({ title: p?.title ?? "", body: p?.body ?? "" }); return p ?? {}; },
  });
  const createBanner = useMutation({
    mutationFn: () => apiFetch("/admin/banners", { method: "POST", body: JSON.stringify({ title: banner.title, image_url: banner.image_url }) }),
    onSuccess: () => { toast.success("Banner added"); setBanner({ title: "", image_url: "" }); qc.invalidateQueries({ queryKey: ["admin-banners"] }); qc.invalidateQueries({ queryKey: ["banners"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const toggleBanner = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => apiFetch(`/admin/banners/${id}`, { method: "PATCH", body: JSON.stringify({ is_active }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-banners"] }); qc.invalidateQueries({ queryKey: ["banners"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const savePage = useMutation({
    mutationFn: () => apiFetch(`/admin/pages/${pageSlug}`, { method: "PUT", body: JSON.stringify(pageForm) }),
    onSuccess: () => { toast.success("Page saved"); qc.invalidateQueries({ queryKey: ["admin-page", pageSlug] }); },
    onError: (e: any) => toast.error(e.message),
  });

  // Expert detail panel
  const [detailExpertId, setDetailExpertId] = useState<string | null>(null);
  const [expertEditForm, setExpertEditForm] = useState<any>({});
  const [expertServiceIds, setExpertServiceIds] = useState<string[]>([]);
  const { data: detailExpert, isLoading: expertDetailLoading } = useQuery({
    enabled: !!detailExpertId,
    queryKey: ["admin-expert-detail", detailExpertId],
    queryFn: () => apiFetch(`/admin/experts/${detailExpertId}`),
  });
  useEffect(() => {
    if (detailExpert) {
      setExpertEditForm({
        name: detailExpert.name ?? "",
        city: detailExpert.city ?? "",
        bio: detailExpert.bio ?? "",
        gender: detailExpert.gender ?? "",
        experience_years: detailExpert.experience_years ?? "",
        is_trained: Boolean(detailExpert.is_trained),
        is_verified: Boolean(detailExpert.is_verified),
        is_blocked: Boolean(detailExpert.is_blocked),
        avatar_url: detailExpert.avatar_url ?? "",
      });
      setExpertServiceIds(detailExpert.service_ids ?? []);
    }
  }, [detailExpert]);
  const saveExpert = useMutation({
    mutationFn: (body: object) => apiFetch(`/admin/experts/${detailExpertId}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success("Expert updated");
      qc.invalidateQueries({ queryKey: ["admin-expert-detail", detailExpertId] });
      qc.invalidateQueries({ queryKey: ["admin-experts"] });
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteExpert = useMutation({
    mutationFn: () => apiFetch(`/admin/experts/${detailExpertId}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Expert deleted");
      setDetailExpertId(null);
      qc.invalidateQueries({ queryKey: ["admin-experts"] });
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Booking detail panel
  const [detailBookingId, setDetailBookingId] = useState<string | null>(null);
  const [bkStatusFilter, setBkStatusFilter] = useState("ALL");
  const [selectedExpertId, setSelectedExpertId] = useState("");
  const { data: detailBooking, isLoading: bookingDetailLoading } = useQuery({
    enabled: !!detailBookingId,
    queryKey: ["admin-booking-detail", detailBookingId],
    queryFn: () => apiFetch(`/admin/bookings/${detailBookingId}`),
  });
  const { data: availableExperts = [] } = useQuery({
    enabled: !!detailBookingId && detailBooking?.status === "SEARCHING",
    queryKey: ["available-experts", detailBooking?.service_id],
    queryFn: () => apiFetch(`/admin/available-experts?serviceId=${detailBooking?.service_id ?? ""}`),
  });
  const assignExpert = useMutation({
    mutationFn: ({ bookingId, expertId }: { bookingId: string; expertId: string }) =>
      apiFetch(`/admin/bookings/${bookingId}/assign`, { method: "POST", body: JSON.stringify({ expert_id: expertId }) }),
    onSuccess: () => {
      toast.success("Expert assigned successfully");
      setSelectedExpertId("");
      qc.invalidateQueries({ queryKey: ["admin-booking-detail", detailBookingId] });
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // User detail drawer
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [editUser, setEditUser] = useState({ name: "", phone: "", city: "" });
  const { data: userDetail, isLoading: detailLoading } = useQuery({
    enabled: !!detailUserId, queryKey: ["admin-user", detailUserId], queryFn: () => apiFetch(`/admin/users/${detailUserId}`),
  });
  useEffect(() => {
    if (userDetail?.profile) setEditUser({ name: userDetail.profile.name ?? "", phone: userDetail.profile.phone ?? "", city: userDetail.profile.city ?? "" });
  }, [userDetail]);

  const saveUser = useMutation({
    mutationFn: (body: object) => apiFetch(`/admin/users/${detailUserId}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => { toast.success("User updated"); qc.invalidateQueries({ queryKey: ["admin-user", detailUserId] }); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteUser = useMutation({
    mutationFn: () => apiFetch(`/admin/users/${detailUserId}`, { method: "DELETE" }),
    onSuccess: () => { toast.success("User deleted"); setDetailUserId(null); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  // Admin password reset — backend returns a one-time temp password when none supplied.
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const resetPassword = useMutation({
    mutationFn: () => apiFetch<{ temp_password?: string }>(`/admin/users/${detailUserId}/reset-password`, { method: "POST", body: JSON.stringify({}) }),
    onSuccess: (d) => {
      if (d.temp_password) { setTempPassword(d.temp_password); toast.success("Temporary password generated"); }
      else toast.success("Password reset");
    },
    onError: (e: any) => toast.error(e.message),
  });
  useEffect(() => { setTempPassword(null); }, [detailUserId]);

  // Expert earnings ledger — fetched only when the open user is an expert.
  const { data: earnings = [] } = useQuery({
    enabled: !!detailUserId && !!userDetail?.expert,
    queryKey: ["admin-earnings", detailUserId],
    queryFn: () => apiFetch(`/expert-wallet/${detailUserId}/earnings`),
  });

  // Admin management (super-admin only)
  const [promoteEmail, setPromoteEmail] = useState("");
  const { data: admins = [] } = useQuery({
    enabled: isSuperAdmin && section === "admins", queryKey: ["admin-admins"], queryFn: () => apiFetch("/admin/admins"),
  });
  const promote = useMutation({
    mutationFn: (body: object) => apiFetch("/admin/admins", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { toast.success("Role updated"); setPromoteEmail(""); qc.invalidateQueries({ queryKey: ["admin-admins"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  // Audit trail (super-admin only)
  const [auditAction, setAuditAction] = useState("all");
  const { data: auditLogs = [], isLoading: auditLoading } = useQuery({
    enabled: isSuperAdmin && section === "audit",
    queryKey: ["admin-audit", auditAction],
    queryFn: () => apiFetch(`/admin/audit-logs?limit=200${auditAction !== "all" ? `&action=${encodeURIComponent(auditAction)}` : ""}`),
  });

  const verify = useMutation({
    mutationFn: ({ id, is_verified }: { id: string; is_verified: boolean }) =>
      apiFetch(`/experts/${id}`, { method: "PATCH", body: JSON.stringify({ is_verified }) }),
    onSuccess: (_d, v) => {
      toast.success(v.is_verified ? "Expert approved" : "Expert rejected");
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
      qc.invalidateQueries({ queryKey: ["admin-experts"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleService = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      apiFetch(`/services/${id}`, { method: "PATCH", body: JSON.stringify({ is_active }) }),
    onSuccess: () => { toast.success("Service updated"); qc.invalidateQueries({ queryKey: ["admin-overview"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const createService = useMutation({
    mutationFn: (body: object) => apiFetch("/services", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success("Service created"); setSvcOpen(false); setEditSvcId(null); setSvcForm(BLANK_SVC);
      qc.invalidateQueries({ queryKey: ["admin-overview"] }); qc.invalidateQueries({ queryKey: ["admin-services"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateService = useMutation({
    mutationFn: ({ id, ...body }: { id: string; [k: string]: any }) => apiFetch(`/services/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success("Service updated"); setSvcOpen(false); setEditSvcId(null); setSvcForm(BLANK_SVC);
      qc.invalidateQueries({ queryKey: ["admin-overview"] }); qc.invalidateQueries({ queryKey: ["admin-services"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteService = useMutation({
    mutationFn: (id: string) => apiFetch(`/services/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Service deleted");
      qc.invalidateQueries({ queryKey: ["admin-overview"] }); qc.invalidateQueries({ queryKey: ["admin-services"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleCoupon = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      apiFetch(`/admin/coupons/${id}`, { method: "PATCH", body: JSON.stringify({ is_active }) }),
    onSuccess: () => { toast.success("Coupon updated"); qc.invalidateQueries({ queryKey: ["admin-overview"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const createCoupon = useMutation({
    mutationFn: (body: object) => apiFetch("/admin/coupons", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success("Coupon created"); setCouponOpen(false);
      setCouponForm({ code: "", type: "FLAT", value: "", max_uses: "" });
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (loading || isLoading) return <div className="flex h-[60vh] items-center justify-center"><LoadingSpinner /></div>;

  const serviceChartData = (data?.services ?? []).map((s: any) => ({ name: s.name, rate: Number(s.rate_per_hour) }));
  const recent = data?.recentBookings ?? [];
  const statusData = [
    { name: "Completed", value: recent.filter((b: any) => b.status === "COMPLETED").length, color: "#10b981" },
    { name: "Active", value: recent.filter((b: any) => ["ASSIGNED","ON_THE_WAY","ARRIVED","IN_PROGRESS"].includes(b.status)).length, color: "#6366f1" },
    { name: "Searching", value: recent.filter((b: any) => b.status === "SEARCHING").length, color: "#f59e0b" },
    { name: "Cancelled", value: recent.filter((b: any) => b.status === "CANCELLED").length, color: "#ef4444" },
  ].filter((d) => d.value > 0);
  const allPending = (data?.pending ?? []) as any[];
  const pendingByStatus = {
    pending: allPending.filter((p: any) => ["SUBMITTED", "INCOMPLETE"].includes(p.onboarding_status ?? "SUBMITTED")),
    rejected: allPending.filter((p: any) => p.onboarding_status === "REJECTED"),
    all: allPending,
  };
  const pending = pendingByStatus[kycTab].filter((p: any) => !kycQ || (p.profiles?.name ?? "").toLowerCase().includes(kycQ.toLowerCase()));

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <Sidebar active={section} onChange={setSection} data={data} isSuperAdmin={isSuperAdmin} />
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-[1600px] px-6 py-8">

          {section === "overview" && (
            <div className="space-y-8">
              <div>
                <h1 className="text-2xl font-bold">Operations Overview</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">Platform health, revenue & growth</p>
              </div>
              {/* Alert banner when bookings are stuck searching for an expert */}
              {recent.filter((b: any) => b.status === "SEARCHING").length > 0 && (
                <div className="flex items-center gap-3 rounded-2xl border border-amber-400/50 bg-amber-500/10 px-5 py-4">
                  <BellRing className="h-5 w-5 shrink-0 animate-pulse text-amber-600" />
                  <div className="flex-1">
                    <span className="font-semibold text-amber-800">
                      {recent.filter((b: any) => b.status === "SEARCHING").length} booking{recent.filter((b: any) => b.status === "SEARCHING").length > 1 ? "s" : ""} searching for an expert
                    </span>
                    <span className="ml-2 text-sm text-amber-700">— no expert assigned yet</span>
                  </div>
                  <button onClick={() => setSection("bookings")} className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700">
                    View bookings
                  </button>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={IndianRupee} label="Platform Revenue" value={`₹${Number(data?.totalRevenue ?? 0).toLocaleString("en-IN")}`} sub={`GMV ₹${Number(data?.gmv ?? 0).toLocaleString("en-IN")}`} color="bg-emerald-500/10 text-emerald-600" />
                <StatCard icon={Briefcase} label="Total Bookings" value={data?.bookings ?? 0} sub="All time" color="bg-primary/10 text-primary" />
                <StatCard icon={Users} label="Customers" value={data?.customers ?? 0} sub={`+ ${data?.experts ?? 0} experts`} color="bg-blue-500/10 text-blue-600" />
                <StatCard icon={ShieldCheck} label="Pending KYC" value={pendingByStatus.pending.length} sub={pendingByStatus.rejected.length > 0 ? `${pendingByStatus.rejected.length} rejected` : "Awaiting review"} color="bg-amber-500/10 text-amber-600" />
              </div>
              <div className="grid gap-6 lg:grid-cols-5">
                <div className="rounded-2xl border bg-card p-5 lg:col-span-3">
                  <h3 className="font-semibold">Service rates</h3>
                  <p className="mb-4 text-xs text-muted-foreground">Hourly rate by service</p>
                  {serviceChartData.length === 0 ? <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">No services</div> : (
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={serviceChartData} barCategoryGap="35%">
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                        <Tooltip formatter={(v: any) => [`₹${v}/hr`, "Rate"]} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                        <Bar dataKey="rate" radius={[6, 6, 0, 0]}>
                          {serviceChartData.map((_: any, i: number) => <Cell key={i} fill={["#6366f1","#10b981","#f59e0b","#3b82f6","#ec4899","#14b8a6"][i % 6]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="rounded-2xl border bg-card p-5 lg:col-span-2">
                  <h3 className="font-semibold">Booking status</h3>
                  <p className="mb-4 text-xs text-muted-foreground">Recent bookings</p>
                  {statusData.length === 0 ? <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">No data</div> : (
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                          {statusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="overflow-hidden rounded-2xl border bg-card">
                  <div className="border-b px-5 py-4"><h3 className="font-semibold">Recent bookings</h3></div>
                  <div className="divide-y">
                    {recent.slice(0, 6).length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No bookings yet</p> :
                      recent.slice(0, 6).map((b: any) => (
                        <div key={b.id} className="flex items-center justify-between px-5 py-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">{b.service_name ?? "Service"}</div>
                            <div className="text-xs text-muted-foreground">{b.customer_name ?? "—"} · {b.booking_type}</div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_PILL[b.status] ?? "")}>{b.status}</span>
                            <span className="text-sm font-semibold">₹{Number(b.total_amount).toLocaleString("en-IN")}</span>
                            <a href={`/track/${b.id}`} target="_blank" rel="noreferrer"
                              className="inline-flex items-center gap-0.5 rounded-lg border border-primary/30 bg-primary/5 px-2 py-0.5 text-[11px] font-semibold text-primary hover:bg-primary/10 transition-colors">
                              <MapPin className="h-3 w-3" /> Track
                            </a>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
                <div className="overflow-hidden rounded-2xl border bg-card">
                  <div className="flex items-center justify-between border-b px-5 py-4">
                    <h3 className="font-semibold">KYC queue</h3>
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => setSection("kyc")}>Review all</Button>
                  </div>
                  <div className="divide-y">
                    {pending.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 py-8"><CheckCircle2 className="h-8 w-8 text-emerald-500" /><p className="text-sm text-muted-foreground">All caught up!</p></div>
                    ) : pending.slice(0, 5).map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between px-5 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar src={p.profiles?.avatar_url} name={p.profiles?.name ?? "E"} size={32} />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">{p.profiles?.name ?? "Expert"}</div>
                            <div className="text-xs text-muted-foreground">{p.profiles?.city ?? "—"} · {p.experience_years ?? 0}y</div>
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-1.5">
                          <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => verify.mutate({ id: p.id, is_verified: false })}><XCircle className="h-3 w-3" /></Button>
                          <Button size="sm" className="h-7 px-2" onClick={() => verify.mutate({ id: p.id, is_verified: true })}><CheckCircle2 className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {section === "kyc" && (
            <div>
              <SectionHead title="KYC Queue" desc="Review and approve expert verification requests" />

              {/* Tabs */}
              <div className="mb-5 flex gap-1 rounded-xl border bg-muted/40 p-1 w-fit">
                {([
                  { id: "pending", label: "Pending review", count: pendingByStatus.pending.length },
                  { id: "rejected", label: "Rejected", count: pendingByStatus.rejected.length },
                  { id: "all", label: "All unverified", count: pendingByStatus.all.length },
                ] as const).map((t) => (
                  <button key={t.id} onClick={() => { setKycTab(t.id); setKycQ(""); }}
                    className={cn("rounded-lg px-4 py-1.5 text-sm font-medium transition-colors whitespace-nowrap",
                      kycTab === t.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                      t.id === "rejected" && kycTab !== "rejected" && t.count > 0 && "text-red-500",
                    )}>
                    {t.label}
                    {t.count > 0 && (
                      <span className={cn("ml-1.5 rounded-full px-1.5 py-0.5 text-[10px]",
                        t.id === "rejected" ? "bg-red-100 text-red-700" : "bg-muted",
                      )}>{t.count}</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="relative mb-5 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={kycQ} onChange={(e) => setKycQ(e.target.value)} placeholder="Search by name…" className="pl-9" />
              </div>

              {pending.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl border bg-muted/20 py-20">
                  <div className="grid h-14 w-14 place-items-center rounded-full bg-emerald-100"><CheckCircle2 className="h-7 w-7 text-emerald-600" /></div>
                  <p className="font-medium">{kycTab === "rejected" ? "No rejected experts" : "All caught up!"}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pending.map((p: any) => {
                    const isRejected = p.onboarding_status === "REJECTED";
                    return (
                    <div key={p.id} className={cn("flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-5", isRejected && "border-red-200/60 bg-red-50/30")}>
                      <div className="flex min-w-0 items-center gap-4">
                        <Avatar src={p.profiles?.avatar_url} name={p.profiles?.name ?? "E"} size={48} className="rounded-2xl" />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold">{p.profiles?.name ?? "Expert"}</span>
                            {p.profiles?.city && <Badge variant="secondary" className="text-[10px]">{p.profiles.city}</Badge>}
                            {isRejected && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">REJECTED</span>}
                            <span className="text-xs capitalize text-muted-foreground">{(p.gender ?? "").toLowerCase()} · {p.experience_years ?? 0} yrs</span>
                          </div>
                          <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{p.bio || "No bio provided"}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!isRejected && (
                          <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => verify.mutate({ id: p.id, is_verified: false })}>
                            <XCircle className="mr-1.5 h-3.5 w-3.5" /> Reject
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => setDocsExpert({ id: p.id, name: p.profiles?.name ?? "Expert" })}>
                          <BookOpen className="mr-1.5 h-3.5 w-3.5" /> Docs
                        </Button>
                        <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => verify.mutate({ id: p.id, is_verified: true })}>
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> {isRejected ? "Re-approve" : "Approve"}
                        </Button>
                      </div>
                    </div>
                  );
                  })}
                </div>
              )}

              {/* KYC document review dialog */}
              <Dialog open={!!docsExpert} onOpenChange={(o) => !o && setDocsExpert(null)}>
                <DialogContent className="max-w-xl">
                  <DialogHeader>
                    <DialogTitle>Documents — {docsExpert?.name}</DialogTitle>
                  </DialogHeader>
                  {docsLoading ? (
                    <div className="py-8"><LoadingSpinner /></div>
                  ) : (expertDocs as any[]).length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">No documents submitted yet.</p>
                  ) : (
                    <div className="mt-1 space-y-3">
                      {(expertDocs as any[]).map((d) => {
                        const isPdf = /\.pdf($|\?)/i.test(d.file_url ?? "");
                        const statusCls =
                          d.status === "APPROVED" ? "bg-emerald-100 text-emerald-700" :
                          d.status === "REJECTED"  ? "bg-red-100 text-red-700" :
                                                     "bg-amber-100 text-amber-700";
                        return (
                          <div key={d.id} className="overflow-hidden rounded-xl border">
                            {/* Preview */}
                            <div className="relative h-40 w-full bg-muted">
                              {isPdf ? (
                                <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                                  <FileText className="h-10 w-10" />
                                  <span className="text-xs font-medium">PDF document</span>
                                </div>
                              ) : d.file_url ? (
                                <img src={d.file_url} alt={d.type} className="h-full w-full object-contain bg-muted" />
                              ) : (
                                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No file</div>
                              )}
                              {d.file_url && (
                                <a
                                  href={d.file_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-white/90 px-2 py-1 text-[10px] font-medium text-foreground shadow hover:bg-white"
                                >
                                  <ExternalLink className="h-3 w-3" /> View full
                                </a>
                              )}
                            </div>

                            {/* Info + actions */}
                            <div className="flex items-center justify-between gap-3 px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold">{d.type}</span>
                                <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-semibold", statusCls)}>
                                  {d.status}
                                </span>
                              </div>
                              {d.status !== "APPROVED" && (
                                <div className="flex shrink-0 gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 border-red-200 text-red-600 hover:bg-red-50"
                                    disabled={reviewDoc.isPending}
                                    onClick={() => reviewDoc.mutate({ docId: d.id, status: "REJECTED" })}
                                  >
                                    Reject
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="h-7 bg-emerald-600 text-white hover:bg-emerald-700"
                                    disabled={reviewDoc.isPending}
                                    onClick={() => reviewDoc.mutate({ docId: d.id, status: "APPROVED" })}
                                  >
                                    Approve
                                  </Button>
                                </div>
                              )}
                              {d.status === "APPROVED" && (
                                <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Approved
                                </span>
                              )}
                            </div>
                            {d.review_note && (
                              <p className="border-t px-4 py-2 text-xs text-muted-foreground">Note: {d.review_note}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          )}

          {section === "experts" && (
            <div>
              <SectionHead title="Experts" desc={`${experts.length} household experts`} />
              <div className="mb-5 flex flex-wrap gap-3">
                <div className="relative min-w-52 flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={expQ} onChange={(e) => setExpQ(e.target.value)} placeholder="Search by name…" className="pl-9" />
                </div>
                <Select value={expStatus} onValueChange={setExpStatus}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="ONLINE">Online</SelectItem>
                    <SelectItem value="OFFLINE">Offline</SelectItem>
                    <SelectItem value="BUSY">Busy</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={expVerified} onValueChange={setExpVerified}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="Verified" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="true">Verified</SelectItem>
                    <SelectItem value="false">Unverified</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {expLoading ? <div className="flex h-40 items-center justify-center"><LoadingSpinner /></div> : (
                <div className="overflow-hidden rounded-2xl border bg-card">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30 text-xs font-medium text-muted-foreground">
                      <tr>
                        <th className="px-5 py-3.5 text-left">Expert</th>
                        <th className="px-5 py-3.5 text-left">City</th>
                        <th className="px-5 py-3.5 text-left">Jobs</th>
                        <th className="px-5 py-3.5 text-left">Rating</th>
                        <th className="px-5 py-3.5 text-left">Status</th>
                        <th className="px-5 py-3.5 text-left">Verified</th>
                        <th className="px-5 py-3.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {experts.length === 0 ? <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">No experts match</td></tr> :
                        experts.map((e: any) => (
                          <tr key={e.id} className="cursor-pointer border-t hover:bg-muted/20" onClick={() => setDetailExpertId(e.id)}>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                <Avatar src={e.avatar_url} name={e.name ?? "E"} size={32} />
                                <div className="font-medium">{e.name ?? "Expert"}</div>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-muted-foreground">{e.city ?? "—"}</td>
                            <td className="px-5 py-3">{e.total_jobs ?? 0}</td>
                            <td className="px-5 py-3"><div className="flex items-center gap-1"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{Number(e.avg_rating).toFixed(1)} <span className="text-xs text-muted-foreground">({e.review_count})</span></div></td>
                            <td className="px-5 py-3"><div className="flex items-center gap-1.5"><StatusDot status={e.status} /><span className="text-xs capitalize">{(e.status ?? "offline").toLowerCase()}</span></div></td>
                            <td className="px-5 py-3">{e.is_verified ? <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" />Verified</span> : <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600"><AlertCircle className="h-3.5 w-3.5" />Pending</span>}</td>
                            <td className="px-5 py-3 text-right" onClick={(ev) => ev.stopPropagation()}><Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => verify.mutate({ id: e.id, is_verified: !e.is_verified })}>{e.is_verified ? "Revoke" : "Approve"}</Button></td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
              <Pager page={expPage} onPage={setExpPage} count={experts.length} />
            </div>
          )}

          {section === "bookings" && (
            <div>
              <SectionHead title="All Bookings" desc="Complete platform booking history"
                action={<Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["admin-bookings"] })}><RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh</Button>} />
              {/* Status filter */}
              {(() => {
                const BK_FILTERS = ["ALL","SEARCHING","ASSIGNED","ACCEPTED","ON_THE_WAY","ARRIVED","IN_PROGRESS","COMPLETED","CANCELLED"] as const;
                const bkFiltered = bkStatusFilter === "ALL" ? (allBookings as any[]) : (allBookings as any[]).filter((b: any) => b.status === bkStatusFilter);
                const bkCounts = BK_FILTERS.reduce((acc, f) => {
                  acc[f] = f === "ALL" ? (allBookings as any[]).length : (allBookings as any[]).filter((b: any) => b.status === f).length;
                  return acc;
                }, {} as Record<string, number>);
                return (
                  <>
                    <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl border bg-muted/40 p-1">
                      {BK_FILTERS.map((f) => (
                        <button key={f} onClick={() => setBkStatusFilter(f)}
                          className={cn("flex-shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors", bkStatusFilter === f ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                          {f === "ALL" ? "All" : f.replace("_", " ")}
                          {bkCounts[f] > 0 && <span className="ml-1 rounded-full bg-muted px-1 text-[9px]">{bkCounts[f]}</span>}
                        </button>
                      ))}
                    </div>
                    {bookingsLoading ? <div className="flex h-40 items-center justify-center"><LoadingSpinner /></div> : (
                      <div className="overflow-hidden rounded-2xl border bg-card">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/30 text-xs font-medium text-muted-foreground">
                            <tr>
                              <th className="px-5 py-3.5 text-left">Service</th>
                              <th className="px-5 py-3.5 text-left">Customer</th>
                              <th className="px-5 py-3.5 text-left">Expert</th>
                              <th className="px-5 py-3.5 text-left">Status</th>
                              <th className="px-5 py-3.5 text-right">Amount</th>
                              <th className="px-5 py-3.5 text-center">Track</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bkFiltered.length === 0 ? <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">No bookings yet</td></tr> :
                              bkFiltered.map((b: any) => (
                                <tr key={b.id} className="cursor-pointer border-t hover:bg-muted/20" onClick={() => setDetailBookingId(b.id)}>
                                  <td className="px-5 py-3 font-medium">{b.service_name ?? "Service"}</td>
                                  <td className="px-5 py-3 text-muted-foreground">{b.customer_name ?? "—"}</td>
                                  <td className="px-5 py-3 text-muted-foreground">{b.expert_name ?? "—"}</td>
                                  <td className="px-5 py-3"><span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-semibold", STATUS_PILL[b.status] ?? "")}>{b.status}</span></td>
                                  <td className="px-5 py-3 text-right font-semibold">₹{Number(b.total_amount).toLocaleString("en-IN")}</td>
                                  <td className="px-5 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                    <a href={`/track/${b.id}`} target="_blank" rel="noreferrer"
                                      className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10 transition-colors">
                                      <MapPin className="h-3 w-3" /> Track
                                    </a>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <Pager page={bkPage} onPage={setBkPage} count={(bkStatusFilter === "ALL" ? allBookings as any[] : (allBookings as any[]).filter((b: any) => b.status === bkStatusFilter)).length} />
                  </>
                );
              })()}
            </div>
          )}

          {section === "users" && (
            <div>
              <SectionHead title="Users" desc={`${users.length} accounts`} />
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="relative max-w-xs flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={userQ} onChange={(e) => setUserQ(e.target.value)} placeholder="Search by name or email…" className="pl-9" />
                </div>
                <div className="flex gap-1 rounded-xl border bg-muted/40 p-1">
                  {(["ALL", "CUSTOMER", "EXPERT", "ADMIN", "BLOCKED"] as const).map((f) => (
                    <button key={f} onClick={() => setUserRoleFilter(f)}
                      className={cn("rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
                        userRoleFilter === f ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                      {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>
              {usersLoading ? <div className="flex h-40 items-center justify-center"><LoadingSpinner /></div> : (
                <div className="overflow-hidden rounded-2xl border bg-card">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30 text-xs font-medium text-muted-foreground">
                      <tr><th className="px-5 py-3.5 text-left">User</th><th className="px-5 py-3.5 text-left">Role</th><th className="px-5 py-3.5 text-left">City</th><th className="px-5 py-3.5 text-left">Phone</th><th className="px-5 py-3.5 text-right"></th></tr>
                    </thead>
                    <tbody>
                      {users.length === 0 ? <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">No users</td></tr> :
                        users.map((u: any) => (
                          <tr key={u.id} className="cursor-pointer border-t hover:bg-muted/20" onClick={() => setDetailUserId(u.id)}>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                <Avatar src={u.avatar_url} name={u.name ?? u.email ?? "?"} size={32} />
                                <div>
                                  <div className="flex items-center gap-1.5 font-medium">{u.name ?? "—"}
                                    {u.is_blocked && <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-semibold text-red-700">BLOCKED</span>}
                                  </div>
                                  <div className="text-xs text-muted-foreground">{u.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3"><span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-semibold", ROLE_PILL[u.role] ?? "bg-slate-100 text-slate-600")}>{u.role}</span></td>
                            <td className="px-5 py-3 text-muted-foreground">{u.city ?? "—"}</td>
                            <td className="px-5 py-3 text-muted-foreground">{u.phone ?? "—"}</td>
                            <td className="px-5 py-3 text-right text-xs text-primary">View</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
              <Pager page={userPage} onPage={setUserPage} count={users.length} />

              {/* User detail dialog — profile, history, CRUD */}
              <Dialog open={!!detailUserId} onOpenChange={(o) => !o && setDetailUserId(null)}>
                <DialogContent className="max-h-[85vh] max-w-lg overflow-auto">
                  <DialogHeader><DialogTitle>User details</DialogTitle></DialogHeader>
                  {detailLoading || !userDetail ? <LoadingSpinner /> : (
                    <div className="space-y-4 text-sm">
                      <div className="flex items-center gap-3">
                        <Avatar src={userDetail.profile?.avatar_url} name={userDetail.profile?.name ?? userDetail.email} size={48} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 font-semibold">{userDetail.profile?.name ?? "—"}
                            {userDetail.is_blocked && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">BLOCKED</span>}
                          </div>
                          <div className="text-xs text-muted-foreground">{userDetail.email} · {(userDetail.roles ?? []).join(", ")}</div>
                        </div>
                      </div>

                      {/* Lifetime stats */}
                      <div className="grid grid-cols-4 gap-2 text-center">
                        {[
                          { k: "Bookings", v: userDetail.stats?.bookings_made ?? 0 },
                          { k: "Jobs", v: userDetail.stats?.jobs_done ?? 0 },
                          { k: "Spent", v: `₹${userDetail.stats?.total_spent ?? 0}` },
                          { k: "Reviews", v: userDetail.stats?.reviews_written ?? 0 },
                        ].map((s) => (
                          <div key={s.k} className="rounded-lg border p-2"><div className="text-sm font-bold">{s.v}</div><div className="text-[10px] uppercase text-muted-foreground">{s.k}</div></div>
                        ))}
                      </div>

                      {/* Editable profile */}
                      <div className="space-y-2 rounded-xl border p-3">
                        <div className="text-[10px] font-semibold uppercase text-muted-foreground">Edit profile</div>
                        <div className="grid grid-cols-2 gap-2">
                          <Input className="h-8" value={editUser.name} onChange={(e) => setEditUser({ ...editUser, name: e.target.value })} placeholder="Name" />
                          <Input className="h-8" value={editUser.phone} onChange={(e) => setEditUser({ ...editUser, phone: e.target.value })} placeholder="Phone" />
                          <Input className="h-8" value={editUser.city} onChange={(e) => setEditUser({ ...editUser, city: e.target.value })} placeholder="City" />
                          <Button size="sm" className="h-8" onClick={() => saveUser.mutate(editUser)} disabled={saveUser.isPending}>Save</Button>
                        </div>
                      </div>

                      {userDetail.expert && (
                        <div className="rounded-xl border p-3">
                          <div className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">Expert profile</div>
                          <div className="text-xs">⭐ {Number(userDetail.expert.avg_rating ?? 0).toFixed(1)} · {userDetail.expert.total_jobs ?? 0} jobs · {userDetail.expert.is_verified ? "Verified" : "Unverified"} · {userDetail.expert.status}</div>
                          {userDetail.expert.bio && <p className="mt-1 text-xs text-muted-foreground">{userDetail.expert.bio}</p>}
                        </div>
                      )}

                      {/* Expert earnings ledger */}
                      {userDetail.expert && (
                        <div>
                          <div className="mb-1.5 text-[10px] font-semibold uppercase text-muted-foreground">Earnings ({(earnings as any[]).length})</div>
                          {(earnings as any[]).length === 0 ? <p className="text-xs text-muted-foreground">No completed jobs yet.</p> : (
                            <div className="max-h-40 space-y-1 overflow-auto">
                              {(earnings as any[]).map((e) => (
                                <div key={e.id} className="flex items-center justify-between rounded-lg border px-3 py-1.5 text-xs">
                                  <span>{e.service_name ?? "Service"} <span className="text-muted-foreground">· {e.customer_name ?? "—"}</span></span>
                                  <span className="font-semibold text-emerald-600">+₹{Number(e.expert_amount).toLocaleString("en-IN")}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Booking history */}
                      <div>
                        <div className="mb-1.5 text-[10px] font-semibold uppercase text-muted-foreground">Recent activity ({(userDetail.bookings ?? []).length})</div>
                        {(userDetail.bookings ?? []).length === 0 ? <p className="text-xs text-muted-foreground">No bookings yet.</p> : (
                          <div className="max-h-40 space-y-1 overflow-auto">
                            {userDetail.bookings.map((b: any) => (
                              <div key={b.id} className="flex items-center justify-between rounded-lg border px-3 py-1.5 text-xs">
                                <span>{b.service_name} <span className="text-muted-foreground">· as {b.as_role}</span></span>
                                <span className="flex items-center gap-2"><span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_PILL[b.status] ?? "bg-slate-100")}>{b.status}</span> ₹{b.total_amount}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* One-time temp password reveal */}
                      {tempPassword && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                          <div className="text-[10px] font-semibold uppercase text-amber-700">Temporary password — copy now, shown once</div>
                          <div className="mt-1 flex items-center justify-between gap-2">
                            <code className="font-mono text-sm font-bold tracking-wide text-amber-900">{tempPassword}</code>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { navigator.clipboard?.writeText(tempPassword); toast.success("Copied"); }}>Copy</Button>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between border-t pt-3">
                        <span className="text-[11px] text-muted-foreground">Joined {userDetail.created_at ? new Date(userDetail.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}</span>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="h-8 text-xs"
                            onClick={() => { if (confirm("Generate a new temporary password for this user?")) resetPassword.mutate(); }} disabled={resetPassword.isPending}>
                            <KeyRound className="mr-1 h-3.5 w-3.5" /> Reset password
                          </Button>
                          <Button size="sm" variant="outline" className={cn("h-8 text-xs", userDetail.is_blocked ? "text-emerald-600" : "text-amber-600")}
                            onClick={() => saveUser.mutate({ is_blocked: !userDetail.is_blocked })} disabled={saveUser.isPending}>
                            {userDetail.is_blocked ? "Unblock" : "Block"}
                          </Button>
                          {isSuperAdmin && !(userDetail.roles ?? []).includes("SUPER_ADMIN") && (
                            <Button size="sm" variant="outline" className="h-8 border-red-200 text-xs text-red-600 hover:bg-red-50"
                              onClick={() => { if (confirm("Permanently delete this user and all their data?")) deleteUser.mutate(); }} disabled={deleteUser.isPending}>
                              Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          )}

          {section === "services" && (
            <div>
              <SectionHead title="Services" desc="Manage household services, pricing, and platform fee per service"
                action={
                  <Button size="sm" onClick={() => { setEditSvcId(null); setSvcForm(BLANK_SVC); setSvcOpen(true); }}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Service
                  </Button>
                } />
              <Dialog open={svcOpen} onOpenChange={(v) => { setSvcOpen(v); if (!v) { setEditSvcId(null); setSvcForm(BLANK_SVC); } }}>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle>{editSvcId ? "Edit Service" : "New Service"}</DialogTitle></DialogHeader>
                  <div className="mt-2 space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2"><Label>Name *</Label><Input value={svcForm.name} onChange={(e) => { const n = e.target.value; setSvcForm((f) => ({ ...f, name: n, slug: editSvcId ? f.slug : n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") })); }} placeholder="e.g. Pet Care" className="mt-1" /></div>
                      <div className="col-span-2"><Label>Slug *</Label><Input value={svcForm.slug} onChange={(e) => setSvcForm({ ...svcForm, slug: e.target.value })} placeholder="pet-care" className="mt-1 font-mono text-sm" /></div>
                      <div className="col-span-2"><Label>Tagline</Label><Input value={svcForm.tagline} onChange={(e) => setSvcForm({ ...svcForm, tagline: e.target.value })} className="mt-1" /></div>
                      <div className="col-span-2"><Label>Description</Label><Textarea value={svcForm.description} onChange={(e) => setSvcForm({ ...svcForm, description: e.target.value })} rows={2} className="mt-1" /></div>
                      {/* Service image */}
                      <div className="col-span-2">
                        <Label>Service image</Label>
                        <div className="mt-1 flex items-start gap-3">
                          {svcForm.image_url ? (
                            <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-lg border bg-muted">
                              <img src={svcForm.image_url} alt="service" className="h-full w-full object-cover" />
                              <button type="button" onClick={() => setSvcForm({ ...svcForm, image_url: "" })}
                                className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80">
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex h-20 w-32 shrink-0 items-center justify-center rounded-lg border border-dashed bg-muted/30 text-xs text-muted-foreground">
                              <ImageIcon className="h-6 w-6 opacity-40" />
                            </div>
                          )}
                          <div className="flex flex-col gap-1.5">
                            <label className={cn("inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:bg-muted", svcImageUploading && "pointer-events-none opacity-60")}>
                              {svcImageUploading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…</> : <><Upload className="h-3.5 w-3.5" /> Upload image</>}
                              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={svcImageUploading}
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  setSvcImageUploading(true);
                                  try {
                                    const { file_url } = await uploadFile<{ file_url: string }>(file, { folder: "services" });
                                    setSvcForm((f) => ({ ...f, image_url: file_url }));
                                    toast.success("Image uploaded");
                                  } catch (err: any) {
                                    toast.error(err.message ?? "Upload failed");
                                  } finally {
                                    setSvcImageUploading(false);
                                    e.currentTarget.value = "";
                                  }
                                }}
                              />
                            </label>
                            {svcForm.image_url && (
                              <Input className="h-7 text-xs" value={svcForm.image_url} onChange={(e) => setSvcForm({ ...svcForm, image_url: e.target.value })} placeholder="or paste image URL" />
                            )}
                            {!svcForm.image_url && (
                              <Input className="h-7 text-xs" placeholder="or paste image URL" onChange={(e) => setSvcForm({ ...svcForm, image_url: e.target.value })} />
                            )}
                            <p className="text-[10px] text-muted-foreground">JPG, PNG or WEBP · shown on home page cards</p>
                          </div>
                        </div>
                      </div>
                      <div><Label>Rate/hr (₹) *</Label><Input type="number" min={0} value={svcForm.rate_per_hour} onChange={(e) => setSvcForm({ ...svcForm, rate_per_hour: e.target.value })} className="mt-1" /></div>
                      <div><Label>Min hours</Label><Input type="number" min={0.5} step={0.5} value={svcForm.min_hours} onChange={(e) => setSvcForm({ ...svcForm, min_hours: e.target.value })} className="mt-1" /></div>
                      <div><Label>Platform fee %</Label><Input type="number" min={0} max={100} value={svcForm.platform_fee_pct} onChange={(e) => setSvcForm({ ...svcForm, platform_fee_pct: e.target.value })} className="mt-1" /></div>
                      <div><Label>Sort order</Label><Input type="number" min={0} value={svcForm.sort_order} onChange={(e) => setSvcForm({ ...svcForm, sort_order: e.target.value })} className="mt-1" /></div>
                      <div><Label>Icon name</Label>
                        <Select value={svcForm.icon_name} onValueChange={(v) => setSvcForm({ ...svcForm, icon_name: v })}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>{["Sparkles","Utensils","CookingPot","ShowerHead","Shirt","ChefHat","Brush","WashingMachine","Home","Star","Wrench","Package"].map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2 pt-6">
                        <input type="checkbox" id="svc-active" checked={svcForm.is_active} onChange={(e) => setSvcForm({ ...svcForm, is_active: e.target.checked })} className="h-4 w-4 accent-primary" />
                        <Label htmlFor="svc-active">Active (visible to customers)</Label>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button className="flex-1" disabled={createService.isPending || updateService.isPending} onClick={() => {
                        if (!svcForm.name || !svcForm.slug || !svcForm.rate_per_hour) { toast.error("Name, slug and rate are required"); return; }
                        const payload = {
                          name: svcForm.name, slug: svcForm.slug, tagline: svcForm.tagline || undefined,
                          description: svcForm.description || undefined, image_url: svcForm.image_url || undefined,
                          rate_per_hour: Number(svcForm.rate_per_hour),
                          min_hours: Number(svcForm.min_hours), platform_fee_pct: Number(svcForm.platform_fee_pct),
                          icon_name: svcForm.icon_name, sort_order: Number(svcForm.sort_order), is_active: svcForm.is_active,
                        };
                        if (editSvcId) updateService.mutate({ id: editSvcId, ...payload });
                        else createService.mutate(payload);
                      }}>{createService.isPending || updateService.isPending ? "Saving…" : editSvcId ? "Save changes" : "Create Service"}</Button>
                      <Button variant="outline" onClick={() => { setSvcOpen(false); setEditSvcId(null); setSvcForm(BLANK_SVC); }}>Cancel</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {servicesLoading ? <div className="py-12 text-center"><LoadingSpinner /></div> : (
                <div className="overflow-hidden rounded-2xl border bg-card">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30 text-xs font-medium text-muted-foreground">
                      <tr>
                        <th className="px-3 py-3.5 text-left w-16">Image</th>
                        <th className="px-5 py-3.5 text-left">Service</th>
                        <th className="px-5 py-3.5 text-left">Rate/hr</th>
                        <th className="px-5 py-3.5 text-left">Min hrs</th>
                        <th className="px-5 py-3.5 text-left">Platform fee</th>
                        <th className="px-5 py-3.5 text-left">Status</th>
                        <th className="px-5 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(allServices as any[]).length === 0 ? <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">No services yet</td></tr> :
                        (allServices as any[]).map((s: any) => (
                          <tr key={s.id} className="border-t hover:bg-muted/20">
                            <td className="px-3 py-3">
                              {s.image_url ? (
                                <img src={s.image_url} alt={s.name} className="h-10 w-14 rounded-lg object-cover border" />
                              ) : (
                                <div className="flex h-10 w-14 items-center justify-center rounded-lg border bg-muted/40"><ImageIcon className="h-4 w-4 text-muted-foreground/40" /></div>
                              )}
                            </td>
                            <td className="px-5 py-3">
                              <div className="font-medium">{s.name}</div>
                              <div className="text-xs text-muted-foreground">{s.slug}</div>
                              {s.tagline && <div className="text-xs text-muted-foreground italic">{s.tagline}</div>}
                            </td>
                            <td className="px-5 py-3 font-semibold">₹{Number(s.rate_per_hour).toLocaleString("en-IN")}</td>
                            <td className="px-5 py-3">{Number(s.min_hours)} hr{Number(s.min_hours) !== 1 ? "s" : ""}</td>
                            <td className="px-5 py-3">
                              <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700 ring-1 ring-violet-200">
                                {Number(s.platform_fee_pct ?? 15)}%
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              <button onClick={() => toggleService.mutate({ id: s.id, is_active: !s.is_active })} className={cn("inline-flex items-center gap-1 text-xs font-medium", s.is_active ? "text-emerald-600" : "text-muted-foreground")}>
                                <Circle className={cn("h-2 w-2", s.is_active ? "fill-emerald-500 text-emerald-500" : "fill-slate-300 text-slate-300")} />
                                {s.is_active ? "Active" : "Disabled"}
                              </button>
                            </td>
                            <td className="px-5 py-3 text-right">
                              <div className="inline-flex gap-1">
                                <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => {
                                  setEditSvcId(s.id);
                                  setSvcForm({ name: s.name, slug: s.slug, tagline: s.tagline ?? "", description: s.description ?? "", image_url: s.image_url ?? "", rate_per_hour: String(s.rate_per_hour), min_hours: String(s.min_hours), platform_fee_pct: String(s.platform_fee_pct ?? 15), icon_name: s.icon_name ?? "Sparkles", sort_order: String(s.sort_order ?? 0), is_active: Boolean(s.is_active) });
                                  setSvcOpen(true);
                                }}><Pencil className="h-3.5 w-3.5" /></Button>
                                {isAdmin && (
                                  <Button size="sm" variant="outline" className="h-7 px-2 border-red-200 text-red-600 hover:bg-red-50" disabled={deleteService.isPending}
                                    onClick={() => { if (confirm(`Delete "${s.name}"? This cannot be undone.`)) deleteService.mutate(s.id); }}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {section === "coupons" && (
            <div>
              <SectionHead title="Coupons" desc="Discount codes and promotions"
                action={
                  <Dialog open={couponOpen} onOpenChange={setCouponOpen}>
                    <DialogTrigger asChild><Button size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" /> New Coupon</Button></DialogTrigger>
                    <DialogContent className="max-w-sm">
                      <DialogHeader><DialogTitle>Create Coupon</DialogTitle></DialogHeader>
                      <div className="mt-2 space-y-3">
                        <div><Label>Code</Label><Input value={couponForm.code} onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })} placeholder="SAVE20" className="mt-1 font-mono tracking-widest" /></div>
                        <div className="grid grid-cols-2 gap-3">
                          <div><Label>Type</Label>
                            <Select value={couponForm.type} onValueChange={(v) => setCouponForm({ ...couponForm, type: v })}>
                              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                              <SelectContent><SelectItem value="FLAT">Flat (₹)</SelectItem><SelectItem value="PERCENT">Percent (%)</SelectItem></SelectContent>
                            </Select>
                          </div>
                          <div><Label>Value</Label><Input type="number" value={couponForm.value} onChange={(e) => setCouponForm({ ...couponForm, value: e.target.value })} className="mt-1" /></div>
                        </div>
                        <div><Label>Max uses (optional)</Label><Input type="number" value={couponForm.max_uses} onChange={(e) => setCouponForm({ ...couponForm, max_uses: e.target.value })} className="mt-1" /></div>
                        <Button className="mt-2 w-full" disabled={createCoupon.isPending} onClick={() => {
                          if (!couponForm.code || !couponForm.value) { toast.error("Code and value are required"); return; }
                          createCoupon.mutate({ code: couponForm.code, type: couponForm.type, value: Number(couponForm.value), max_uses: couponForm.max_uses ? Number(couponForm.max_uses) : undefined });
                        }}>{createCoupon.isPending ? "Creating…" : "Create Coupon"}</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                } />
              {(data?.coupons ?? []).length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-2xl border bg-muted/20 py-16"><Ticket className="h-8 w-8 text-muted-foreground" /><p className="text-sm text-muted-foreground">No coupons yet.</p></div>
              ) : (
                <div className="overflow-hidden rounded-2xl border bg-card">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30 text-xs font-medium text-muted-foreground">
                      <tr><th className="px-5 py-3.5 text-left">Code</th><th className="px-5 py-3.5 text-left">Discount</th><th className="px-5 py-3.5 text-left">Usage</th><th className="px-5 py-3.5 text-left">Status</th><th className="px-5 py-3.5 text-right">Action</th></tr>
                    </thead>
                    <tbody>
                      {data!.coupons.map((c: any) => (
                        <tr key={c.id} className="border-t hover:bg-muted/20">
                          <td className="px-5 py-3 font-mono text-xs font-semibold tracking-widest">{c.code}</td>
                          <td className="px-5 py-3 font-semibold">{c.type === "PERCENT" ? `${c.value}% off` : `₹${Number(c.value).toLocaleString("en-IN")} off`}</td>
                          <td className="px-5 py-3 text-muted-foreground">{c.used_count}{c.max_uses ? ` / ${c.max_uses}` : ""}</td>
                          <td className="px-5 py-3">{c.is_active ? <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600"><Circle className="h-2 w-2 fill-emerald-500 text-emerald-500" />Active</span> : <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground"><Circle className="h-2 w-2 fill-slate-300 text-slate-300" />Inactive</span>}</td>
                          <td className="px-5 py-3 text-right"><Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => toggleCoupon.mutate({ id: c.id, is_active: !c.is_active })}>{c.is_active ? "Disable" : "Enable"}</Button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {section === "settlements" && (
            <div>
              <SectionHead title="Settlements" desc="Expert withdrawal requests"
                action={<Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["admin-withdrawals"] })}><RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh</Button>} />
              {wdLoading ? <div className="flex h-40 items-center justify-center"><LoadingSpinner /></div> : (withdrawals as any[]).length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-2xl border bg-muted/20 py-16"><Wallet className="h-8 w-8 text-muted-foreground" /><p className="text-sm text-muted-foreground">No withdrawal requests.</p></div>
              ) : (
                <div className="overflow-hidden rounded-2xl border bg-card">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30 text-xs font-medium text-muted-foreground">
                      <tr><th className="px-5 py-3.5 text-left">Expert</th><th className="px-5 py-3.5 text-left">Amount</th><th className="px-5 py-3.5 text-left">Bank</th><th className="px-5 py-3.5 text-left">Status</th><th className="px-5 py-3.5 text-right">Action</th></tr>
                    </thead>
                    <tbody>
                      {(withdrawals as any[]).map((w) => (
                        <tr key={w.id} className="border-t hover:bg-muted/20">
                          <td className="px-5 py-3 font-medium">{w.expert_name ?? w.expert_id}</td>
                          <td className="px-5 py-3 font-semibold">₹{Number(w.amount).toLocaleString("en-IN")}</td>
                          <td className="px-5 py-3 text-xs text-muted-foreground">{w.bank_account ?? "—"}{w.bank_ifsc ? ` · ${w.bank_ifsc}` : ""}</td>
                          <td className="px-5 py-3"><span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-semibold", STATUS_PILL[w.status] ?? "bg-slate-100 text-slate-600")}>{w.status}</span></td>
                          <td className="px-5 py-3 text-right">
                            {["REQUESTED", "APPROVED"].includes(w.status) ? (
                              <div className="flex justify-end gap-1.5">
                                <Button size="sm" variant="outline" className="h-7 border-red-200 text-red-600 hover:bg-red-50" onClick={() => actWithdrawal.mutate({ id: w.id, action: "reject" })}>Reject</Button>
                                <Button size="sm" className="h-7 bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => actWithdrawal.mutate({ id: w.id, action: "pay" })}>Mark paid</Button>
                              </div>
                            ) : <span className="text-xs text-muted-foreground">Settled</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {section === "support" && (
            <div>
              {openTicket && ticketThread ? (
                <div className="max-w-2xl">
                  <button onClick={() => setOpenTicket(null)} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> All tickets</button>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div><h2 className="text-xl font-semibold">{ticketThread.subject}</h2><p className="text-xs text-muted-foreground">{ticketThread.user_name}</p></div>
                    <div className="flex gap-1.5">
                      {["IN_PROGRESS", "RESOLVED", "CLOSED"].map((s) => (
                        <Button key={s} size="sm" variant="outline" className="h-7 text-xs" onClick={() => ticketStatus.mutate(s)}>{s.replace("_", " ")}</Button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-5 space-y-3">
                    {(ticketThread.messages ?? []).map((m: any) => (
                      <div key={m.id} className={cn("flex", m.is_staff ? "justify-end" : "justify-start")}>
                        <div className={cn("max-w-[80%] rounded-2xl px-4 py-2.5 text-sm", m.is_staff ? "bg-primary text-primary-foreground" : "bg-muted")}>
                          <div className="mb-0.5 text-[10px] opacity-70">{m.is_staff ? "Support" : m.sender_name ?? "Customer"}</div>
                          {m.body}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 flex gap-2">
                    <Input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply to customer…" onKeyDown={(e) => { if (e.key === "Enter" && reply.trim()) ticketReply.mutate(); }} />
                    <Button disabled={ticketReply.isPending || !reply.trim()} onClick={() => ticketReply.mutate()}><Send className="h-4 w-4" /></Button>
                  </div>
                </div>
              ) : (
                <>
                  <SectionHead title="Support tickets" desc="Customer & expert queries" />
                  {/* Status filter tabs */}
                  {(() => {
                    const allT = tickets as any[];
                    const FILTERS = ["ALL", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
                    const counts = FILTERS.reduce((acc, f) => { acc[f] = f === "ALL" ? allT.length : allT.filter((t) => t.status === f).length; return acc; }, {} as Record<string, number>);
                    const filtered = ticketStatusFilter === "ALL" ? allT : allT.filter((t) => t.status === ticketStatusFilter);
                    return (
                      <>
                        <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl border bg-muted/40 p-1">
                          {FILTERS.map((f) => (
                            <button key={f} onClick={() => setTicketStatusFilter(f)}
                              className={cn("flex-shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors", ticketStatusFilter === f ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                              {f === "IN_PROGRESS" ? "In Progress" : f.charAt(0) + f.slice(1).toLowerCase()}
                              {counts[f] > 0 && <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px]">{counts[f]}</span>}
                            </button>
                          ))}
                        </div>
                        {ticketsLoading ? <div className="flex h-40 items-center justify-center"><LoadingSpinner /></div> : filtered.length === 0 ? (
                          <div className="flex flex-col items-center gap-2 rounded-2xl border bg-muted/20 py-16"><LifeBuoy className="h-8 w-8 text-muted-foreground" /><p className="text-sm text-muted-foreground">No tickets.</p></div>
                        ) : (
                          <div className="space-y-2">
                            {filtered.map((t: any) => (
                              <button key={t.id} onClick={() => setOpenTicket(t.id)} className="flex w-full items-center justify-between rounded-2xl border bg-card p-4 text-left hover:border-primary/40">
                                <div className="min-w-0"><div className="truncate font-medium">{t.subject}</div><div className="text-xs text-muted-foreground">{t.user_name} · {t.message_count} msg</div></div>
                                <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold", STATUS_PILL[t.status] ?? "bg-slate-100 text-slate-600")}>{t.status}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </>
              )}
            </div>
          )}

          {section === "settings" && (
            <div className="space-y-8">

              {/* ── Payment Gateway ──────────────────────────────────── */}
              <div>
                <SectionHead title="Payment Gateway" desc="Switch between Razorpay and Stripe, manage API keys, toggle test/live mode" />
                <div className="rounded-2xl border bg-card p-6 space-y-6">

                  {/* Active gateway + mode selectors */}
                  <div className="flex flex-wrap gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Active Gateway</Label>
                      <div className="flex gap-1 rounded-xl border bg-muted/40 p-1">
                        {(["RAZORPAY", "STRIPE"] as const).map((g) => (
                          <button key={g} onClick={() => setPayCfgGateway(g)}
                            className={cn("rounded-lg px-5 py-1.5 text-sm font-semibold transition-colors",
                              payCfgGateway === g ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                            {g === "RAZORPAY" ? "Razorpay" : "Stripe"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Mode</Label>
                      <div className="flex gap-1 rounded-xl border bg-muted/40 p-1">
                        {(["TEST", "LIVE"] as const).map((m) => (
                          <button key={m} onClick={() => setPayCfgMode(m)}
                            className={cn("rounded-lg px-5 py-1.5 text-sm font-semibold transition-colors",
                              payCfgMode === m
                                ? m === "LIVE" ? "bg-emerald-600 text-white shadow-sm" : "bg-card text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground")}>
                            {m === "TEST" ? "Test" : "Live"}
                          </button>
                        ))}
                      </div>
                    </div>
                    {payCfgMode === "LIVE" && (
                      <div className="flex items-end pb-1">
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Live payments active</span>
                      </div>
                    )}
                  </div>

                  {/* Keys for current gateway */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    {payCfgGateway === "RAZORPAY" ? (
                      <>
                        {(["TEST", "LIVE"] as const).map((m) => (
                          <div key={m} className={cn("space-y-3 rounded-xl border p-4", payCfgMode === m && "border-primary/40 bg-primary/5")}>
                            <div className="flex items-center gap-2">
                              <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Razorpay {m}</span>
                              {payCfgMode === m && <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">ACTIVE</span>}
                            </div>
                            <div className="space-y-2">
                              <Input placeholder={`Key ID (rzp_${m.toLowerCase()}_...)`}
                                value={payCfgFields[`razorpay_${m.toLowerCase()}_key_id`] ?? ""}
                                onChange={(e) => setPayCfgFields(p => ({ ...p, [`razorpay_${m.toLowerCase()}_key_id`]: e.target.value }))} />
                              <Input placeholder="Key Secret" type="password"
                                value={payCfgFields[`razorpay_${m.toLowerCase()}_key_secret`] ?? ""}
                                onChange={(e) => setPayCfgFields(p => ({ ...p, [`razorpay_${m.toLowerCase()}_key_secret`]: e.target.value }))} />
                            </div>
                          </div>
                        ))}
                      </>
                    ) : (
                      <>
                        {(["TEST", "LIVE"] as const).map((m) => (
                          <div key={m} className={cn("space-y-3 rounded-xl border p-4", payCfgMode === m && "border-primary/40 bg-primary/5")}>
                            <div className="flex items-center gap-2">
                              <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Stripe {m}</span>
                              {payCfgMode === m && <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">ACTIVE</span>}
                            </div>
                            <div className="space-y-2">
                              <Input placeholder={`Publishable Key (pk_${m.toLowerCase()}_...)`}
                                value={payCfgFields[`stripe_${m.toLowerCase()}_publishable_key`] ?? ""}
                                onChange={(e) => setPayCfgFields(p => ({ ...p, [`stripe_${m.toLowerCase()}_publishable_key`]: e.target.value }))} />
                              <Input placeholder="Secret Key (sk_...)" type="password"
                                value={payCfgFields[`stripe_${m.toLowerCase()}_secret_key`] ?? ""}
                                onChange={(e) => setPayCfgFields(p => ({ ...p, [`stripe_${m.toLowerCase()}_secret_key`]: e.target.value }))} />
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <Button onClick={() => savePayConfig.mutate({ ...payCfgFields, payment_gateway: payCfgGateway, payment_mode: payCfgMode })}
                      disabled={savePayConfig.isPending}>
                      {savePayConfig.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                      Save gateway settings
                    </Button>
                    <span className="text-xs text-muted-foreground">Changes take effect immediately — no restart needed.</span>
                  </div>
                </div>
              </div>

              <div>
                <SectionHead title="Platform settings" desc="Configuration & CMS" />
                {settingsLoading ? <div className="flex h-32 items-center justify-center"><LoadingSpinner /></div> : (
                  <div className="overflow-hidden rounded-2xl border bg-card">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/30 text-xs font-medium text-muted-foreground"><tr><th className="px-5 py-3 text-left">Key</th><th className="px-5 py-3 text-left">Value</th><th className="px-5 py-3 text-left">Public</th><th className="px-5 py-3 text-right">Save</th></tr></thead>
                      <tbody>
                        {(settings as any[]).map((s) => (
                          <tr key={s.setting_key} className="border-t">
                            <td className="px-5 py-3 font-mono text-xs">{s.setting_key}</td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                {(s.setting_key === "global_theme_background" || s.setting_key === "global_theme_glass_bg" || s.setting_key === "global_primary_color") && (
                                  <input 
                                    type="color" 
                                    className="h-8 w-10 cursor-pointer rounded border border-border bg-background p-0.5"
                                    value={settingEdits[s.setting_key] ?? s.setting_value}
                                    onChange={(e) => setSettingEdits({ ...settingEdits, [s.setting_key]: e.target.value })}
                                  />
                                )}
                                <Input className="h-8" value={settingEdits[s.setting_key] ?? s.setting_value} onChange={(e) => setSettingEdits({ ...settingEdits, [s.setting_key]: e.target.value })} />
                              </div>
                            </td>
                            <td className="px-5 py-3">{s.is_public ? "Yes" : "No"}</td>
                            <td className="px-5 py-3 text-right"><Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => saveSetting.mutate({ key: s.setting_key, value: settingEdits[s.setting_key] ?? s.setting_value, is_public: Boolean(s.is_public) })}>Save</Button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div>
                <SectionHead title="Cities" desc="Where the platform operates" />
                <div className="mb-3 flex gap-2"><Input className="max-w-xs" value={newCity} onChange={(e) => setNewCity(e.target.value)} placeholder="Add a city…" /><Button onClick={() => newCity.trim() && addCity.mutate(newCity.trim())}><Plus className="mr-1 h-4 w-4" /> Add</Button></div>
                <div className="flex flex-wrap gap-2">
                  {(cities as any[]).map((c) => (
                    <button key={c.id} onClick={() => toggleCity.mutate({ id: c.id, is_active: !c.is_active })}
                      className={cn("rounded-full border px-3 py-1.5 text-sm font-medium transition-colors", c.is_active ? "border-primary/40 bg-primary/5 text-primary" : "border-border text-muted-foreground line-through")}>
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <SectionHead title="Homepage banners" desc="Shown on the landing page" />
                <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
                  <Input value={banner.title} onChange={(e) => setBanner({ ...banner, title: e.target.value })} placeholder="Title" />
                  <Input value={banner.image_url} onChange={(e) => setBanner({ ...banner, image_url: e.target.value })} placeholder="Image URL" />
                  <Button onClick={() => { if (!banner.title || !banner.image_url) { toast.error("Title and image URL required"); return; } createBanner.mutate(); }}><Plus className="mr-1 h-4 w-4" /> Add</Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(banners as any[]).map((b) => (
                    <div key={b.id} className="flex items-center gap-3 rounded-xl border bg-card p-2">
                      <img src={b.image_url} alt="" className="h-12 w-16 rounded-lg object-cover" />
                      <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{b.title}</div></div>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toggleBanner.mutate({ id: b.id, is_active: !b.is_active })}>{b.is_active ? "Hide" : "Show"}</Button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <SectionHead title="CMS pages" desc="Terms, privacy & more" />
                <div className="flex gap-1">
                  {["terms", "privacy"].map((s) => (
                    <button key={s} onClick={() => setPageSlug(s)} className={cn("rounded-lg border px-3 py-1.5 text-xs font-medium capitalize", pageSlug === s ? "border-primary bg-primary/5 text-primary" : "border-border")}>{s}</button>
                  ))}
                </div>
                <div className="mt-3 space-y-2 rounded-2xl border bg-card p-4">
                  <Input value={pageForm.title} onChange={(e) => setPageForm({ ...pageForm, title: e.target.value })} placeholder="Page title" />
                  <Textarea rows={6} value={pageForm.body} onChange={(e) => setPageForm({ ...pageForm, body: e.target.value })} placeholder="Page content" />
                  <Button onClick={() => savePage.mutate()} disabled={savePage.isPending}>{savePage.isPending ? "Saving…" : "Save page"}</Button>
                </div>
              </div>
            </div>
          )}

          {section === "admins" && (
            <div>
              <SectionHead title="Admin management" desc="Promote users to admin or revoke access" />
              <div className="mb-4 flex gap-2">
                <Input className="max-w-sm" value={promoteEmail} onChange={(e) => setPromoteEmail(e.target.value)} placeholder="user@email.com" />
                <Button onClick={() => promoteEmail.trim() && promote.mutate({ email: promoteEmail.trim(), role: "ADMIN" })}>
                  <Plus className="mr-1 h-4 w-4" /> Make admin
                </Button>
              </div>
              <div className="overflow-hidden rounded-2xl border bg-card">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 text-xs font-medium text-muted-foreground">
                    <tr><th className="px-5 py-3 text-left">User</th><th className="px-5 py-3 text-left">Role</th><th className="px-5 py-3 text-right">Action</th></tr>
                  </thead>
                  <tbody>
                    {(admins as any[]).map((a) => (
                      <tr key={a.id} className="border-t">
                        <td className="px-5 py-3"><div className="font-medium">{a.name ?? "—"}</div><div className="text-xs text-muted-foreground">{a.email}</div></td>
                        <td className="px-5 py-3"><span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-semibold", a.role === "SUPER_ADMIN" ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700")}>{a.role}</span></td>
                        <td className="px-5 py-3 text-right">
                          {a.id !== user?.id && a.role !== "SUPER_ADMIN" && (
                            <div className="flex justify-end gap-1.5">
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => promote.mutate({ user_id: a.id, role: "CUSTOMER" })}>Revoke</Button>
                              <Button size="sm" className="h-7 text-xs" onClick={() => promote.mutate({ user_id: a.id, role: "SUPER_ADMIN" })}>Make super</Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {section === "audit" && (
            <div>
              <SectionHead title="Audit Log" desc="Sensitive admin actions across the platform"
                action={
                  <div className="flex gap-2">
                    <Select value={auditAction} onValueChange={setAuditAction}>
                      <SelectTrigger className="w-44"><SelectValue placeholder="Action" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All actions</SelectItem>
                        {["USER_BLOCKED","USER_UNBLOCKED","USER_UPDATED","USER_DELETED","PASSWORD_RESET","ROLE_CHANGED","EXPERT_VERIFIED","EXPERT_REJECTED","WITHDRAWAL_PAID","WITHDRAWAL_REJECTED"].map((a) => (
                          <SelectItem key={a} value={a}>{a.replace(/_/g, " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["admin-audit"] })}><RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh</Button>
                  </div>
                } />
              {auditLoading ? <div className="flex h-40 items-center justify-center"><LoadingSpinner /></div> : (auditLogs as any[]).length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-2xl border bg-muted/20 py-16"><ScrollText className="h-8 w-8 text-muted-foreground" /><p className="text-sm text-muted-foreground">No audit entries.</p></div>
              ) : (
                <div className="overflow-hidden rounded-2xl border bg-card">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30 text-xs font-medium text-muted-foreground">
                      <tr><th className="px-5 py-3.5 text-left">When</th><th className="px-5 py-3.5 text-left">Actor</th><th className="px-5 py-3.5 text-left">Action</th><th className="px-5 py-3.5 text-left">Target</th><th className="px-5 py-3.5 text-left">Detail</th></tr>
                    </thead>
                    <tbody>
                      {(auditLogs as any[]).map((l) => (
                        <tr key={l.id} className="border-t hover:bg-muted/20">
                          <td className="px-5 py-3 text-xs text-muted-foreground">{l.created_at ? new Date(l.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                          <td className="px-5 py-3"><div className="text-xs font-medium">{l.actor_email ?? l.actor_id ?? "—"}</div>{l.actor_role && <div className="text-[10px] text-muted-foreground">{l.actor_role}</div>}</td>
                          <td className="px-5 py-3"><span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-slate-700">{l.action}</span></td>
                          <td className="px-5 py-3 text-xs text-muted-foreground">{l.entity_type ? `${l.entity_type}:${l.entity_id ?? "—"}` : "—"}</td>
                          <td className="px-5 py-3 text-xs text-muted-foreground">{l.detail ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {section === "reports" && (
            <div>
              <SectionHead title="Reports" desc="Generate and print platform reports" />

              {/* Controls */}
              <div className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border bg-card p-4">
                <div>
                  <Label className="text-xs">Report type</Label>
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger className="mt-1 w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="revenue">Revenue (daily)</SelectItem>
                      <SelectItem value="bookings">Bookings breakdown</SelectItem>
                      <SelectItem value="experts">Top experts</SelectItem>
                      <SelectItem value="services">Services summary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">From</Label>
                  <Input type="date" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} className="mt-1 w-40" />
                </div>
                <div>
                  <Label className="text-xs">To</Label>
                  <Input type="date" value={reportTo} onChange={(e) => setReportTo(e.target.value)} className="mt-1 w-40" />
                </div>
                <Button onClick={() => { setReportTriggered(true); fetchReport(); }} disabled={reportLoading}>
                  <BarChart2 className="mr-1.5 h-4 w-4" /> {reportLoading ? "Loading…" : "Generate"}
                </Button>
                {reportData && (
                  <Button variant="outline" onClick={() => window.print()}>
                    <FileText className="mr-1.5 h-4 w-4" /> Print report
                  </Button>
                )}
              </div>

              {/* Print styles */}
              <style>{`@media print { .no-print { display: none !important; } }`}</style>

              {reportLoading && <div className="flex h-40 items-center justify-center"><LoadingSpinner /></div>}

              {!reportLoading && reportTriggered && reportData && (
                <div id="report-print-area">
                  <div className="mb-4 text-xs text-muted-foreground">
                    Report: <strong>{reportData.type}</strong> · {new Date(reportData.from).toLocaleDateString("en-IN")} – {new Date(reportData.to).toLocaleDateString("en-IN")} · Generated {new Date(reportData.generated_at).toLocaleString("en-IN")}
                  </div>

                  {/* Revenue report */}
                  {reportData.type === "revenue" && (
                    <div className="overflow-hidden rounded-2xl border bg-card">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/30 text-xs font-medium text-muted-foreground">
                          <tr><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-right">Bookings</th><th className="px-4 py-3 text-right">Revenue (₹)</th><th className="px-4 py-3 text-right">Platform fee (₹)</th><th className="px-4 py-3 text-right">Expert payout (₹)</th></tr>
                        </thead>
                        <tbody>
                          {(reportData.data as any[]).length === 0 ? <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">No completed bookings in this period</td></tr> :
                            (reportData.data as any[]).map((r: any) => (
                              <tr key={r.date} className="border-t hover:bg-muted/20">
                                <td className="px-4 py-3">{new Date(r.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                                <td className="px-4 py-3 text-right">{r.bookings}</td>
                                <td className="px-4 py-3 text-right font-semibold">₹{Number(r.revenue).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                <td className="px-4 py-3 text-right text-violet-700">₹{Number(r.platform_fee).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                <td className="px-4 py-3 text-right">₹{Number(r.expert_payout).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                              </tr>
                            ))}
                        </tbody>
                        {(reportData.data as any[]).length > 0 && (
                          <tfoot className="border-t bg-muted/20 font-semibold text-sm">
                            <tr>
                              <td className="px-4 py-3">Total</td>
                              <td className="px-4 py-3 text-right">{(reportData.data as any[]).reduce((s: number, r: any) => s + r.bookings, 0)}</td>
                              <td className="px-4 py-3 text-right">₹{(reportData.data as any[]).reduce((s: number, r: any) => s + r.revenue, 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                              <td className="px-4 py-3 text-right text-violet-700">₹{(reportData.data as any[]).reduce((s: number, r: any) => s + r.platform_fee, 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                              <td className="px-4 py-3 text-right">₹{(reportData.data as any[]).reduce((s: number, r: any) => s + r.expert_payout, 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  )}

                  {/* Bookings breakdown */}
                  {reportData.type === "bookings" && (
                    <div className="space-y-4">
                      <div className="overflow-hidden rounded-2xl border bg-card">
                        <div className="border-b bg-muted/30 px-4 py-2 text-xs font-semibold uppercase text-muted-foreground">By status</div>
                        <table className="w-full text-sm">
                          <thead><tr className="border-b"><th className="px-4 py-3 text-left text-muted-foreground">Status</th><th className="px-4 py-3 text-right text-muted-foreground">Count</th></tr></thead>
                          <tbody>{(reportData.data.by_status as any[]).map((r: any) => <tr key={r.status} className="border-t hover:bg-muted/20"><td className="px-4 py-3"><span className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-medium", STATUS_PILL[r.status] ?? "bg-slate-100 text-slate-700")}>{r.status}</span></td><td className="px-4 py-3 text-right font-semibold">{r.count}</td></tr>)}</tbody>
                        </table>
                      </div>
                      <div className="overflow-hidden rounded-2xl border bg-card">
                        <div className="border-b bg-muted/30 px-4 py-2 text-xs font-semibold uppercase text-muted-foreground">By service</div>
                        <table className="w-full text-sm">
                          <thead><tr className="border-b"><th className="px-4 py-3 text-left text-muted-foreground">Service</th><th className="px-4 py-3 text-right text-muted-foreground">Bookings</th><th className="px-4 py-3 text-right text-muted-foreground">Revenue (₹)</th></tr></thead>
                          <tbody>{(reportData.data.by_service as any[]).map((r: any) => <tr key={r.service_name} className="border-t hover:bg-muted/20"><td className="px-4 py-3 font-medium">{r.service_name}</td><td className="px-4 py-3 text-right">{r.bookings}</td><td className="px-4 py-3 text-right font-semibold">₹{Number(r.revenue).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td></tr>)}</tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Top experts */}
                  {reportData.type === "experts" && (
                    <div className="overflow-hidden rounded-2xl border bg-card">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/30 text-xs font-medium text-muted-foreground">
                          <tr><th className="px-4 py-3 text-left">Expert</th><th className="px-4 py-3 text-right">Rating</th><th className="px-4 py-3 text-right">Total jobs</th><th className="px-4 py-3 text-right">Period jobs</th><th className="px-4 py-3 text-right">Period earnings (₹)</th></tr>
                        </thead>
                        <tbody>
                          {(reportData.data as any[]).length === 0 ? <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">No data</td></tr> :
                            (reportData.data as any[]).map((r: any, i: number) => (
                              <tr key={i} className="border-t hover:bg-muted/20">
                                <td className="px-4 py-3 font-medium">{r.name ?? "—"}</td>
                                <td className="px-4 py-3 text-right"><span className="flex items-center justify-end gap-1"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{Number(r.avg_rating).toFixed(1)}</span></td>
                                <td className="px-4 py-3 text-right">{r.total_jobs}</td>
                                <td className="px-4 py-3 text-right font-semibold text-primary">{r.period_jobs}</td>
                                <td className="px-4 py-3 text-right">₹{Number(r.period_earnings).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Services summary */}
                  {reportData.type === "services" && (
                    <div className="overflow-hidden rounded-2xl border bg-card">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/30 text-xs font-medium text-muted-foreground">
                          <tr><th className="px-4 py-3 text-left">Service</th><th className="px-4 py-3 text-right">Rate/hr</th><th className="px-4 py-3 text-right">Fee %</th><th className="px-4 py-3 text-right">Bookings</th><th className="px-4 py-3 text-right">Revenue (₹)</th><th className="px-4 py-3 text-right">Platform earnings (₹)</th></tr>
                        </thead>
                        <tbody>
                          {(reportData.data as any[]).length === 0 ? <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">No data</td></tr> :
                            (reportData.data as any[]).map((r: any, i: number) => (
                              <tr key={i} className="border-t hover:bg-muted/20">
                                <td className="px-4 py-3 font-medium">{r.service_name}</td>
                                <td className="px-4 py-3 text-right">₹{Number(r.rate_per_hour).toLocaleString("en-IN")}</td>
                                <td className="px-4 py-3 text-right"><span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700 ring-1 ring-violet-200">{r.platform_fee_pct}%</span></td>
                                <td className="px-4 py-3 text-right">{r.bookings}</td>
                                <td className="px-4 py-3 text-right font-semibold">₹{Number(r.revenue).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                <td className="px-4 py-3 text-right text-violet-700">₹{Number(r.platform_earnings).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {!reportLoading && !reportTriggered && (
                <div className="flex flex-col items-center gap-3 rounded-2xl border bg-muted/10 py-20 text-muted-foreground">
                  <BarChart2 className="h-10 w-10" />
                  <p className="text-sm">Select a report type and date range, then click Generate</p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Expert Detail Dialog */}
      <Dialog open={!!detailExpertId} onOpenChange={(o) => !o && setDetailExpertId(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-auto">
          <DialogHeader><DialogTitle>Expert details</DialogTitle></DialogHeader>
          {expertDetailLoading || !detailExpert ? <LoadingSpinner /> : (
            <div className="space-y-5 text-sm">
              <div className="flex items-start gap-4">
                <Avatar src={expertEditForm.avatar_url || detailExpert.avatar_url} name={detailExpert.name ?? "E"} size={56} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-base">{detailExpert.name ?? "Expert"}</span>
                    {detailExpert.is_verified && <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" />Verified</span>}
                    {detailExpert.is_blocked && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">BLOCKED</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{detailExpert.city ?? "—"} · {detailExpert.status}</div>
                  <div className="mt-1 flex gap-4 text-xs">
                    <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{Number(detailExpert.avg_rating).toFixed(1)}</span>
                    <span>{detailExpert.total_jobs ?? 0} jobs</span>
                    <span>{detailExpert.is_trained ? "Trained" : "Not trained"}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border p-4">
                <div className="text-[10px] font-semibold uppercase text-muted-foreground">Edit expert</div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Name</Label><Input className="mt-1 h-8" value={expertEditForm.name} onChange={(e) => setExpertEditForm({ ...expertEditForm, name: e.target.value })} /></div>
                  <div><Label className="text-xs">City</Label><Input className="mt-1 h-8" value={expertEditForm.city} onChange={(e) => setExpertEditForm({ ...expertEditForm, city: e.target.value })} /></div>
                  <div><Label className="text-xs">Experience (years)</Label><Input type="number" min={0} className="mt-1 h-8" value={expertEditForm.experience_years} onChange={(e) => setExpertEditForm({ ...expertEditForm, experience_years: e.target.value })} /></div>
                  <div><Label className="text-xs">Gender</Label>
                    <Select value={expertEditForm.gender} onValueChange={(v) => setExpertEditForm({ ...expertEditForm, gender: v })}>
                      <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue placeholder="Gender" /></SelectTrigger>
                      <SelectContent><SelectItem value="MALE">Male</SelectItem><SelectItem value="FEMALE">Female</SelectItem><SelectItem value="OTHER">Other</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2"><Label className="text-xs">Avatar URL</Label><Input className="mt-1 h-8" value={expertEditForm.avatar_url} onChange={(e) => setExpertEditForm({ ...expertEditForm, avatar_url: e.target.value })} /></div>
                  <div className="col-span-2"><Label className="text-xs">Bio</Label><Textarea className="mt-1" rows={2} value={expertEditForm.bio} onChange={(e) => setExpertEditForm({ ...expertEditForm, bio: e.target.value })} /></div>
                </div>
                <div className="flex flex-wrap gap-4 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={expertEditForm.is_trained} onChange={(e) => setExpertEditForm({ ...expertEditForm, is_trained: e.target.checked })} />
                    Trained
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={expertEditForm.is_verified} onChange={(e) => setExpertEditForm({ ...expertEditForm, is_verified: e.target.checked })} />
                    Verified
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={expertEditForm.is_blocked} onChange={(e) => setExpertEditForm({ ...expertEditForm, is_blocked: e.target.checked })} />
                    Blocked
                  </label>
                </div>
              </div>

              {(data?.services ?? []).length > 0 && (
                <div className="rounded-xl border p-4">
                  <div className="text-[10px] font-semibold uppercase text-muted-foreground mb-2">Services offered</div>
                  <div className="flex flex-wrap gap-2">
                    {(data?.services ?? []).map((s: any) => {
                      const checked = expertServiceIds.includes(s.id);
                      return (
                        <label key={s.id} className={cn(
                          "flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                          checked ? "border-primary/40 bg-primary/5 text-primary" : "border-border text-muted-foreground",
                        )}>
                          <input type="checkbox" className="hidden" checked={checked} onChange={(e) => setExpertServiceIds(e.target.checked ? [...expertServiceIds, s.id] : expertServiceIds.filter((id) => id !== s.id))} />
                          {s.name}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {(detailExpert.bookings ?? []).length > 0 && (
                <div>
                  <div className="mb-1.5 text-[10px] font-semibold uppercase text-muted-foreground">Recent bookings ({detailExpert.bookings.length})</div>
                  <div className="max-h-40 space-y-1 overflow-auto">
                    {detailExpert.bookings.slice(0, 10).map((b: any) => (
                      <div key={b.id} className="flex items-center justify-between rounded-lg border px-3 py-1.5 text-xs">
                        <span>{b.service_name ?? "Service"} <span className="text-muted-foreground">· {b.customer_name ?? "—"}</span></span>
                        <span className="flex items-center gap-2"><span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_PILL[b.status] ?? "bg-slate-100")}>{b.status}</span> ₹{Number(b.expert_amount).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(detailExpert.documents ?? []).length > 0 && (
                <div>
                  <div className="mb-1.5 text-[10px] font-semibold uppercase text-muted-foreground">Documents</div>
                  <div className="space-y-1.5">
                    {(detailExpert.documents ?? []).map((d: any) => {
                      const statusCls = d.status === "APPROVED" ? "bg-emerald-100 text-emerald-700" : d.status === "REJECTED" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700";
                      return (
                        <div key={d.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs">
                          <span className="font-medium">{d.type}</span>
                          <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-semibold", statusCls)}>{d.status}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between border-t pt-3">
                <span className="text-[11px] text-muted-foreground">Joined {detailExpert.created_at ? new Date(detailExpert.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}</span>
                <div className="flex gap-2">
                  <Button size="sm" className="h-8" disabled={saveExpert.isPending} onClick={() => saveExpert.mutate({ ...expertEditForm, experience_years: expertEditForm.experience_years ? Number(expertEditForm.experience_years) : undefined, service_ids: expertServiceIds })}>
                    {saveExpert.isPending ? "Saving…" : "Save changes"}
                  </Button>
                  {isSuperAdmin && (
                    <Button size="sm" variant="outline" className="h-8 border-red-200 text-red-600 hover:bg-red-50" disabled={deleteExpert.isPending}
                      onClick={() => { if (confirm("Permanently delete this expert and all their data?")) deleteExpert.mutate(); }}>
                      <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Booking Detail Dialog */}
      <Dialog open={!!detailBookingId} onOpenChange={(o) => !o && setDetailBookingId(null)}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-auto">
          <DialogHeader><DialogTitle>Booking details</DialogTitle></DialogHeader>
          {bookingDetailLoading || !detailBooking ? <LoadingSpinner /> : (
            <div className="space-y-4 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-base">{detailBooking.service_name ?? "Service"}</div>
                  <div className="text-xs text-muted-foreground">{detailBooking.booking_type} · {detailBooking.created_at ? new Date(detailBooking.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-semibold", STATUS_PILL[detailBooking.status] ?? "bg-slate-100")}>{detailBooking.status}</span>
                  <a href={`/track/${detailBooking.id}`} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="outline" className="h-7 gap-1 text-xs border-primary/40 text-primary hover:bg-primary/5">
                      <MapPin className="h-3.5 w-3.5" /> Track live
                    </Button>
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-xl border p-3 text-xs">
                <div><div className="text-muted-foreground">Customer</div><div className="font-medium">{detailBooking.customer_name ?? "—"}</div></div>
                <div><div className="text-muted-foreground">Expert</div><div className="font-medium">{detailBooking.expert_name ?? "Not assigned"}</div></div>
                <div className="col-span-2"><div className="text-muted-foreground">Address</div><div className="font-medium">{detailBooking.address_snapshot ?? "—"}</div></div>
                {detailBooking.notes && <div className="col-span-2"><div className="text-muted-foreground">Notes</div><div>{detailBooking.notes}</div></div>}
                {detailBooking.scheduled_at && <div className="col-span-2"><div className="text-muted-foreground">Scheduled at</div><div className="font-medium">{new Date(detailBooking.scheduled_at).toLocaleString("en-IN")}</div></div>}
              </div>

              <div className="rounded-xl border p-3 text-xs space-y-1.5">
                <div className="text-[10px] font-semibold uppercase text-muted-foreground">Amount breakdown</div>
                <div className="flex justify-between"><span className="text-muted-foreground">Base amount</span><span>₹{Number(detailBooking.base_amount).toFixed(2)}</span></div>
                {Number(detailBooking.discount_amount) > 0 && <div className="flex justify-between text-emerald-600"><span>Discount {detailBooking.coupon_code ? `(${detailBooking.coupon_code})` : ""}</span><span>−₹{Number(detailBooking.discount_amount).toFixed(2)}</span></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">Platform fee</span><span>₹{Number(detailBooking.platform_fee).toFixed(2)}</span></div>
                <div className="flex justify-between font-semibold border-t pt-1.5"><span>Total</span><span>₹{Number(detailBooking.total_amount).toFixed(2)}</span></div>
                <div className="flex justify-between text-emerald-600"><span>Expert earnings</span><span>₹{Number(detailBooking.expert_amount).toFixed(2)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Payment method</span><span>{detailBooking.payment_method}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Payment status</span><span className={cn("font-medium", detailBooking.payment_status === "PAID" ? "text-emerald-600" : "text-amber-600")}>{detailBooking.payment_status}</span></div>
              </div>

              {/* Manual expert assignment — only for SEARCHING bookings */}
              {detailBooking.status === "SEARCHING" && (
                <div className="rounded-xl border border-amber-300/60 bg-amber-50/60 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-800">
                    <BellRing className="h-3.5 w-3.5" /> Assign an expert manually
                  </div>
                  {(availableExperts as any[]).length === 0 ? (
                    <p className="text-xs text-muted-foreground">No online verified experts available right now.</p>
                  ) : (
                    <>
                      <Select value={selectedExpertId} onValueChange={setSelectedExpertId}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select an expert…" /></SelectTrigger>
                        <SelectContent>
                          {(availableExperts as any[]).map((e: any) => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.name ?? "Expert"} · ★{Number(e.avg_rating).toFixed(1)} · {e.active_jobs} active · {e.status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" className="w-full h-8 text-xs"
                        disabled={!selectedExpertId || assignExpert.isPending}
                        onClick={() => assignExpert.mutate({ bookingId: detailBooking.id, expertId: selectedExpertId })}>
                        {assignExpert.isPending ? "Assigning…" : "Assign expert"}
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
