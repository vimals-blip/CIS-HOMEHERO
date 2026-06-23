import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import {
  Check, Sparkles, Upload, Loader2, CreditCard, IdCard, Camera, X,
  Plus, Minus, ChevronRight, User, Briefcase, FileCheck, ArrowRight,
  Eye, EyeOff, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch, uploadFile, setTokens } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth/signup-expert")({
  head: () => ({ meta: [{ title: "Become an expert — HomeHero" }] }),
  component: SignupExpert,
});

const step1Schema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  email: z.string().email("Enter a valid email address"),
  phone: z.string().trim().min(7, "Enter a valid phone number").max(20),
  city: z.string().trim().min(2, "City is required").max(80),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const PW_RULES = [
  { id: "len",     label: "At least 8 characters",        test: (p: string) => p.length >= 8 },
  { id: "upper",   label: "One uppercase letter (A–Z)",   test: (p: string) => /[A-Z]/.test(p) },
  { id: "number",  label: "One number (0–9)",              test: (p: string) => /[0-9]/.test(p) },
  { id: "special", label: "One special character (!@#…)", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

function pwStrength(pw: string): 0 | 1 | 2 | 3 {
  const n = PW_RULES.filter((r) => r.test(pw)).length;
  if (!pw) return 0;
  if (n <= 2) return 1;
  if (n === 3) return 2;
  return 3;
}
const STRENGTH_LABEL = ["", "Weak", "Fair", "Strong"] as const;
const STRENGTH_COLOR = ["", "bg-destructive", "bg-amber-400", "bg-emerald-500"] as const;
const STRENGTH_TEXT  = ["", "text-destructive", "text-amber-600", "text-emerald-600"] as const;

type FieldErrors = Partial<Record<string, string>>;

const GENDERS = ["FEMALE", "MALE", "OTHER"] as const;

const DOC_TYPES = [
  { type: "AADHAAR", label: "Aadhaar card", Icon: IdCard },
  { type: "PAN", label: "PAN card", Icon: CreditCard },
  { type: "SELFIE", label: "Selfie / Photo", Icon: Camera },
] as const;

type DocType = (typeof DOC_TYPES)[number]["type"];

const STEPS = [
  { icon: User, label: "Personal info", desc: "Your basic details" },
  { icon: Briefcase, label: "Your expertise", desc: "Services & experience" },
  { icon: FileCheck, label: "Verification", desc: "KYC documents (optional)" },
];

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="flex items-center gap-1 mt-1 text-xs text-destructive">
      <AlertCircle className="h-3 w-3 shrink-0" /> {msg}
    </p>
  );
}

