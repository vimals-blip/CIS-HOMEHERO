import { Link } from "@tanstack/react-router";
import { Menu, Sparkles, LogOut, User as UserIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const customerLinks = [
  { to: "/", label: "Home" },
  { to: "/bookings", label: "My Bookings" },
];
const providerLinks = [
  { to: "/provider", label: "Dashboard" },
  { to: "/provider/jobs", label: "Jobs" },
];
const adminLinks = [
  { to: "/admin", label: "Admin" },
];

export function Navbar() {
  const { user, role, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const links =
    role === "ADMIN" ? adminLinks : role === "PROVIDER" ? providerLinks : customerLinks;

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold text-lg">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="tracking-tight">HomeHero</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              activeProps={{ className: "px-3 py-2 text-sm font-medium text-foreground" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                    {user.email?.[0]?.toUpperCase() ?? "U"}
                  </span>
                  <span className="hidden sm:inline text-sm">{role}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">
                  {user.email}
                </div>
                <DropdownMenuSeparator />
                {links.map((l) => (
                  <DropdownMenuItem key={l.to} asChild>
                    <Link to={l.to}>{l.label}</Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth/login">Log in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/auth/signup-customer">Sign up</Link>
              </Button>
            </>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t bg-background">
          <nav className="container mx-auto flex flex-col px-4 py-2">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="py-2 text-sm font-medium"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            {!user && (
              <Link to="/auth/signup-provider" className="py-2 text-sm font-medium text-primary">
                Become a provider
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
