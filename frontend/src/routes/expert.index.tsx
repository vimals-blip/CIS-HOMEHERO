import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Wallet, Briefcase, Star, TrendingUp, Wifi, WifiOff, MapPin, Clock, ShieldAlert, BanknoteArrowDown, Upload, CheckCircle2, XCircle, Clock3, FileUp, Loader2, Navigation, ChevronDown, ChevronUp, UserCircle } from "lucide-react";
import { apiFetch, uploadFile } from "@/lib/api";
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

  const toggleStatus = useMutation({
    mutationFn: (status: string) => apiFetch(`/experts/${user!.id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: (_d, status) => {
      setIsOnline(status === "ONLINE");
      toast.success(status === "ONLINE" ? "You're online — ready for jobs" : "You're offline");
      qc.invalidateQueries({ queryKey: ["expert-dashboard", user?.id] });
    },
    onError: (e: any) => toast.error(e.message),
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
      toast.success("Withdrawal requested");
      setWithdrawOpen(false); setWdAmount("");
      qc.invalidateQueries({ queryKey: ["expert-dashboard", user?.id] });
      qc.invalidateQueries({ queryKey: ["withdrawals", user?.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const { data: documents = [] } = useQuery({
    enabled: !!user && role === "EXPERT",
    queryKey: ["documents", user?.id],
    queryFn: () => apiFetch(`/experts/${user!.id}/documents`),
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
      toast.success(`${type} uploaded — pending review`);
      qc.invalidateQueries({ queryKey: ["documents", user?.id] });
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploadingType(null);
    }
  }

  if (loading || (isLoading && role === "EXPERT")) return <div className="container mx-auto px-4 py-16"><LoadingSpinner /></div>;
  if (isError) return <div className="container mx-auto max-w-lg px-4 py-20 text-center text-muted-foreground">Could not load your expert profile.</div>;

  const expert = data?.expert;
  const bookings = (data?.bookings ?? []) as any[];
  const activeJobs = bookings.filter((b) => ACTIVE.includes(b.status));
  const completed = bookings.filter((b) => b.status === "COMPLETED").length;
  const currentOnline = isOnline ?? (expert?.status === "ONLINE");

  const stats = [
    { icon: Wallet, label: "Available", value: `₹${Number(data?.wallet?.available_balance ?? 0).toFixed(0)}` },
    { icon: TrendingUp, label: "Total earned", value: `₹${Number(data?.wallet?.total_earned ?? 0).toFixed(0)}` },
    { icon: Briefcase, label: "Active jobs", value: activeJobs.length },
    { icon: Star, label: "Rating", value: Number(expert?.avg_rating ?? 0).toFixed(1) },
  ];

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10">
      {/* Status hero — the focal control for an expert */}
      <div className={cn(
        "relative overflow-hidden rounded-3xl p-6 text-white shadow-lg transition-colors sm:p-8",
        currentOnline ? "bg-gradient-to-br from-emerald-600 to-emerald-700" : "bg-gradient-to-br from-accent to-[oklch(0.30_0.07_292)]",
      )}>
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Hello{expert?.name ? `, ${expert.name.split(" ")[0]}` : ""}</h1>
            <p className="mt-1 text-sm text-white/80">
              {expert?.is_verified ? "Verified expert" : "Verification pending"} · {completed} jobs completed
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-white/90">
              <span className={cn("h-2 w-2 rounded-full", currentOnline ? "animate-pulse bg-white" : "bg-white/40")} />
              {currentOnline ? "You're online — receiving bookings" : "You're offline — go online to get jobs"}
            </div>
          </div>
          <button onClick={() => toggleStatus.mutate(currentOnline ? "OFFLINE" : "ONLINE")} disabled={toggleStatus.isPending}
            className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-accent shadow-md transition-transform hover:scale-105 disabled:opacity-60">
            {currentOnline ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
            {currentOnline ? "Go offline" : "Go online"}
          </button>
        </div>
      </div>

      {!expert?.is_verified && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
          <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-600" />
          <div>
            <h3 className="font-semibold">Verification pending</h3>
            <p className="mt-1 text-sm text-muted-foreground">Our team is reviewing your profile. You'll start receiving bookings once approved.</p>
          </div>
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border bg-card p-5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><s.icon className="h-5 w-5" /></div>
            <div className="mt-3 text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
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

      {/* KYC documents */}
      <div className="mt-6 rounded-2xl border bg-card p-5">
        <h3 className="font-semibold">KYC documents</h3>
        <p className="text-sm text-muted-foreground">Upload a clear photo or PDF of each document to get verified and start receiving bookings.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {([
            { type: "AADHAAR", label: "Aadhaar card", hint: "Front & back" },
            { type: "PAN", label: "PAN card", hint: "Clear photo" },
            { type: "SELFIE", label: "Selfie", hint: "Face clearly visible" },
          ] as const).map(({ type, label, hint }) => {
            const doc = (documents as any[]).find((d) => d.type === type);
            const st: string = doc?.status ?? "MISSING";
            const busy = uploadingType === type;
            const meta = {
              APPROVED: { cls: "text-emerald-600", Icon: CheckCircle2, text: "Approved" },
              REJECTED: { cls: "text-red-600", Icon: XCircle, text: "Rejected" },
              PENDING: { cls: "text-amber-600", Icon: Clock3, text: "Pending review" },
              MISSING: { cls: "text-muted-foreground", Icon: FileUp, text: "Not uploaded" },
            }[st] ?? { cls: "text-muted-foreground", Icon: FileUp, text: st };
            return (
              <label
                key={type}
                className={cn(
                  "group relative flex cursor-pointer flex-col rounded-xl border bg-muted/20 p-3 transition-colors hover:border-primary/50",
                  busy && "pointer-events-none opacity-70",
                  st === "REJECTED" && "border-red-300",
                  st === "APPROVED" && "border-emerald-300",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-medium">{label}</div>
                  <meta.Icon className={cn("h-4 w-4 shrink-0", meta.cls)} />
                </div>
                <div className={cn("mt-0.5 text-xs font-semibold", meta.cls)}>{meta.text}</div>

                {doc?.file_url ? (
                  <div className="mt-2 h-20 overflow-hidden rounded-lg border bg-background">
                    {/\.pdf($|\?)/i.test(doc.file_url)
                      ? <div className="flex h-full items-center justify-center text-xs text-muted-foreground">PDF document</div>
                      : <img src={doc.file_url} alt={label} className="h-full w-full object-cover" />}
                  </div>
                ) : (
                  <div className="mt-2 flex h-20 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
                    {hint}
                  </div>
                )}

                <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                  {busy ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…</>
                        : <><Upload className="h-3.5 w-3.5" /> {st === "MISSING" ? "Choose file" : "Replace"}</>}
                </div>

                {doc?.review_note && <div className="mt-1 text-[11px] text-muted-foreground">Note: {doc.review_note}</div>}

                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  className="hidden"
                  disabled={busy}
                  onChange={(e) => { handleDocFile(type, e.target.files?.[0]); e.currentTarget.value = ""; }}
                />
              </label>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Accepted: JPG, PNG, WEBP or PDF · up to 8MB each.</p>
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

      <h2 className="mt-10 text-lg font-semibold">Active jobs</h2>
      <div className="mt-3 space-y-3">
        {activeJobs.length === 0 ? (
          <EmptyState icon={Briefcase} title="No active jobs" description={currentOnline ? "You're online — new bookings will appear here." : "Go online to start receiving bookings."} />
        ) : (
          activeJobs.map((j) => {
            const next = NEXT_STATUS[j.status];
            return (
              <div key={j.id} className="overflow-hidden rounded-2xl border bg-card">
                <div className="flex flex-wrap items-stretch gap-4">
                  {j.service_image && (
                    <div className="hidden w-32 shrink-0 overflow-hidden bg-muted sm:block">
                      <img src={j.service_image} alt="" loading="lazy" className="h-full w-full object-cover" />
                    </div>
                  )}
                  <div className="flex flex-1 flex-wrap items-start justify-between gap-4 p-5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{j.service_name}</h3>
                        <StatusBadge status={j.status} />
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-sm">
                        <Avatar src={j.customer_avatar} name={j.customer_name} size={24} />
                        <span className="text-muted-foreground">{j.customer_name ?? "Customer"}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" />{Number(j.duration_hours)} hr · {j.booking_type === "INSTANT" ? "Instant" : j.scheduled_at}</span>
                        <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{j.address_snapshot}</span>
                      </div>
                      {j.notes && <p className="mt-2 text-sm">{j.notes}</p>}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">₹{Number(j.expert_amount).toFixed(0)}</div>
                      <div className="text-xs text-muted-foreground">your earning</div>
                      <div className="mt-2 flex flex-col items-end gap-1.5">
                        {next && (
                          <Button size="sm" disabled={advance.isPending}
                            onClick={() => advance.mutate({ id: j.id, status: next.status })}>
                            {next.label}
                          </Button>
                        )}
                        {["ASSIGNED", "ACCEPTED"].includes(j.status) && (
                          <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" disabled={reject.isPending}
                            onClick={() => reject.mutate(j.id)}>
                            Reject
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Live navigation map — shows once the expert is on the way */}
                  {["ON_THE_WAY", "ARRIVED", "IN_PROGRESS"].includes(j.status) && (myLoc || (j.lat && j.lng)) && (
                    <div className="border-t">
                      <LiveMap
                        height={220}
                        expert={myLoc}
                        dest={j.lat && j.lng ? { lat: Number(j.lat), lng: Number(j.lng) } : null}
                      />
                      <div className="flex items-center gap-1.5 px-5 py-2 text-xs font-medium text-muted-foreground">
                        <Navigation className="h-3.5 w-3.5 text-primary" />
                        {myLoc ? (
                          <span className="text-emerald-600 font-semibold">Your live location is on</span>
                        ) : (
                          <span>Enable location for live navigation</span>
                        )}
                        {j.lat && j.lng && <span className="ml-auto">Destination pinned</span>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Recent completed */}
      {completed > 0 && (
        <>
          <h2 className="mt-10 text-lg font-semibold">Recent history</h2>
          <div className="mt-3 space-y-2">
            {bookings.filter((b) => !ACTIVE.includes(b.status)).slice(0, 5).map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-xl border bg-card p-4">
                <div>
                  <div className="font-medium">{b.service_name}</div>
                  <div className="text-xs text-muted-foreground">{b.address_snapshot}</div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={b.status} />
                  <span className="text-sm font-semibold">₹{Number(b.expert_amount).toFixed(0)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
