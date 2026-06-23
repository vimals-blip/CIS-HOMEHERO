# HomeHero Frontend Architecture & Developer Guide

Welcome to the HomeHero frontend developer guide! This document explains how the user interface is structured, how data flows from the client to the API, and how the layout is rendered. Reading this guide will equip you with the knowledge to create new pages, modify existing dashboards, and write custom features.

---

## 1. Core Technology Stack
- **Framework**: React 19 (for visual components) & TanStack Start (supporting Server-Side Rendering (SSR) and client-side hydration).
- **Routing**: TanStack Router (providing fully type-safe filesystem routing).
- **Styling**: Tailwind CSS v4 (with custom OKLCH color systems and animation layers).
- **Data Caching**: TanStack Query (React Query) for state caching and optimistic UI updates.
- **Real-time Sync**: Socket.io-client for live coordinate tracking and job dispatch streams.

---

## 2. Directory Structure

```
frontend/
├── src/
│   ├── components/         ◄── Reusable UI components (buttons, badges, maps, spinners)
│   ├── hooks/              ◄── Custom hooks (e.g., location polling, audio alerts)
│   ├── lib/
│   │   ├── api.ts          ◄── HTTP client wrapper including JWT authorization headers
│   │   ├── auth-context.tsx◄── User session provider (exposes useAuth())
│   │   └── socket.ts       ◄── Socket.io client initialization
│   ├── routes/             ◄── File-system routing components (Pages)
│   │   ├── __root.tsx      ◄── Global app template (HTML shell, headers, and Query Clients)
│   │   ├── index.tsx       ◄── Landing / Home page route (/)
│   │   ├── bookings.tsx    ◄── Customer bookings panel (/bookings)
│   │   ├── wallet.tsx      ◄── Payment top-up and ledger (/wallet)
│   │   ├── support.tsx     ◄── Support tickets and chat rooms (/support)
│   │   ├── account.tsx     ◄── User settings dashboard (/account)
│   │   └── expert.index.tsx◄── Provider operations board (/expert)
│   ├── routeTree.gen.ts    ◄── Auto-compiled routing index (Do not edit manually)
│   ├── router.tsx          ◄── TanStack Router configuration
│   ├── start.ts            ◄── Client-side hydration script
│   └── styles.css          ◄── Tailwind configuration, imports, and global styles
```

---

## 3. Hydration & Route Lifecycle

When a user visits the site:
1. **SSR Phase**: The server renders the initial HTML for fast Largest Contentful Paint (LCP) and SEO indexing.
2. **Hydration**: [start.ts](file:///var/www/html/Urban-Service/homehero-spark/frontend/src/start.ts) loads, parsing the compiled bundle and attaching React event listeners to the pre-rendered HTML.
3. **Router Mount**: [router.tsx](file:///var/www/html/Urban-Service/homehero-spark/frontend/src/router.tsx) instantiates the TanStack Router based on the routes registered in the auto-generated [routeTree.gen.ts](file:///var/www/html/Urban-Service/homehero-spark/frontend/src/routeTree.gen.ts).
4. **Shell Loading**: [__root.tsx](file:///var/www/html/Urban-Service/homehero-spark/frontend/src/routes/__root.tsx) renders the core layouts (headers, footers, toast containers, and global error boundaries) and mounts the `<Outlet />` representing the active route.

---

## 4. State Management & Hooks

### A. Authentication & Roles (`useAuth`)
Authentication is governed by `AuthProvider` in [auth-context.tsx](file:///var/www/html/Urban-Service/homehero-spark/frontend/src/lib/auth-context.tsx). 
You can determine who is currently logged in by importing:
```tsx
import { useAuth } from "@/lib/auth-context";

function MyComponent() {
  const { user, role, loading, logout } = useAuth();
  
  if (loading) return <Spinner />;
  if (!user) return <LoginRedirect />;
  
  return <div>Logged in as: {user.name} ({role})</div>;
}
```

### B. Data Fetching & Mutations (TanStack Query)
Instead of executing standard `useEffect` loops for data fetching, the app relies on **React Query** queries and mutations for caching, loading animations, and queries refresh:

```tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

function CustomerBookings() {
  const qc = useQueryClient();

  // 1. Fetch data from backend with cache key
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["my-bookings"],
    queryFn: () => apiFetch("/bookings")
  });

  // 2. Perform a state modification
  const cancelBooking = useMutation({
    mutationFn: (id: string) => apiFetch(`/bookings/${id}/cancel`, { method: "PATCH" }),
    onSuccess: () => {
      // Invalidate the cache key to automatically re-fetch updated data
      qc.invalidateQueries({ queryKey: ["my-bookings"] });
    }
  });

  if (isLoading) return <LoadingSpinner />;
  
  return (
    <div>
      {bookings.map(b => (
        <button onClick={() => cancelBooking.mutate(b.id)}>Cancel Booking</button>
      ))}
    </div>
  );
}
```

---

## 5. WebSockets & Real-time Synchronization

Active tracking dashboards (like `/track/$bookingId` or `/expert`) require instantaneous updates. We initialize Socket.io client connections via [socket.ts](file:///var/www/html/Urban-Service/homehero-spark/frontend/src/lib/socket.ts):

```tsx
import { getSocket } from "@/lib/socket";

// 1. Join a booking socket channel room
useEffect(() => {
  const socket = getSocket();
  if (!socket) return;

  socket.emit("join_booking", { bookingId });

  // 2. Listen to real-time events emitted by the backend dispatcher
  socket.on("booking_assigned", (data) => {
    toast.success("An expert has been assigned!");
  });

  return () => {
    socket.off("booking_assigned");
  };
}, [bookingId]);
```

---

## 6. Styling & Design Tokens

Styles use **Tailwind CSS v4** configurations declared in [styles.css](file:///var/www/html/Urban-Service/homehero-spark/frontend/src/styles.css). Colors use the highly responsive **OKLCH space** (supporting vibrant rendering in modern screens):

### Predefined Utility Classes:
- `.text-gradient`: Applies custom text gradient styling using primary glow colors.
- `.hover-lift`: Elevates cards smoothly by translation and drop-shadow on cursor hover.
- `.animate-float-slow` / `.animate-float-medium` / `.animate-float-fast`: Subtle bobbing keyframes used for overlay glassmorphism panels.

---

## 7. Writing a New Route (Step-by-Step)

If you want to create a new page, say `/help`:

1.  **Create file**: Create a file named `help.tsx` inside `frontend/src/routes/`.
2.  **Define Route**:
    ```tsx
    import { createFileRoute } from "@tanstack/react-router";

    export const Route = createFileRoute("/help")({
      component: HelpComponent,
    });

    function HelpComponent() {
      return (
        <div className="container mx-auto px-4 py-10">
          <h1 className="text-2xl font-bold">Help & Documentation</h1>
          <p>Please browse our FAQ guides below.</p>
        </div>
      );
    }
    ```
3.  **Compile Routes**: Run a compilation shell. The compiler will watch for new files and automatically generate bindings inside `routeTree.gen.ts`.
