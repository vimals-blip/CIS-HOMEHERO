import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Sparkles, Eye, EyeOff, AlertCircle, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth/signup-customer")({
  head: () => ({ meta: [{ title: "Sign up — HomeHero" }] }),
  component: SignupCustomer,
});

const RULES = [
  { id: "len",     label: "At least 8 characters",        test: (p: string) => p.length >= 8 },
  { id: "upper",   label: "One uppercase letter (A–Z)",   test: (p: string) => /[A-Z]/.test(p) },
  { id: "number",  label: "One number (0–9)",              test: (p: string) => /[0-9]/.test(p) },
  { id: "special", label: "One special character (!@#…)", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

function passwordStrength(password: string): 0 | 1 | 2 | 3 {
  const passed = RULES.filter((r) => r.test(password)).length;
  if (passed <= 1) return 1;
  if (passed === 2) return 1;
  if (passed === 3) return 2;
  return 3;
}

const STRENGTH_LABEL = ["", "Weak", "Fair", "Strong"] as const;
const STRENGTH_COLOR = ["", "bg-destructive", "bg-amber-400", "bg-emerald-500"] as const;
const STRENGTH_TEXT  = ["", "text-destructive", "text-amber-600", "text-emerald-600"] as const;

function SignupCustomer() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [k]: e.target.value });
    setFieldErr((f) => { const n = { ...f }; delete n[k]; return n; });
  };
  const touch = (k: string) => () => setTouched((t) => ({ ...t, [k]: true }));

  const strength = useMemo(() => (form.password ? passwordStrength(form.password) : 0), [form.password]);
  const ruleResults = useMemo(() => RULES.map((r) => ({ ...r, ok: r.test(form.password) })), [form.password]);

  const passwordMismatch = touched.confirm && confirmPassword.length > 0 && confirmPassword !== form.password;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (form.name.trim().length < 2) errs.name = "Enter your full name";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = "Enter a valid email address";
    if (form.phone.replace(/\D/g, "").length < 7) errs.phone = "Enter a valid phone number";
    const failedRules = RULES.filter((r) => !r.test(form.password));
    if (failedRules.length > 0) errs.password = failedRules[0].label;
    if (confirmPassword !== form.password) errs.confirm = "Passwords do not match";
    return errs;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, email: true, phone: true, password: true, confirm: true });
    const errs = validate();
    if (Object.keys(errs).length) { setFieldErr(errs); return; }
    setFieldErr({});
    setLoading(true);
    try {
      await apiFetch("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ name: form.name, email: form.email, phone: form.phone, password: form.password, role: "CUSTOMER" }),
      });
      toast.success("Account created! You can now log in.");
      navigate({ to: "/auth/login" });
    } catch (error: any) {
      const msg = error.message ?? "Signup failed";
      if (msg.toLowerCase().includes("email")) setFieldErr({ email: msg });
      else toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-12">
      <div className="text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <Sparkles className="h-5 w-5" />
        </div>
        <h1 className="mt-4 text-2xl font-bold">Create your account</h1>
        <p className="mt-1 text-sm text-muted-foreground">Book trusted home services in seconds</p>
      </div>

      <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-2xl border bg-card p-6">

        {/* Full name */}
        <div className="space-y-1">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" value={form.name} onChange={update("name")} onBlur={touch("name")} required
            className={cn(fieldErr.name && "border-destructive focus-visible:ring-destructive")} />
          {fieldErr.name && <FieldError message={fieldErr.name} />}
        </div>

        {/* Email */}
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={form.email} onChange={update("email")} onBlur={touch("email")} required autoComplete="email"
            className={cn(fieldErr.email && "border-destructive focus-visible:ring-destructive")} />
          {fieldErr.email && <FieldError message={fieldErr.email} />}
        </div>

        {/* Phone */}
        <div className="space-y-1">
          <Label htmlFor="phone">Phone number</Label>
          <Input id="phone" inputMode="numeric" value={form.phone} onChange={update("phone")} onBlur={touch("phone")} required autoComplete="tel"
            placeholder="10-digit mobile number"
            className={cn(fieldErr.phone && "border-destructive focus-visible:ring-destructive")} />
          {fieldErr.phone && <FieldError message={fieldErr.phone} />}
        </div>

        {/* Password */}
        <div className="space-y-1">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={update("password")}
              onBlur={touch("password")}
              required autoComplete="new-password"
              className={cn("pr-10", fieldErr.password && "border-destructive focus-visible:ring-destructive")}
            />
            <button type="button" tabIndex={-1}
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {/* Strength bar — only when user has started typing */}
          {form.password.length > 0 && (
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex flex-1 gap-1">
                  {[1, 2, 3].map((level) => (
                    <div key={level} className={cn(
                      "h-1.5 flex-1 rounded-full transition-colors duration-300",
                      strength >= level ? STRENGTH_COLOR[strength] : "bg-muted",
                    )} />
                  ))}
                </div>
                <span className={cn("text-xs font-medium", STRENGTH_TEXT[strength])}>
                  {STRENGTH_LABEL[strength]}
                </span>
              </div>

              {/* Rule checklist */}
              <ul className="space-y-1">
                {ruleResults.map((r) => (
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
          {fieldErr.password && !form.password && <FieldError message={fieldErr.password} />}
        </div>

        {/* Confirm password */}
        <div className="space-y-1">
          <Label htmlFor="confirm">Confirm password</Label>
          <div className="relative">
            <Input
              id="confirm"
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setFieldErr((f) => { const n = { ...f }; delete n.confirm; return n; }); }}
              onBlur={touch("confirm")}
              required autoComplete="new-password"
              className={cn("pr-10", (passwordMismatch || fieldErr.confirm) && "border-destructive focus-visible:ring-destructive")}
            />
            <button type="button" tabIndex={-1}
              onClick={() => setShowConfirm((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {passwordMismatch && <FieldError message="Passwords do not match" />}
          {fieldErr.confirm && !passwordMismatch && <FieldError message={fieldErr.confirm} />}
          {!passwordMismatch && confirmPassword.length > 0 && confirmPassword === form.password && (
            <p className="flex items-center gap-1 text-xs text-emerald-600">
              <Check className="h-3 w-3" /> Passwords match
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/auth/login" className="font-medium text-primary hover:underline">Log in</Link>
      </div>
    </div>
  );
}

function FieldError({ message }: { message: string }) {
  return (
    <p className="flex items-center gap-1 text-xs text-destructive">
      <AlertCircle className="h-3 w-3 shrink-0" /> {message}
    </p>
  );
}
