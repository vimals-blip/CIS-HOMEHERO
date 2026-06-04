interface Pt { lat: number; lng: number }

// Live map of the expert's location. Uses Google Maps Embed when
// VITE_GOOGLE_MAPS_KEY is set; otherwise a keyless OpenStreetMap embed.
export function LiveMap({ expert, dest, height = 220 }: { expert?: Pt | null; dest?: Pt | null; height?: number }) {
  const key = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;
  const center = expert ?? dest;
  if (!center) return null;

  let src: string;
  if (key) {
    // Google Maps Embed (place mode drops a marker at the point).
    src = `https://www.google.com/maps/embed/v1/place?key=${key}&q=${center.lat},${center.lng}&zoom=15`;
  } else {
    const d = 0.008;
    const bbox = `${center.lng - d},${center.lat - d},${center.lng + d},${center.lat + d}`;
    src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${center.lat},${center.lng}`;
  }

  return (
    <div className="overflow-hidden rounded-2xl border">
      <iframe
        title="Live location"
        src={src}
        style={{ width: "100%", height, border: 0 }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
