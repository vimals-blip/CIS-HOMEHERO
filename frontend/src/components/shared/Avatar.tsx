import { useState } from "react";
import { cn } from "@/lib/utils";

const GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-amber-600",
  "from-pink-500 to-rose-600",
  "from-primary to-primary-glow",
];

function gradientFor(seed: string) {
  return GRADIENTS[(seed?.charCodeAt(0) ?? 0) % GRADIENTS.length];
}

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
  ring?: boolean;
}

// Image avatar that gracefully falls back to gradient initials if the image
// is missing or fails to load.
export function Avatar({ src, name = "", size = 40, className, ring }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const initial = (name?.trim()?.[0] ?? "?").toUpperCase();
  const showImg = src && !failed;

  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-full font-bold text-white shadow-sm",
        !showImg && `bg-gradient-to-br ${gradientFor(name || "?")}`,
        ring && "ring-2 ring-background",
        className,
      )}
    >
      {showImg ? (
        <img src={src!} alt={name ?? ""} className="h-full w-full object-cover" onError={() => setFailed(true)} loading="lazy" />
      ) : (
        initial
      )}
    </div>
  );
}
