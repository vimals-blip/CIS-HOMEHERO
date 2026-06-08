import { useEffect, useRef, useState } from "react";

interface Pt { lat: number; lng: number }

// Road routing via OSRM (free, OpenStreetMap-based, no API key required).
// OSRM coordinates are [lng, lat] (GeoJSON); Leaflet needs [lat, lng] — we swap below.
const OSRM_URL = "https://router.project-osrm.org/route/v1/driving";

async function fetchRoute(from: Pt, to: Pt): Promise<[number, number][] | null> {
  try {
    const res = await fetch(
      `${OSRM_URL}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`,
      { signal: AbortSignal.timeout(6000) },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const coords: [number, number][] = data?.routes?.[0]?.geometry?.coordinates;
    if (!coords?.length) return null;
    return coords.map(([lng, lat]) => [lat, lng]); // swap to Leaflet [lat, lng]
  } catch {
    return null;
  }
}

// Free live map using Leaflet + OpenStreetMap tiles (no API key, no billing).
// Rendered client-side only (Leaflet needs the DOM) and updated imperatively
// so the expert marker moves smoothly as new socket pings arrive.
export function LiveMap({ expert, dest, height = 280 }: { expert?: Pt | null; dest?: Pt | null; height?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const expertMarkerRef = useRef<any>(null);
  const destMarkerRef = useRef<any>(null);
  const routeRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  const center = expert ?? dest;

  // Init the map once, after mount (client only).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!containerRef.current || mapRef.current || !center) return;
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, { zoomControl: true, attributionControl: true })
        .setView([center.lat, center.lng], 14);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      const expertIcon = L.divIcon({
        className: "",
        html: '<div style="background:#7c3aed;width:18px;height:18px;border-radius:9999px;border:3px solid white;box-shadow:0 0 0 2px #7c3aed"></div>',
        iconSize: [18, 18], iconAnchor: [9, 9],
      });
      const destIcon = L.divIcon({
        className: "",
        html: '<div style="background:#111827;width:22px;height:28px;border-radius:4px 4px 0 0;border:2px solid white;clip-path:polygon(0 0,100% 0,100% 75%,50% 100%,0 75%)"></div>',
        iconSize: [22, 28], iconAnchor: [11, 28],
      });

      if (expert) expertMarkerRef.current = L.marker([expert.lat, expert.lng], { icon: expertIcon }).addTo(map).bindPopup("Expert");
      if (dest) destMarkerRef.current = L.marker([dest.lat, dest.lng], { icon: destIcon }).addTo(map).bindPopup("Service location");

      mapRef.current = map;
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, [center]);

  // Move expert marker, fit both markers in view, and draw/refresh the road route.
  useEffect(() => {
    if (!ready || !mapRef.current || !expert) return;
    (async () => {
      const L = (await import("leaflet")).default;

      // Move or create the expert marker.
      if (expertMarkerRef.current) {
        expertMarkerRef.current.setLatLng([expert.lat, expert.lng]);
      } else {
        const icon = L.divIcon({
          className: "",
          html: '<div style="background:#7c3aed;width:18px;height:18px;border-radius:9999px;border:3px solid white;box-shadow:0 0 0 2px #7c3aed"></div>',
          iconSize: [18, 18], iconAnchor: [9, 9],
        });
        expertMarkerRef.current = L.marker([expert.lat, expert.lng], { icon }).addTo(mapRef.current).bindPopup("Expert");
      }

      // Keep both markers in view.
      if (dest) {
        mapRef.current.fitBounds([[expert.lat, expert.lng], [dest.lat, dest.lng]], { padding: [50, 50], maxZoom: 15 });
      } else {
        mapRef.current.panTo([expert.lat, expert.lng]);
      }

      // Draw the road route between expert and destination.
      if (dest) {
        const coords = await fetchRoute(expert, dest);
        if (!mapRef.current) return; // component may have unmounted
        if (coords?.length) {
          if (routeRef.current) {
            routeRef.current.setLatLngs(coords);
          } else {
            routeRef.current = L.polyline(coords, {
              color: "#7c3aed",
              weight: 5,
              opacity: 0.85,
            }).addTo(mapRef.current);
            routeRef.current.bringToBack();
          }
        } else if (!routeRef.current) {
          // OSRM unavailable — fall back to a straight dashed line.
          routeRef.current = L.polyline([[expert.lat, expert.lng], [dest.lat, dest.lng]], {
            color: "#7c3aed",
            weight: 3,
            opacity: 0.6,
            dashArray: "8 6",
          }).addTo(mapRef.current);
          routeRef.current.bringToBack();
        }
      }
    })();
  }, [expert, dest, ready]);

  // Clean up on unmount.
  useEffect(() => () => { mapRef.current?.remove?.(); mapRef.current = null; }, []);

  if (!center) return null;
  return <div ref={containerRef} style={{ height, width: "100%" }} className="overflow-hidden rounded-2xl border z-0" />;
}
