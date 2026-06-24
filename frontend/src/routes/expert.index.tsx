import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Wallet, Briefcase, Star, TrendingUp, Wifi, WifiOff, MapPin, Clock, ShieldAlert, BanknoteArrowDown, Upload, CheckCircle2, XCircle, Clock3, FileUp, Loader2, Navigation, ChevronDown, ChevronUp, UserCircle, BellRing, ChevronLeft, ChevronRight, Lock, ShieldCheck, MessageSquare, FileText } from "lucide-react";
import { apiFetch, uploadFile, API_BASE, getAccessToken } from "@/lib/api";
import { startBookingAlarm } from "@/lib/sound";
import { getSocket } from "@/lib/socket";
import { useAuth } from "@/lib/auth-context";
import { LiveMap } from "@/components/booking/LiveMap";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Avatar } from "@/components/shared/Avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AnimatedCounter } from "@/components/shared/AnimatedCounter";
import { playUISound } from "@/lib/sound-ui";
import { ChatDrawer } from "@/components/chat/ChatDrawer";

const WITHDRAWAL_PILL: Record<string, string> = {
  REQUESTED: "bg-amber-500/12 text-amber-700",
  APPROVED: "bg-blue-500/12 text-blue-700",
  PAID: "bg-emerald-500/12 text-emerald-700",
  REJECTED: "bg-red-500/12 text-red-700",
};

export const Route = createFileRoute("/expert/")({
  head: () => ({ meta: [{ title: "Expert Dashboard — HomeHero" }] }),
  component: ExpertDashboard,
});

// The next status an expert can advance an active job to.
const NEXT_STATUS: Record<string, { status: string; label: string }> = {
  ASSIGNED: { status: "ACCEPTED", label: "Accept" },
  ACCEPTED: { status: "ON_THE_WAY", label: "Start trip" },
  ON_THE_WAY: { status: "ARRIVED", label: "Mark arrived" },
  ARRIVED: { status: "IN_PROGRESS", label: "Start service" },
  IN_PROGRESS: { status: "COMPLETED", label: "Complete job" },
};
const ACTIVE = ["ASSIGNED", "ACCEPTED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS"];

