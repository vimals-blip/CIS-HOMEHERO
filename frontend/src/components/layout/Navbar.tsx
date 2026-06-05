import { Link, useRouterState } from "@tanstack/react-router";
import {
  Menu, X, LogOut, Home, BookOpen, LayoutDashboard, Settings, Sparkles, ChevronDown, User, Wallet, LifeBuoy,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { Avatar } from "@/components/shared/Avatar";
import { NotificationBell } from "@/components/layout/NotificationBell";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const customerLinks = [
  { to: "/", label: "Home", icon: Home },
  { to: "/bookings", label: "My Bookings", icon: BookOpen },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/support", label: "Support", icon: LifeBuoy },
  { to: "/account", label: "Account", icon: User },
];
const expertLinks = [
  { to: "/expert", label: "Dashboard", icon: LayoutDashboard },
  { to: "/support", label: "Support", icon: LifeBuoy },
  { to: "/account", label: "Account", icon: User },
];
const adminLinks = [
  { to: "/admin", label: "Admin", icon: Settings },
  { to: "/account", label: "Account", icon: User },
];

export function Navbar() {
  const { user, role, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentPath = useRouterState().location.pathname;

  const links = role === "ADMIN" ? adminLinks : role === "EXPERT" ? expertLinks : customerLinks;

  // Pull profile (name + avatar) for the user menu.
  const { data: me } = useQuery({
    enabled: !!user,
    queryKey: ["me"],
    queryFn: () => apiFetch("/me"),
    staleTime: 60_000,
  });

  useEffect(() => { setMobileOpen(false); }, [currentPath]);

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="border-b border-border/60 bg-background/80 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
        <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
          <Link to="/" className="group flex shrink-0 items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/30 transition-transform group-hover:scale-105">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              Home<span className="text-primary">Hero</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-0.5 md:flex">
            {links.map((l) => {
              const isActive = currentPath === l.to || (l.to !== "/" && currentPath.startsWith(l.to));
              return (
                <Link key={l.to} to={l.to} className={cn(
                  "relative rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive ? "text-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}>
                  {l.label}
                  {isActive && <span className="absolute bottom-0 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-primary" />}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5">
            {user && <NotificationBell />}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-muted">
                    <Avatar src={me?.avatar_url} name={me?.name || user.email} size={32} />
                    <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <div className="flex items-center gap-3 px-3 py-2">
                    <Avatar src={me?.avatar_url} name={me?.name || user.email} size={40} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{me?.name || user.email}</div>
                      <div className="text-xs capitalize text-muted-foreground">{role?.toLowerCase()} account</div>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  {links.map((l) => (
                    <DropdownMenuItem key={l.to} asChild>
                      <Link to={l.to} className="flex items-center gap-2">
                        <l.icon className="h-4 w-4 text-muted-foreground" /> {l.label}
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
              <div className="hidden items-center gap-2 md:flex">
                <Button asChild variant="ghost" size="sm"><Link to="/auth/login">Log in</Link></Button>
                <Button asChild size="sm" className="shadow-sm shadow-primary/30"><Link to="/auth/signup-customer">Sign up</Link></Button>
              </div>
            )}

            <button className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 top-16 z-40 bg-background/98 backdrop-blur-xl md:hidden">
          <div className="container mx-auto space-y-2 px-4 py-6">
            {links.map((l) => (
              <Link key={l.to} to={l.to} className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium hover:bg-muted">
                <l.icon className="h-4 w-4" /> {l.label}
              </Link>
            ))}
            <div className="space-y-2 border-t pt-4">
              {user ? (
                <Button variant="outline" className="w-full" onClick={signOut}><LogOut className="mr-2 h-4 w-4" /> Sign out</Button>
              ) : (
                <>
                  <Button asChild className="w-full" size="lg"><Link to="/auth/signup-customer">Sign up</Link></Button>
                  <Button asChild variant="outline" className="w-full" size="lg"><Link to="/auth/login">Log in</Link></Button>
                  <Button asChild variant="ghost" className="w-full"><Link to="/auth/signup-expert">Become an expert</Link></Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
