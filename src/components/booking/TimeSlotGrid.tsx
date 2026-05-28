import { cn } from "@/lib/utils";

const SLOTS = [
  "08:00", "09:00", "10:00", "11:00",
  "12:00", "13:00", "14:00", "15:00",
  "16:00", "17:00", "18:00", "19:00",
];

export function TimeSlotGrid({
  value,
  onChange,
}: {
  value?: string;
  onChange: (slot: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {SLOTS.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className={cn(
            "rounded-xl border px-3 py-2.5 text-sm font-medium transition-all",
            value === s
              ? "border-primary bg-primary text-primary-foreground"
              : "hover:border-primary/40 hover:bg-primary/5"
          )}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
