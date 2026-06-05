import { useEffect, useRef, useState } from "react";

interface Pt { lat: number; lng: number }

// Free live map using Leaflet + OpenStreetMap tiles (no API key, no billing).
// Rendered client-side only (Leaflet needs the DOM) and updated imperatively
// so the expert marker moves smoothly as new socket pings arrive.
export function LiveMap({ expert, dest, height = 280 }: { expert?: Pt | null; dest?: Pt | null; height?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const expertMarkerRef = useRef<any>(null);
  const destMarkerRef = useRef<any>(null);
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
        html: '<div style="background:#111;width:14px;height:14px;border-radius:3px;border:2px solid white"></div>',
        iconSize: [14, 14], iconAnchor: [7, 7],
      });

      if (expert) expertMarkerRef.current = L.marker([expert.lat, expert.lng], { icon: expertIcon }).addTo(map).bindPopup("Your expert");
      if (dest) destMarkerRef.current = L.marker([dest.lat, dest.lng], { icon: destIcon }).addTo(map).bindPopup("Service location");

      mapRef.current = map;
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, [center]);

  // Move the expert marker on new pings; keep both markers in view.
  useEffect(() => {
    if (!ready || !mapRef.current || !expert) return;
    (async () => {
      const L = (await import("leaflet")).default;
      if (expertMarkerRef.current) expertMarkerRef.current.setLatLng([expert.lat, expert.lng]);
      else {
        const icon = L.divIcon({ className: "", html: '<div style="background:#7c3aed;width:18px;height:18px;border-radius:9999px;border:3px solid white;box-shadow:0 0 0 2px #7c3aed"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });
        expertMarkerRef.current = L.marker([expert.lat, expert.lng], { icon }).addTo(mapRef.current);
      }
      if (dest && destMarkerRef.current) {
        mapRef.current.fitBounds([[expert.lat, expert.lng], [dest.lat, dest.lng]], { padding: [40, 40], maxZoom: 15 });
      } else {
        mapRef.current.panTo([expert.lat, expert.lng]);
      }
    })();
  }, [expert, dest, ready]);

  // Clean up on unmount.
  useEffect(() => () => { mapRef.current?.remove?.(); mapRef.current = null; }, []);

  if (!center) return null;
  return <div ref={containerRef} style={{ height, width: "100%" }} className="overflow-hidden rounded-2xl border z-0" />;
}
