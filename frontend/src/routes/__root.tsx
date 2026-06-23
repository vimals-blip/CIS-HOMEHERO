import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
  Link,
  useRouter,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth-context";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
          <span className="text-5xl font-bold text-primary">404</span>
        </div>
        <h2 className="text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
          <span className="text-3xl">⚠️</span>
        </div>
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 inline-flex rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "HomeHero — Trusted home services on demand" },
      { name: "description", content: "Book verified cleaners, plumbers, electricians and more at your doorstep." },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Outfit:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&display=swap" },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            const stored = localStorage.getItem('theme');
            if (stored === 'dark' || (!stored && true)) {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          })();
        ` }} />
      </head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function GlobalStyles() {
  const { data } = useQuery({
    queryKey: ["public-settings-bg-controls"],
    queryFn: () => apiFetch("/cms/settings"),
    staleTime: 1000 * 60 * 5,
  });

  const bgUrl = data?.global_background_image_url;
  const primaryColor = data?.global_primary_color;
  const themeBackground = data?.global_theme_background;
  const themeGlassBg = data?.global_theme_glass_bg;
  
  const glassOpacityPct = data?.global_glass_opacity || "85";
  const bgBlurPx = data?.global_bg_blur || "8";

  // Build root variables string
  let rootVars = "";
  if (primaryColor) rootVars += `--primary: ${primaryColor} !important;\n`;
  if (themeBackground) rootVars += `--background: ${themeBackground} !important;\n`;
  if (themeGlassBg) rootVars += `--glass-bg: ${themeGlassBg} !important;\n`;

  return (
    <>
      {rootVars && (
        <style dangerouslySetInnerHTML={{ __html: `:root:not(.dark) { ${rootVars} }` }} />
      )}
      {bgUrl && (
        <div
          className="fixed inset-0 z-[-50] bg-cover bg-center transition-all duration-1000"
          style={{
            backgroundImage: `url(${bgUrl})`,
            filter: `blur(${bgBlurPx}px) brightness(0.9)`,
            transform: "scale(1.05)",
          }}
        />
      )}
    </>
  );
}

function AppLayout() {
  const { data } = useQuery({
    queryKey: ["public-settings-bg-controls"],
    queryFn: () => apiFetch("/cms/settings"),
    staleTime: 1000 * 60 * 5,
  });
  const glassOpacityPct = data?.global_glass_opacity || "85";

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 relative z-0 container mx-auto px-4 py-8">
        <div 
          className="rounded-3xl backdrop-blur-2xl shadow-2xl ring-1 ring-border/50 min-h-[70vh] overflow-hidden transition-all duration-500"
          style={{ backgroundColor: `color-mix(in srgb, var(--glass-bg) ${glassOpacityPct}%, transparent)` }}
        >
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <GlobalStyles />
        <AppLayout />
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