function SignupExpert() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState<"forward" | "back">("forward");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [info, setInfo] = useState({
    name: "", email: "", phone: "", city: "", password: "", bio: "",
    gender: "FEMALE" as typeof GENDERS[number], experience: 0,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [docs, setDocs] = useState<Record<DocType, File | null>>({ AADHAAR: null, PAN: null, SELFIE: null });
  const prevStep = useRef(1);

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: () => apiFetch("/services"),
  });

  const goTo = (nextStep: number) => {
    setDir(nextStep > step ? "forward" : "back");
    prevStep.current = step;
    setStep(nextStep);
    setErrors({});
  };

  const pwStrengthLevel = useMemo(() => pwStrength(info.password), [info.password]);
  const pwRuleResults   = useMemo(() => PW_RULES.map((r) => ({ ...r, ok: r.test(info.password) })), [info.password]);
  const passwordMismatch = confirmTouched && confirmPassword.length > 0 && confirmPassword !== info.password;

  const next = () => {
    if (step === 1) {
      const p = step1Schema.safeParse(info);
      if (!p.success) {
        const errs: FieldErrors = {};
        p.error.issues.forEach((iss) => { if (iss.path[0]) errs[String(iss.path[0])] = iss.message; });
        setErrors(errs);
        toast.error(p.error.issues[0].message);
        return;
      }
      const failedRule = PW_RULES.find((r) => !r.test(info.password));
      if (failedRule) {
        setErrors((e) => ({ ...e, password: failedRule.label }));
        toast.error("Password doesn't meet all requirements");
        return;
      }
      if (confirmPassword !== info.password) {
        setErrors((e) => ({ ...e, confirm: "Passwords do not match" }));
        setConfirmTouched(true);
        toast.error("Passwords do not match");
        return;
      }
    }
    if (step === 2 && selected.length === 0) {
      toast.error("Select at least one service");
      return;
    }
    goTo(step + 1);
  };

  const validateField = (field: string, value: string) => {
    const partial = step1Schema.shape[field as keyof typeof step1Schema.shape];
    if (!partial) return;
    const result = (partial as z.ZodType).safeParse(value);
    setErrors((e) => ({ ...e, [field]: result.success ? undefined : result.error.issues[0].message }));
  };

  const bind = (field: keyof typeof info) => ({
    value: info[field] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setInfo({ ...info, [field]: e.target.value });
    },
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => validateField(field, e.target.value),
    className: cn("mt-1", errors[field] && "border-destructive focus-visible:ring-destructive"),
  });

  const submit = async () => {
    setLoading(true);
    try {
      setLoadingMsg("Creating your account…");
      await apiFetch("/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          name: info.name, email: info.email, phone: info.phone,
          password: info.password, city: info.city,
          role: "EXPERT", gender: info.gender, bio: info.bio,
          experience_years: info.experience, service_ids: selected,
        }),
      });

      const auth = await apiFetch<{ accessToken: string; refreshToken?: string; user: { id: string } }>(
        "/auth/login",
        { method: "POST", body: JSON.stringify({ email: info.email, password: info.password }) },
      );
      setTokens(auth.accessToken, auth.refreshToken);
      const expertId = auth.user.id;

      const chosen = DOC_TYPES.filter(({ type }) => docs[type]);
      for (let i = 0; i < chosen.length; i++) {
        const { type } = chosen[i];
        setLoadingMsg(`Uploading ${type} (${i + 1}/${chosen.length})…`);
        const { file_url } = await uploadFile<{ file_url: string }>(
          docs[type]!, { folder: `kyc/${type.toLowerCase()}` },
        );
        await apiFetch(`/experts/${expertId}/documents`, {
          method: "POST",
          body: JSON.stringify({ type, file_url }),
        });
      }

      toast.success(
        chosen.length
          ? "Welcome! Your documents are in review — we'll verify you shortly."
          : "Welcome! Add your KYC documents anytime to get verified.",
      );
      navigate({ to: "/expert" });
    } catch (e: any) {
      toast.error(e.message ?? "Signup failed");
    } finally {
      setLoading(false);
      setLoadingMsg("");
    }
  };

  const toggle = (id: string) =>
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  const chosenDocs = DOC_TYPES.filter(({ type }) => docs[type]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/40 to-background">
      <div className="container mx-auto max-w-3xl px-4 py-12">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 mb-4">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">Become a HomeHero expert</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Flexible hours, steady bookings — sign up in 3 steps</p>
        </div>

        {/* Step indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            {STEPS.map((s, i) => {
              const n = i + 1;
              const done = step > n;
              const active = step === n;
              return (
                <div key={s.label} className="flex flex-1 items-center">
                  <button
                    type="button"
                    disabled={n > step}
                    onClick={() => n < step && goTo(n)}
                    className={cn(
                      "flex items-center gap-2 transition-opacity",
                      n < step ? "cursor-pointer hover:opacity-80" : "cursor-default",
                    )}
                  >
                    <div className={cn(
                      "grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 text-sm font-semibold transition-all duration-300",
                      active && "border-primary bg-primary text-primary-foreground scale-110 shadow-md shadow-primary/30",
                      done && "border-primary bg-primary/10 text-primary",
                      !active && !done && "border-border text-muted-foreground",
                    )}>
                      {done ? <Check className="h-4 w-4" /> : n}
                    </div>
                    <div className="hidden sm:block text-left">
                      <div className={cn("text-xs font-semibold", active ? "text-primary" : done ? "text-primary/70" : "text-muted-foreground")}>{s.label}</div>
                      <div className="text-[10px] text-muted-foreground">{s.desc}</div>
                    </div>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className="flex-1 mx-2">
                      <div className={cn("h-0.5 rounded-full transition-all duration-500", step > n ? "bg-primary" : "bg-border")} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {/* Progress bar */}
          <div className="h-1 rounded-full bg-border overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Card */}
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div
            className={cn(
              "transition-all duration-300",
              dir === "forward" ? "animate-slide-in-right" : "animate-slide-in-left",
            )}
            key={step}
          >
            <div className="p-6">
              {/* ── Step 1: Personal info ────────────────────────────────────── */}
              {step === 1 && (
                <div className="space-y-5">
                  <div className="border-b pb-4">
                    <h2 className="text-lg font-semibold">Personal information</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">Tell us about yourself. All fields are required.</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label>Full name</Label>
                      <Input placeholder="Priya Sharma" {...bind("name")} />
                      <FieldError msg={errors.name} />
                    </div>
                    <div>
                      <Label>Phone number</Label>
                      <Input placeholder="9876543210" {...bind("phone")} />
                      <FieldError msg={errors.phone} />
                    </div>
                    <div>
                      <Label>Email address</Label>
                      <Input type="email" placeholder="priya@email.com" {...bind("email")} />
                      <FieldError msg={errors.email} />
                    </div>
                    <div>
                      <Label>City</Label>
                      <Input placeholder="Bengaluru" {...bind("city")} />
                      <FieldError msg={errors.city} />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <Label>Password</Label>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="At least 8 characters"
                          autoComplete="new-password"
                          {...bind("password")}
                          className={cn("pr-10 mt-1", errors.password && "border-destructive focus-visible:ring-destructive")}
                        />
                        <button type="button" tabIndex={-1}
                          onClick={() => setShowPassword((s) => !s)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>

                      {info.password.length > 0 && (
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="flex flex-1 gap-1">
                              {[1, 2, 3].map((level) => (
                                <div key={level} className={cn(
                                  "h-1.5 flex-1 rounded-full transition-colors duration-300",
                                  pwStrengthLevel >= level ? STRENGTH_COLOR[pwStrengthLevel] : "bg-muted",
                                )} />
                              ))}
                            </div>
                            <span className={cn("text-xs font-medium", STRENGTH_TEXT[pwStrengthLevel])}>
                              {STRENGTH_LABEL[pwStrengthLevel]}
                            </span>
                          </div>
                          <ul className="space-y-1">
                            {pwRuleResults.map((r) => (
                              <li key={r.id} className={cn("flex items-center gap-1.5 text-xs transition-colors",
                                r.ok ? "text-emerald-600" : "text-muted-foreground")}>
                                {r.ok
                                  ? <Check className="h-3 w-3 shrink-0 text-emerald-500" />
                                  : <X className="h-3 w-3 shrink-0 text-muted-foreground/50" />}
                                {r.label}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {errors.password && !info.password && <FieldError msg={errors.password} />}
                    </div>

                    <div className="sm:col-span-2 space-y-1">
                      <Label>Confirm password</Label>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Re-enter your password"
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={(e) => { setConfirmPassword(e.target.value); setErrors((er) => { const n = { ...er }; delete n.confirm; return n; }); }}
                          onBlur={() => setConfirmTouched(true)}
                          className={cn("pr-10 mt-1", (passwordMismatch || errors.confirm) && "border-destructive focus-visible:ring-destructive")}
                        />
                        <button type="button" tabIndex={-1}
                          onClick={() => setShowPassword((s) => !s)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {passwordMismatch && <FieldError msg="Passwords do not match" />}
                      {errors.confirm && !passwordMismatch && <FieldError msg={errors.confirm} />}
                      {!passwordMismatch && confirmPassword.length > 0 && confirmPassword === info.password && (
                        <p className="flex items-center gap-1 text-xs text-emerald-600 mt-1">
                          <Check className="h-3 w-3" /> Passwords match
                        </p>
                      )}
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Short bio <span className="text-muted-foreground font-normal">(optional)</span></Label>
                      <Textarea
                        value={info.bio}
                        onChange={(e) => setInfo({ ...info, bio: e.target.value })}
                        placeholder="Tell families a bit about yourself and your work…"
                        rows={3}
                        className="mt-1 resize-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 2: Services & experience ──────────────────────────── */}
              {step === 2 && (
                <div className="space-y-5">
                  <div className="border-b pb-4">
                    <h2 className="text-lg font-semibold">Your expertise</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">Select the services you can offer and tell us your experience.</p>
                  </div>

                  <div>
                    <Label className="mb-2 block">Services you offer <span className="text-muted-foreground font-normal">(pick all that apply)</span></Label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {(services as any[]).map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => toggle(s.id)}
                          className={cn(
                            "group relative rounded-xl border px-3 py-3 text-sm font-medium transition-all text-left",
                            selected.includes(s.id)
                              ? "border-primary bg-primary/5 text-primary shadow-sm"
                              : "hover:border-primary/40 hover:bg-muted/40",
                          )}
                        >
                          {selected.includes(s.id) && (
                            <span className="absolute right-2 top-2 grid h-4 w-4 place-items-center rounded-full bg-primary text-primary-foreground">
                              <Check className="h-2.5 w-2.5" />
                            </span>
                          )}
                          <span className="block text-xs font-normal text-muted-foreground">₹{s.rate_per_hour}/hr</span>
                          {s.name}
                        </button>
                      ))}
                    </div>
                    {selected.length > 0 && (
                      <p className="mt-2 text-xs text-primary font-medium">{selected.length} service{selected.length > 1 ? "s" : ""} selected</p>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label className="mb-2 block">Years of experience</Label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setInfo({ ...info, experience: Math.max(0, info.experience - 1) })}
                          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border bg-muted hover:bg-muted/80 transition-colors"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <div className="flex-1 rounded-xl border bg-card px-4 py-2 text-center font-semibold text-lg">
                          {info.experience}
                          <span className="ml-1 text-xs font-normal text-muted-foreground">yr{info.experience !== 1 ? "s" : ""}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setInfo({ ...info, experience: Math.min(40, info.experience + 1) })}
                          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border bg-muted hover:bg-muted/80 transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <Label className="mb-2 block">Gender</Label>
                      <div className="flex gap-2">
                        {GENDERS.map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setInfo({ ...info, gender: g })}
                            className={cn(
                              "flex-1 rounded-xl border py-2 text-xs font-medium capitalize transition-all",
                              info.gender === g ? "border-primary bg-primary/10 text-primary shadow-sm" : "hover:border-primary/40",
                            )}
                          >
                            {g.toLowerCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 3: KYC documents ──────────────────────────────────── */}
              {step === 3 && (
                <div className="space-y-5">
                  <div className="border-b pb-4">
                    <h2 className="text-lg font-semibold">Verification documents</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Upload your Aadhaar, PAN and a selfie to get verified faster. All optional — add anytime from your dashboard.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {DOC_TYPES.map(({ type, label, Icon }) => {
                      const file = docs[type];
                      const preview = file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
                      return (
                        <label
                          key={type}
                          className={cn(
                            "group relative flex cursor-pointer flex-col rounded-xl border-2 border-dashed p-3 text-center transition-all hover:border-primary/60 hover:shadow-sm",
                            file ? "border-primary/60 bg-primary/5" : "bg-muted/20 hover:bg-muted/30",
                          )}
                        >
                          <div className="mx-auto flex h-24 w-full items-center justify-center overflow-hidden rounded-lg bg-muted/40">
                            {preview
                              ? <img src={preview} alt={label} className="h-full w-full object-cover" />
                              : file
                                ? <div className="text-xs text-muted-foreground font-medium">PDF ready</div>
                                : <Icon className="h-8 w-8 text-muted-foreground/60" />}
                          </div>
                          <div className="mt-2 text-sm font-semibold">{label}</div>
                          <div className={cn(
                            "mt-0.5 inline-flex items-center justify-center gap-1 text-xs font-medium",
                            file ? "text-primary" : "text-muted-foreground",
                          )}>
                            {file
                              ? <><Check className="h-3.5 w-3.5" /> Selected</>
                              : <><Upload className="h-3.5 w-3.5" /> Choose file</>}
                          </div>
                          {file && (
                            <button
                              type="button"
                              onClick={(e) => { e.preventDefault(); setDocs((d) => ({ ...d, [type]: null })); }}
                              className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-background/90 text-muted-foreground shadow hover:text-foreground transition-colors"
                              aria-label={`Remove ${label}`}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,application/pdf"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0] ?? null;
                              setDocs((d) => ({ ...d, [type]: f }));
                              e.currentTarget.value = "";
                            }}
                          />
                        </label>
                      );
                    })}
                  </div>

                  <p className="text-xs text-muted-foreground">Accepted: JPG, PNG, WEBP or PDF · up to 8 MB each. Your account stays in review until our team approves it.</p>

                  {/* Profile preview */}
                  <div className="rounded-xl border bg-muted/30 p-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Your expert profile preview</p>
                    <div className="flex items-center gap-3">
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground text-lg font-bold shadow-sm">
                        {info.name ? info.name.trim().charAt(0).toUpperCase() : "?"}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{info.name || "Your name"}</div>
                        <div className="text-xs text-muted-foreground">{info.city || "Your city"} · {info.experience} yr{info.experience !== 1 ? "s" : ""} exp</div>
                        {selected.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {(services as any[]).filter((s) => selected.includes(s.id)).slice(0, 3).map((s) => (
                              <span key={s.id} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">{s.name}</span>
                            ))}
                            {selected.length > 3 && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">+{selected.length - 3}</span>}
                          </div>
                        )}
                        {chosenDocs.length > 0 && (
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-primary font-medium">
                            <Check className="h-3 w-3" /> {chosenDocs.length} document{chosenDocs.length > 1 ? "s" : ""} ready to upload
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between gap-3 border-t bg-muted/20 px-6 py-4">
            <Button variant="ghost" onClick={() => goTo(step - 1)} disabled={step === 1} className="gap-1.5">
              Back
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden sm:block">Step {step} of {STEPS.length}</span>
              {step < 3 ? (
                <Button onClick={next} className="gap-1.5 min-w-32">
                  Continue <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={submit} disabled={loading} className="min-w-48 gap-1.5">
                  {loading
                    ? <><Loader2 className="h-4 w-4 animate-spin" />{loadingMsg || "Creating…"}</>
                    : <><ArrowRight className="h-4 w-4" /> Create my account</>}
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/auth/login" className="font-medium text-primary hover:underline">Log in</Link>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(32px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-32px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in-right { animation: slideInRight 0.25s ease-out; }
        .animate-slide-in-left  { animation: slideInLeft  0.25s ease-out; }
      `}</style>
    </div>
  );
}