function ExpertDashboard() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [myLoc, setMyLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [wdAmount, setWdAmount] = useState("");
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", bio: "", experience_years: "", gender: "" });
  const [newServiceId, setNewServiceId] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatRecipientId, setChatRecipientId] = useState<string | null>(null);
  const [chatRecipientName, setChatRecipientName] = useState("");
  const [chatBookingId, setChatBookingId] = useState<string | null>(null);

  const handleChatOpen = (customerId: string, customerName: string, bookingId: string) => {
    setChatRecipientId(customerId);
    setChatRecipientName(customerName);
    setChatBookingId(bookingId);
    setChatOpen(true);
  };
  const historyItemsPerPage = 5;
  const stopAlarmRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!loading) {
      if (!user) router.navigate({ to: "/auth/login" });
      else if (role && role !== "EXPERT" && role !== "ADMIN" && role !== "SUPER_ADMIN") router.navigate({ to: "/" });
    }
  }, [user, role, loading, router]);

  const { data, isLoading, isError } = useQuery({
    enabled: !!user && role === "EXPERT",
    queryKey: ["expert-dashboard", user?.id],
    queryFn: async () => {
      const [expert, wallet, bookings] = await Promise.all([
        apiFetch(`/experts/${user!.id}`),
        apiFetch(`/expert-wallet/${user!.id}`),
        apiFetch(`/bookings`),
      ]);
      return { expert, wallet, bookings: bookings ?? [] };
    },
    refetchInterval: 8000,
    retry: false,
  });

  useEffect(() => {
    if (data?.expert && isOnline === null) setIsOnline(data.expert.status === "ONLINE");
  }, [data?.expert, isOnline]);

  useEffect(() => {
    if (data?.expert) {
      setProfileForm({
        name: data.expert.name ?? "",
        bio: data.expert.bio ?? "",
        experience_years: String(data.expert.experience_years ?? ""),
        gender: data.expert.gender ?? "",
      });
    }
  }, [data?.expert]);

  const saveProfile = useMutation({
    mutationFn: (body: object) => apiFetch(`/experts/${user!.id}/profile`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success("Profile updated");
      setProfileOpen(false);
      qc.invalidateQueries({ queryKey: ["expert-dashboard", user?.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Stream live location to assigned customers while online.
  useEffect(() => {
    const online = isOnline ?? (data?.expert?.status === "ONLINE");
    if (!user || role !== "EXPERT" || !online) return;
    const socket = getSocket();
    if (!socket) return;

    // Use real GPS when available; otherwise a jittered city-centre mock.
    const base = { lat: 12.9716, lng: 77.5946 };
    const emit = () => {
      const broadcast = (loc: { lat: number; lng: number }) => {
        socket.emit("expert_location", loc);
        setMyLoc(loc);
      };
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => broadcast({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => broadcast({ lat: base.lat + (Math.random() - 0.5) * 0.02, lng: base.lng + (Math.random() - 0.5) * 0.02 }),
          { maximumAge: 15000, timeout: 5000 },
        );
      } else {
        broadcast({ lat: base.lat + (Math.random() - 0.5) * 0.02, lng: base.lng + (Math.random() - 0.5) * 0.02 });
      }
    };
    emit();
    const timer = setInterval(emit, 10000);
    return () => clearInterval(timer);
  }, [user, role, isOnline, data?.expert?.status]);

  // Ring alarm while any ASSIGNED job awaits acceptance; stop when cleared.
  useEffect(() => {
    const bookings = (data?.bookings ?? []) as any[];
    const hasAssigned = bookings.some((b) => b.status === "ASSIGNED");
    if (hasAssigned && !stopAlarmRef.current) {
      stopAlarmRef.current = startBookingAlarm();
    } else if (!hasAssigned && stopAlarmRef.current) {
      stopAlarmRef.current();
      stopAlarmRef.current = null;
    }
    return () => { /* cleanup on unmount handled below */ };
  }, [data?.bookings]);

  // Stop alarm when component unmounts.
  useEffect(() => {
    return () => { stopAlarmRef.current?.(); stopAlarmRef.current = null; };
  }, []);

  const toggleStatus = useMutation({
    mutationFn: (status: string) => apiFetch(`/experts/${user!.id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: (_d, status) => {
      setIsOnline(status === "ONLINE");
      if (status === "ONLINE") {
        playUISound("online");
      } else {
        playUISound("warning");
      }
      toast.success(status === "ONLINE" ? "You're online — ready for jobs" : "You're offline");
      qc.invalidateQueries({ queryKey: ["expert-dashboard", user?.id] });
    },
    onError: (e: any) => {
      playUISound("warning");
      toast.error(e.message);
    },
  });

  const advance = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiFetch(`/bookings/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => { toast.success("Job updated"); qc.invalidateQueries({ queryKey: ["expert-dashboard", user?.id] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const reject = useMutation({
    mutationFn: (id: string) => apiFetch(`/bookings/${id}/reject`, { method: "POST" }),
    onSuccess: () => { toast.success("Booking rejected — reassigning"); qc.invalidateQueries({ queryKey: ["expert-dashboard", user?.id] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const { data: withdrawals = [] } = useQuery({
    enabled: !!user && role === "EXPERT",
    queryKey: ["withdrawals", user?.id],
    queryFn: () => apiFetch(`/expert-wallet/${user!.id}/withdrawals`),
  });

  const withdraw = useMutation({
    mutationFn: (amount: number) => apiFetch(`/expert-wallet/${user!.id}/withdraw`, { method: "POST", body: JSON.stringify({ amount }) }),
    onSuccess: () => {
      playUISound("success");
      toast.success("Withdrawal requested");
      setWithdrawOpen(false); setWdAmount("");
      qc.invalidateQueries({ queryKey: ["expert-dashboard", user?.id] });
      qc.invalidateQueries({ queryKey: ["withdrawals", user?.id] });
    },
    onError: (e: any) => {
      playUISound("warning");
      toast.error(e.message);
    },
  });

  const { data: documents = [] } = useQuery({
    enabled: !!user && role === "EXPERT",
    queryKey: ["documents", user?.id],
    queryFn: () => apiFetch(`/experts/${user!.id}/documents`),
  });

  const { data: publicServices = [] } = useQuery({
    enabled: !!user && role === "EXPERT",
    queryKey: ["services"],
    queryFn: () => apiFetch(`/services`),
  });

  const addService = useMutation({
    mutationFn: (service_id: string) => apiFetch(`/experts/${user!.id}/services`, { method: "POST", body: JSON.stringify({ service_id }) }),
    onSuccess: () => {
      playUISound("success");
      toast.success("Service added! Pending admin training.");
      qc.invalidateQueries({ queryKey: ["expert-dashboard", user?.id] });
    },
    onError: (e: any) => {
      playUISound("warning");
      toast.error(e.message);
    },
  });

  const removeService = useMutation({
    mutationFn: (service_id: string) => apiFetch(`/experts/${user!.id}/services/${service_id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Service removed.");
      qc.invalidateQueries({ queryKey: ["expert-dashboard", user?.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Pick a file → upload it to storage → submit the returned URL as a KYC doc.
  async function handleDocFile(type: string, file?: File | null) {
    if (!file) return;
    setUploadingType(type);
    try {
      const { file_url } = await uploadFile<{ file_url: string }>(file, { folder: `kyc/${type.toLowerCase()}` });
      await apiFetch(`/experts/${user!.id}/documents`, {
        method: "POST",
        body: JSON.stringify({ type, file_url }),
      });
      playUISound("success");
      toast.success(`${type} uploaded — pending review`);
      qc.invalidateQueries({ queryKey: ["documents", user?.id] });
    } catch (e: any) {
      playUISound("warning");
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploadingType(null);
    }
  }

  const handleDownloadPdf = async (bookingId: string) => {
    try {
      const toastId = toast.loading("Generating invoice PDF...");
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

  if (loading || (isLoading && role === "EXPERT")) return <div className="container mx-auto px-4 py-16"><LoadingSpinner /></div>;
  if (isError) return <div className="container mx-auto max-w-7xl px-4 py-20 text-center text-muted-foreground">Could not load your expert profile.</div>;

  const expert = data?.expert;
  const bookings = (data?.bookings ?? []) as any[];
  const activeJobs = bookings.filter((b) => ACTIVE.includes(b.status));
  const completed = bookings.filter((b) => b.status === "COMPLETED").length;
  const currentOnline = isOnline ?? (expert?.status === "ONLINE");

  const stats = [
    { icon: Wallet, label: "Available", raw: Number(data?.wallet?.available_balance ?? 0), decimals: 0, prefix: "₹", color: "emerald", borderClass: "border-emerald-500/20 hover:border-emerald-500/50 shadow-[0_4px_20px_-4px_rgba(16,185,129,0.08)] hover:shadow-[0_4px_25px_rgba(16,185,129,0.15)]", iconClass: "bg-emerald-500/10 text-emerald-500" },
    { icon: Clock, label: "Held in AI Escrow", raw: Number(data?.wallet?.pending_balance ?? 0), decimals: 0, prefix: "₹", color: "amber", borderClass: "border-amber-500/20 hover:border-amber-500/50 shadow-[0_4px_20px_-4px_rgba(245,158,11,0.08)] hover:shadow-[0_4px_25px_rgba(245,158,11,0.15)]", iconClass: "bg-amber-500/10 text-amber-500" },
    { icon: TrendingUp, label: "Total earned", raw: Number(data?.wallet?.total_earned ?? 0), decimals: 0, prefix: "₹", color: "indigo", borderClass: "border-indigo-500/20 hover:border-indigo-500/50 shadow-[0_4px_20px_-4px_rgba(99,102,241,0.08)] hover:shadow-[0_4px_25px_rgba(99,102,241,0.15)]", iconClass: "bg-indigo-500/10 text-indigo-500" },
    { icon: Briefcase, label: "Active jobs", raw: activeJobs.length, decimals: 0, prefix: "", color: "cyan", borderClass: "border-cyan-500/20 hover:border-cyan-500/50 shadow-[0_4px_20px_-4px_rgba(6,182,212,0.08)] hover:shadow-[0_4px_25px_rgba(6,182,212,0.15)]", iconClass: "bg-cyan-500/10 text-cyan-500" },
    { icon: Star, label: "Rating", raw: Number(expert?.avg_rating ?? 0), decimals: 1, prefix: "", color: "amber", borderClass: "border-amber-500/20 hover:border-amber-500/50 shadow-[0_4px_20px_-4px_rgba(245,158,11,0.08)] hover:shadow-[0_4px_25px_rgba(245,158,11,0.15)]", iconClass: "bg-amber-500/10 text-amber-500" },
  ];

  const historicalBookings = bookings.filter((b) => !ACTIVE.includes(b.status));
  const totalHistoryItems = historicalBookings.length;
  const totalPages = Math.ceil(totalHistoryItems / historyItemsPerPage);
  const displayedHistory = historicalBookings.slice(
    (historyPage - 1) * historyItemsPerPage,
    historyPage * historyItemsPerPage
  );

  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      {/* Operations Control Panel status banner */}
      <div id="tour-expert-status" className={cn(
        "relative overflow-hidden rounded-3xl p-6 text-white shadow-xl transition-all duration-500 sm:p-8 hover:shadow-2xl border border-white/10",
        currentOnline 
          ? "bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-950" 
          : "bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950"
      )}>
        {/* Decorative Grid Lines / Mesh */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none opacity-60" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

        {/* Radar display overlay on the right when ONLINE */}
        {currentOnline && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-64 h-64 rounded-full border border-emerald-500/25 bg-emerald-950/20 backdrop-blur-sm pointer-events-none hidden lg:block overflow-hidden mr-48 shadow-[0_0_50px_rgba(16,185,129,0.08)_inset]">
            <div className="absolute inset-4 rounded-full border border-emerald-500/10" />
            <div className="absolute inset-16 rounded-full border border-emerald-500/10" />
            <div className="absolute inset-28 rounded-full border border-emerald-500/10" />
            <div className="absolute inset-40 rounded-full border border-emerald-500/10" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-[0.5px] bg-emerald-500/10" />
            </div>
            <div className="absolute inset-0 flex justify-center items-center">
              <div className="h-full w-[0.5px] bg-emerald-500/10" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-emerald-500/20 rounded-full animate-radar-sweep origin-center" />
            <div className="absolute top-1/4 left-1/3 w-1.5 h-1.5 rounded-full bg-emerald-400">
              <div className="absolute -inset-1 rounded-full bg-emerald-400 animate-sonar-pulse" />
            </div>
            <div className="absolute bottom-1/3 right-1/4 w-1.5 h-1.5 rounded-full bg-emerald-400">
              <div className="absolute -inset-1 rounded-full bg-emerald-400 animate-sonar-pulse" style={{ animationDelay: "0.8s" }} />
            </div>
          </div>
        )}

        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="flex-1 min-w-[240px]">
            <div className="flex items-center gap-3">
              <div className="relative">
                {currentOnline ? (
                  <>
                    <span className="absolute -inset-1 rounded-full bg-emerald-400/50 animate-ping opacity-75" />
                    <span className="relative block h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                  </>
                ) : (
                  <span className="relative block h-3 w-3 rounded-full bg-slate-500" />
                )}
              </div>
              <span className={cn(
                "text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full backdrop-blur-sm border",
                currentOnline 
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/20 shadow-[0_0_10px_rgba(52,211,153,0.1)]" 
                  : "bg-slate-500/20 text-slate-400 border-slate-500/20"
              )}>
                {currentOnline ? "System Active" : "Standby Mode"}
              </span>
            </div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
              Hello{expert?.name ? `, ${expert.name.split(" ")[0]}` : ""}
            </h1>
            <p className="mt-2 text-sm text-white/70 font-medium">
              {expert?.is_verified ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" /> Verified Partner
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-amber-300">
                  <Clock3 className="h-4 w-4" /> Verification Pending
                </span>
              )}
              {" · "}
              <span className="text-white/80">{completed} jobs completed</span>
            </p>
            <p className="mt-3 text-sm text-white/90">
              {currentOnline 
                ? "You are live on the radar. Bookings in your area will be dispatched to you." 
                : "You are currently offline. Go online to start receiving live job opportunities."}
            </p>
          </div>

          <div className="flex shrink-0 items-center justify-end sm:mt-0">
            <button 
              onClick={() => toggleStatus.mutate(currentOnline ? "OFFLINE" : "ONLINE")} 
              disabled={toggleStatus.isPending}
              className={cn(
                "group relative flex items-center gap-3.5 rounded-2xl px-6 py-3.5 text-sm font-bold shadow-xl transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] disabled:opacity-50",
                currentOnline 
                  ? "bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md" 
                  : "bg-emerald-500 hover:bg-emerald-600 text-white border border-emerald-400/30 shadow-[0_4px_25px_rgba(16,185,129,0.35)]"
              )}
            >
              {currentOnline ? (
                <>
                  <WifiOff className="h-4.5 w-4.5 text-white/90 group-hover:rotate-12 transition-transform" />
                  <span>Go Offline</span>
                </>
              ) : (
                <>
                  <Wifi className="h-4.5 w-4.5 text-white group-hover:animate-pulse" />
                  <span>Go Online</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {!expert?.is_verified && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
          <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-600" />
          <div>
            <h3 className="font-semibold text-amber-900 dark:text-amber-200">Verification Pending</h3>
            <p className="mt-1 text-sm text-muted-foreground">Our team is reviewing your profile and uploaded KYC documents. You'll start receiving bookings once approved.</p>
          </div>
        </div>
      )}

      {/* Stats Cards Grid with glowing color frame borders */}
      <div id="tour-expert-stats" className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className={cn(
            "relative overflow-hidden rounded-2xl border bg-card p-6 transition-all duration-300 hover-lift hover:border-solid",
            s.borderClass
          )}>
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 rounded-full opacity-[0.03] pointer-events-none bg-current" />
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-muted-foreground tracking-wider uppercase">{s.label}</div>
              <div className={cn("grid h-10 w-10 place-items-center rounded-xl font-semibold shadow-inner", s.iconClass)}>
                <s.icon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-extrabold tracking-tight text-foreground">
                <AnimatedCounter value={s.raw} decimals={s.decimals} prefix={s.prefix} />
              </span>
            </div>
            {/* Ambient card accent light */}
            <div className={cn(
              "absolute bottom-0 left-0 right-0 h-[2.5px] opacity-60",
              s.color === "emerald" && "bg-emerald-500",
              s.color === "indigo" && "bg-indigo-500",
              s.color === "cyan" && "bg-cyan-500",
              s.color === "amber" && "bg-amber-500"
            )} />
          </div>
        ))}
      </div>

      {/* My Profile */}
      <div className="mt-8 rounded-2xl border bg-card p-5">
        <button onClick={() => setProfileOpen((v) => !v)} className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <UserCircle className="h-4 w-4 text-primary" /> My Profile
          </div>
          {profileOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {!profileOpen && expert && (
          <div className="mt-2 text-sm text-muted-foreground line-clamp-2">{expert.bio || "No bio yet — add one to help customers find you."}</div>
        )}
        {profileOpen && (
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Display name</Label>
                <Input className="mt-1" value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} />
              </div>
              <div>
                <Label>Experience (years)</Label>
                <Input type="number" min={0} className="mt-1" value={profileForm.experience_years} onChange={(e) => setProfileForm({ ...profileForm, experience_years: e.target.value })} />
              </div>
              <div>
                <Label>Gender</Label>
                <Select value={profileForm.gender} onValueChange={(v) => setProfileForm({ ...profileForm, gender: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Bio</Label>
              <Textarea className="mt-1" rows={3} value={profileForm.bio} onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })} placeholder="Tell customers about your skills and experience…" />
            </div>
            <Button disabled={saveProfile.isPending} onClick={() => saveProfile.mutate({
              name: profileForm.name || undefined,
              bio: profileForm.bio || undefined,
              gender: profileForm.gender || undefined,
              experience_years: profileForm.experience_years ? Number(profileForm.experience_years) : undefined,
            })}>
              {saveProfile.isPending ? "Saving…" : "Save profile"}
            </Button>
          </div>
        )}
      </div>

      {/* My Services */}
      <div className="mt-8 rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-2 text-sm font-semibold mb-4">
          <Briefcase className="h-4 w-4 text-primary" /> My Services
        </div>
        <div className="space-y-3">
          {(expert.services || []).map((es: any) => {
            const svc = (publicServices as any[]).find((s) => s.id === es.service_id);
            return (
              <div key={es.service_id} className="flex items-center justify-between rounded-xl border bg-muted/20 px-4 py-3 text-sm">
                <span className="font-medium">{svc?.name || es.service_id}</span>
                <div className="flex items-center gap-3">
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", es.is_trained ? "bg-emerald-500/12 text-emerald-700" : "bg-amber-500/12 text-amber-700")}>
                    {es.is_trained ? "Active" : "Pending Training"}
                  </span>
                  <button onClick={() => removeService.mutate(es.service_id)} disabled={removeService.isPending} className="text-red-500 hover:text-red-600 text-xs font-semibold">Remove</button>
                </div>
              </div>
            );
          })}
          {(expert.services || []).length === 0 && (
            <div className="text-sm text-muted-foreground">You have not added any services yet.</div>
          )}
        </div>
        <div className="mt-4 flex items-end gap-3">
          <div className="flex-1">
            <Label>Add a new service</Label>
            <Select value={newServiceId} onValueChange={setNewServiceId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select service..." /></SelectTrigger>
              <SelectContent>
                {(publicServices as any[])
                  .filter((ps) => !(expert.services || []).some((es: any) => es.service_id === ps.id))
                  .map((ps) => (
                    <SelectItem key={ps.id} value={ps.id}>{ps.name}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <Button 
            disabled={!newServiceId || addService.isPending} 
            onClick={() => {
              addService.mutate(newServiceId);
              setNewServiceId("");
            }}
          >
            {addService.isPending ? "Adding..." : "Add"}
          </Button>
        </div>
      </div>

      {/* Earnings & withdrawals */}
      <div className="mt-8 rounded-2xl border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">Earnings</h3>
            <p className="text-sm text-muted-foreground">₹{Number(data?.wallet?.available_balance ?? 0).toFixed(2)} available to withdraw</p>
          </div>
          <Button variant="outline" onClick={() => setWithdrawOpen(true)} disabled={Number(data?.wallet?.available_balance ?? 0) < 100}>
            <BanknoteArrowDown className="mr-1.5 h-4 w-4" /> Withdraw
          </Button>
        </div>
        {(withdrawals as any[]).length > 0 && (
          <div className="mt-4 space-y-2">
            {(withdrawals as any[]).map((w) => (
              <div key={w.id} className="flex items-center justify-between rounded-xl border bg-muted/20 px-4 py-2.5 text-sm">
                <span className="text-muted-foreground">{new Date(w.requested_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                <span className="font-medium">₹{Number(w.amount).toFixed(0)}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", WITHDRAWAL_PILL[w.status] ?? "bg-muted")}>{w.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* KYC documents card grid */}
      <div className="mt-8 rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold tracking-tight">KYC Verification Documents</h3>
        </div>
        <p className="mt-1.5 text-sm text-muted-foreground">Upload your required documentation below. Our system and team will review them to verify your profile and activate you for live customer dispatches.</p>
        
        <div className="mt-6 grid gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {([
            { type: "AADHAAR", label: "Aadhaar Card", hint: "Front & back in one photo/PDF" },
            { type: "PAN", label: "PAN Card", hint: "Clear photo of the front side" },
            { type: "SELFIE", label: "Verification Selfie", hint: "Your face clearly visible in good lighting" },
          ] as const).map(({ type, label, hint }) => {
            const doc = (documents as any[]).find((d) => d.type === type);
            const st: string = doc?.status ?? "MISSING";
            const busy = uploadingType === type;
            const meta = {
              APPROVED: { cls: "text-emerald-500 border-emerald-500/20 bg-emerald-500/5", Icon: CheckCircle2, text: "Approved", statusText: "text-emerald-500" },
              REJECTED: { cls: "text-red-500 border-red-500/20 bg-red-500/5", Icon: XCircle, text: "Rejected", statusText: "text-red-500" },
              PENDING: { cls: "text-amber-500 border-amber-500/20 bg-amber-500/5", Icon: Clock3, text: "Pending Review", statusText: "text-amber-500" },
              MISSING: { cls: "text-muted-foreground border-border bg-muted/10", Icon: FileUp, text: "Not Uploaded", statusText: "text-muted-foreground" },
            }[st] ?? { cls: "text-muted-foreground border-border bg-muted/10", Icon: FileUp, text: st, statusText: "text-muted-foreground" };
            
            return (
              <div
                key={type}
                className={cn(
                  "group relative flex flex-col rounded-2xl border bg-card p-5 transition-all duration-300 hover:shadow-md hover:border-primary/40",
                  busy && "pointer-events-none opacity-60",
                  st === "REJECTED" && "border-red-500/30 shadow-[0_2px_12px_rgba(239,68,68,0.05)]",
                  st === "APPROVED" && "border-emerald-500/30 shadow-[0_2px_12px_rgba(16,185,129,0.05)]",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Document Type</span>
                    <h4 className="text-base font-bold tracking-tight text-foreground">{label}</h4>
                  </div>
                  <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg border", meta.statusText, meta.cls)}>
                    <meta.Icon className="h-4.5 w-4.5" />
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-1.5">
                  <span className={cn("text-xs font-bold tracking-wide uppercase px-2 py-0.5 rounded-md", meta.cls)}>
                    {meta.text}
                  </span>
                </div>

                {doc?.file_url ? (
                  <div className="relative mt-4 aspect-video overflow-hidden rounded-xl border bg-muted/50 group/preview shadow-inner">
                    {/\.pdf($|\?)/i.test(doc.file_url) ? (
                      <div className="flex h-full flex-col items-center justify-center bg-slate-50/50 p-4 text-center">
                        <FileUp className="h-8 w-8 text-slate-400 mb-1" />
                        <span className="text-xs font-medium text-slate-600">PDF Document</span>
                        <a href={doc.file_url} target="_blank" rel="noreferrer" className="mt-1 text-[10px] text-primary hover:underline font-semibold">View Document</a>
                      </div>
                    ) : (
                      <>
                        <img src={doc.file_url} alt={label} className="h-full w-full object-cover transition-transform duration-500 group-hover/preview:scale-105" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                          <a href={doc.file_url} target="_blank" rel="noreferrer" className="rounded-lg bg-white/95 px-3 py-1.5 text-xs font-bold text-slate-900 shadow-lg hover:bg-white hover:scale-105 transition-all">
                            View Fullscreen
                          </a>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 flex aspect-video flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/5 p-4 text-center">
                    <p className="text-xs text-muted-foreground font-medium px-2">{hint}</p>
                  </div>
                )}

                {doc?.review_note && (
                  <div className={cn(
                    "mt-3.5 rounded-xl border p-3 text-xs leading-relaxed font-medium",
                    st === "REJECTED" ? "bg-red-500/5 border-red-500/10 text-red-700" : "bg-muted/30 border-border text-muted-foreground"
                  )}>
                    <span className="font-bold uppercase tracking-wider text-[10px] block mb-0.5">Reviewer Note:</span>
                    {doc.review_note}
                  </div>
                )}

                <label className={cn(
                  "mt-5 flex items-center justify-center gap-2 rounded-xl border border-input bg-background px-4 py-2.5 text-xs font-bold text-foreground cursor-pointer shadow-sm hover:bg-muted/30 hover:border-muted-foreground/30 transition-all",
                  busy && "pointer-events-none opacity-50"
                )}>
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span>Uploading document...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 text-muted-foreground" />
                      <span>{st === "MISSING" ? "Choose File" : "Replace Document"}</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,application/pdf"
                    className="hidden"
                    disabled={busy}
                    onChange={(e) => { handleDocFile(type, e.target.files?.[0]); e.currentTarget.value = ""; }}
                  />
                </label>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-muted-foreground leading-normal">
          Supported document file formats: <span className="font-semibold text-foreground">JPG, PNG, WEBP, or PDF</span>. File size limit is <span className="font-semibold text-foreground">8MB</span> per document.
        </p>
      </div>

      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Request withdrawal</DialogTitle></DialogHeader>
          <div className="mt-2 space-y-3">
            <p className="text-sm text-muted-foreground">Available: ₹{Number(data?.wallet?.available_balance ?? 0).toFixed(2)} · Minimum ₹100</p>
            <div><Label>Amount (₹)</Label><Input type="number" min={100} value={wdAmount} onChange={(e) => setWdAmount(e.target.value)} className="mt-1" /></div>
            <Button className="w-full" disabled={withdraw.isPending} onClick={() => {
              const amt = Number(wdAmount);
              if (!amt || amt < 100) { toast.error("Minimum withdrawal is ₹100"); return; }
              withdraw.mutate(amt);
            }}>{withdraw.isPending ? "Requesting…" : "Request withdrawal"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <h2 id="tour-expert-jobs" className="mt-10 flex items-center gap-3 text-lg font-bold tracking-tight">
        <span>Active Dispatch Feed</span>
        {activeJobs.some((j) => j.status === "ASSIGNED") && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-bold text-amber-600 animate-pulse">
            <BellRing className="h-3.5 w-3.5" /> New Booking Dispatched
          </span>
        )}
      </h2>
      <div className="mt-4 space-y-4">
        {activeJobs.length === 0 ? (
          <EmptyState icon={Briefcase} title="No active dispatches" description={currentOnline ? "You are online. When a customer books a service in your area, it will immediately appear here." : "Please go online in the operations panel above to start receiving job dispatches."} />
        ) : (
          activeJobs.map((j) => {
            const next = NEXT_STATUS[j.status];
            return (
              <div key={j.id} className="overflow-hidden rounded-2xl border bg-card hover:shadow-md transition-all duration-300">
                <div className="flex flex-col sm:flex-row items-stretch">
                  {j.service_image && (
                    <div className="w-full sm:w-48 shrink-0 overflow-hidden bg-muted relative aspect-video sm:aspect-auto">
                      <img src={j.service_image} alt={j.service_name} fetchpriority="high" className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-black/60 to-transparent sm:hidden" />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col justify-between p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold tracking-tight text-foreground">{j.service_name}</h3>
                          <StatusBadge status={j.status} />
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-sm font-medium">
                          <Avatar src={j.customer_avatar} name={j.customer_name} size={28} />
                          <span className="text-foreground">{j.customer_name ?? "Customer"}</span>
                        </div>
                        <div className="mt-3.5 grid gap-2 sm:grid-cols-2 text-xs font-medium text-muted-foreground">
                          <span className="inline-flex items-center gap-2">
                            <Clock className="h-4 w-4 text-primary" />
                            <span>{Number(j.duration_hours)} hr · {j.booking_type === "INSTANT" ? "Instant Dispatch" : j.scheduled_at}</span>
                          </span>
                          <span className="inline-flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-primary" />
                            <span className="line-clamp-1">{j.address_snapshot}</span>
                          </span>
                        </div>
                        {j.notes && (
                          <div className="mt-3 rounded-xl bg-muted/40 border p-3 text-xs leading-relaxed text-muted-foreground">
                            <span className="font-bold text-foreground uppercase tracking-wider text-[9px] block mb-0.5">Instructions:</span>
                            {j.notes}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-start sm:items-end justify-between self-stretch shrink-0">
                        <div className="sm:text-right">
                          <div className="text-xl font-extrabold tracking-tight text-foreground">₹{Number(j.expert_amount).toFixed(0)}</div>
                          <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Your Net Payout</div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2 w-full justify-start sm:justify-end">
                          <Button size="sm" variant="secondary" className="font-bold text-primary bg-primary/10 hover:bg-primary/20 border-0"
                            onClick={() => handleChatOpen(j.customer_id, j.customer_name, j.id)}>
                            <MessageSquare className="mr-1.5 h-4 w-4" /> Chat
                          </Button>
                          {["ASSIGNED", "ACCEPTED"].includes(j.status) && (
                            <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold" disabled={reject.isPending}
                              onClick={() => reject.mutate(j.id)}>
                              Reject
                            </Button>
                          )}
                          {next && (
                            <Button size="sm" disabled={advance.isPending} className="font-bold"
                              onClick={() => advance.mutate({ id: j.id, status: next.status })}>
                              {next.label}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Live navigation map — shows once the expert is on the way */}
                    {["ON_THE_WAY", "ARRIVED", "IN_PROGRESS"].includes(j.status) && (myLoc || (j.lat && j.lng)) && (
                      <div className="mt-5 border-t pt-5">
                        <div className="overflow-hidden rounded-xl border">
                          <LiveMap
                            height={220}
                            expert={myLoc}
                            dest={j.lat && j.lng ? { lat: Number(j.lat), lng: Number(j.lng) } : null}
                          />
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 mt-2 px-1 text-xs font-semibold text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <Navigation className={cn("h-3.5 w-3.5", myLoc ? "text-emerald-500 animate-pulse" : "text-primary")} />
                            {myLoc ? (
                              <span className="text-emerald-600">Live GPS tracking active</span>
                            ) : (
                              <span>GPS navigation map ready</span>
                            )}
                          </span>
                          {j.lat && j.lng && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">Dest: {Number(j.lat).toFixed(4)}, {Number(j.lng).toFixed(4)}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Recent completed */}
      {totalHistoryItems > 0 && (
        <div className="mt-10 rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight">Recent History</h2>
            <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
              {totalHistoryItems} total {totalHistoryItems === 1 ? "record" : "records"}
            </span>
          </div>
          <div className="mt-4 divide-y divide-border">
            {displayedHistory.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                <div>
                  <div className="font-bold text-sm sm:text-base text-foreground">{b.service_name}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="h-3 w-3" />
                    <span>{b.address_snapshot}</span>
                  </div>
                  {b.scheduled_at && (
                    <div className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{b.scheduled_at}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={b.status} />
                  {b.status === "COMPLETED" && (
                    <div className="hidden md:flex items-center gap-2">
                      {Number(b.expert_amount) > 300 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                          <Lock className="h-3 w-3" /> AI Escrow Held (24h Safety Hold · +₹{(b.expert_amount * 0.0003).toFixed(2)} yield)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                          <ShieldCheck className="h-3 w-3" /> AI Escrow Cleared (Instant Release)
                        </span>
                      )}
                    </div>
                  )}
                  <div className="text-right">
                    <span className="text-sm sm:text-base font-extrabold text-foreground">₹{Number(b.expert_amount).toFixed(0)}</span>
                    <span className="block text-[10px] text-muted-foreground">earning</span>
                  </div>
                  {b.status === "COMPLETED" && (
                    <Button variant="ghost" size="icon" onClick={() => handleDownloadPdf(b.id)} title="Download PDF Invoice">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
              <span className="text-xs font-medium text-muted-foreground">
                Page <span className="font-bold text-foreground">{historyPage}</span> of <span className="font-bold text-foreground">{totalPages}</span>
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                  disabled={historyPage === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">Previous Page</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHistoryPage((p) => Math.min(totalPages, p + 1))}
                  disabled={historyPage === totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                  <span className="sr-only">Next Page</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

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
