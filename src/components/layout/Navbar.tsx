import { Link, useRouterState } from "@tanstack/react-router";
import {
  Menu, X, LogOut, Bell,
  Search, MapPin, ChevronDown, Home, Briefcase,
  LayoutDashboard, Settings, BookOpen, Wifi, WifiOff,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const CITIES = ["Bengaluru", "Mumbai", "Delhi", "Hyderabad", "Chennai", "Pune"];

const customerLinks = [
  { to: "/", label: "Home", icon: Home },
  { to: "/bookings", label: "My Bookings", icon: BookOpen },
];
const providerLinks = [
  { to: "/provider", label: "Dashboard", icon: LayoutDashboard },
  { to: "/provider/jobs", label: "Jobs", icon: Briefcase },
];
const adminLinks = [
  { to: "/admin", label: "Admin", icon: Settings },
];

function getInitials(email: string) {
  return email?.[0]?.toUpperCase() ?? "U";
}

const AVATAR_COLORS = [
  "bg-violet-500", "bg-blue-500", "bg-emerald-500",
  "bg-orange-500", "bg-pink-500", "bg-teal-500",
];

function getAvatarColor(email: string) {
  const idx = (email?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

export function Navbar() {
  const { user, role, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [city, setCity] = useState("Bengaluru");
  const [isOnline, setIsOnline] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const links =
    role === "ADMIN" ? adminLinks : role === "PROVIDER" ? providerLinks : customerLinks;

  const toggleProviderStatus = async () => {
    if (!user || statusLoading) return;
    const newStatus = isOnline ? "OFFLINE" : "ONLINE";
    setStatusLoading(true);
    try {
      await apiFetch(`/providers/${user.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      setIsOnline(!isOnline);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to update status");
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [searchOpen]);

  useEffect(() => {
    setMobileOpen(false);
  }, [currentPath]);

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* Glassmorphism bar */}
      <div className="border-b border-border/60 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70 shadow-sm">
        <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">

          {/* Logo */}
          <Link to="/" className="flex shrink-0 items-center gap-2.5 group">
            <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/30 transition-transform group-hover:scale-105">
              <Home className="h-4 w-4" />
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary-glow border-2 border-background" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              Home<span className="text-primary">Hero</span>
            </span>
          </Link>

          {/* City selector — desktop */}
          <div className="hidden md:flex">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  <MapPin className="h-3 w-3 text-primary" />
                  {city}
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44">
                <DropdownMenuLabel className="text-xs text-muted-foreground">Select city</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {CITIES.map((c) => (
                  <DropdownMenuItem
                    key={c}
                    onClick={() => setCity(c)}
                    className={cn("text-sm", city === c && "text-primary font-medium")}
                  >
                    {city === c && <span className="mr-2 h-1.5 w-1.5 rounded-full bg-primary inline-block" />}
                    {c}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-0.5">
            {links.map((l) => {
              const isActive = currentPath === l.to || (l.to !== "/" && currentPath.startsWith(l.to));
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={cn(
                    "relative px-3 py-2 text-sm font-medium transition-colors rounded-lg",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {l.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-primary" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-1.5">
            {/* Search toggle */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className={cn(
                "hidden md:grid h-9 w-9 place-items-center rounded-xl transition-colors",
                searchOpen
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>

            {/* Notification bell */}
            {user && (
              <button className="relative hidden md:grid h-9 w-9 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                <Bell className="h-4 w-4" />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive border-2 border-background" />
              </button>
            )}

            {/* Provider online/offline toggle */}
            {role === "PROVIDER" && (
              <button
                onClick={toggleProviderStatus}
                disabled={statusLoading}
                className={cn(
                  "hidden md:flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all",
                  isOnline
                    ? "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                {isOnline ? "Online" : "Offline"}
              </button>
            )}

            {/* User menu or auth buttons */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-muted transition-colors">
                    <div className={cn(
                      "grid h-8 w-8 place-items-center rounded-full text-xs font-bold text-white shadow-sm",
                      getAvatarColor(user.email)
                    )}>
                      {getInitials(user.email)}
                    </div>
                    <ChevronDown className="hidden sm:block h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <div className="px-3 py-2">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "grid h-10 w-10 place-items-center rounded-full text-sm font-bold text-white",
                        getAvatarColor(user.email)
                      )}>
                        {getInitials(user.email)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{user.email}</div>
                        <div className="text-xs text-muted-foreground capitalize">{role?.toLowerCase()} account</div>
                      </div>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  {links.map((l) => (
                    <DropdownMenuItem key={l.to} asChild>
                      <Link to={l.to} className="flex items-center gap-2">
                        <l.icon className="h-4 w-4 text-muted-foreground" />
                        {l.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Button asChild variant="ghost" size="sm" className="text-sm">
                  <Link to="/auth/login">Log in</Link>
                </Button>
                <Button asChild size="sm" className="text-sm shadow-sm shadow-primary/30">
                  <Link to="/auth/signup-customer">Sign up free</Link>
                </Button>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              className="md:hidden grid h-9 w-9 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Inline search bar */}
        {searchOpen && (
          <div className="hidden md:block border-t border-border/40 bg-background/90 px-4 py-3">
            <div className="container mx-auto max-w-2xl">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={searchRef}
                  placeholder="Search for services — cleaning, plumbing, AC repair…"
                  className="h-11 rounded-xl border-border/60 bg-muted/50 pl-10 pr-4 text-sm focus-visible:ring-primary"
                />
                <button
                  onClick={() => setSearchOpen(false)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Esc
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile full-screen menu */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 top-16 z-40 bg-background/98 backdrop-blur-xl">
          <div className="container mx-auto px-4 py-6 space-y-6">
            {/* City selector mobile */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">City</p>
              <div className="flex flex-wrap gap-2">
                {CITIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCity(c)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                      city === c
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Search mobile */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search services…"
                className="h-12 rounded-xl pl-10 text-sm"
              />
            </div>

            {/* Nav links */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Navigation</p>
              <nav className="space-y-1">
                {links.map((l) => {
                  const isActive = currentPath === l.to || (l.to !== "/" && currentPath.startsWith(l.to));
                  return (
                    <Link
                      key={l.to}
                      to={l.to}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:bg-muted"
                      )}
                    >
                      <l.icon className="h-4 w-4" />
                      {l.label}
                    </Link>
                  );
                })}
                {!user && (
                  <Link
                    to="/auth/signup-provider"
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Briefcase className="h-4 w-4" />
                    Become a provider
                  </Link>
                )}
              </nav>
            </div>

            {/* Provider online toggle mobile */}
            {role === "PROVIDER" && (
              <button
                onClick={toggleProviderStatus}
                disabled={statusLoading}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all",
                  isOnline
                    ? "bg-success/15 text-success"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                {isOnline ? "You're Online" : "You're Offline"}
              </button>
            )}

            {/* Auth buttons mobile */}
            {user ? (
              <div className="space-y-2 border-t pt-4">
                <div className="flex items-center gap-3 px-1 py-2">
                  <div className={cn(
                    "grid h-10 w-10 place-items-center rounded-full text-sm font-bold text-white",
                    getAvatarColor(user.email)
                  )}>
                    {getInitials(user.email)}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{user.email}</div>
                    <div className="text-xs text-muted-foreground capitalize">{role?.toLowerCase()}</div>
                  </div>
                </div>
                <Button variant="outline" className="w-full" onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </Button>
              </div>
            ) : (
              <div className="space-y-2 border-t pt-4">
                <Button asChild className="w-full" size="lg">
                  <Link to="/auth/signup-customer">Sign up free</Link>
                </Button>
                <Button asChild variant="outline" className="w-full" size="lg">
                  <Link to="/auth/login">Log in</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
