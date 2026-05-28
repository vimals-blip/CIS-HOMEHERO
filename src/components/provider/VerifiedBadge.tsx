import { BadgeCheck } from "lucide-react";

export function VerifiedBadge({ size = 14 }: { size?: number }) {
  return (
    <span
      title="Verified provider"
      className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
    >
      <BadgeCheck style={{ width: size, height: size }} />
      Verified
    </span>
  );
}
