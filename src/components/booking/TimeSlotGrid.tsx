import { cn } from "@/lib/utils";
import { Sun, Sunset, Moon } from "lucide-react";

interface TimeSlot {
  time: string;
  disabled?: boolean;
}

const MORNING_SLOTS: TimeSlot[] = [
  { time: "08:00" }, { time: "09:00" }, { time: "10:00" }, { time: "11:00" },
];
const AFTERNOON_SLOTS: TimeSlot[] = [
  { time: "12:00" }, { time: "13:00" }, { time: "14:00" }, { time: "15:00" },
];
const EVENING_SLOTS: TimeSlot[] = [
  { time: "16:00" }, { time: "17:00" }, { time: "18:00" }, { time: "19:00" },
];

function formatSlot(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m} ${ampm}`;
}

interface SlotButtonProps {
  slot: TimeSlot;
  selected: boolean;
  onSelect: (time: string) => void;
}

function SlotButton({ slot, selected, onSelect }: SlotButtonProps) {
  return (
    <button
      type="button"
      disabled={slot.disabled}
      onClick={() => !slot.disabled && onSelect(slot.time)}
      className={cn(
        "relative rounded-xl border px-3 py-2.5 text-sm font-medium transition-all duration-150",
        selected && !slot.disabled
          ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20"
          : slot.disabled
          ? "cursor-not-allowed border-border/40 bg-muted/30 text-muted-foreground/40 line-through"
          : "border-border/60 bg-card text-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
      )}
    >
      {formatSlot(slot.time)}
      {selected && !slot.disabled && (
        <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-primary-glow border-2 border-background" />
      )}
    </button>
  );
}

interface SlotGroupProps {
  label: string;
  icon: React.ReactNode;
  slots: TimeSlot[];
  value?: string;
  onSelect: (time: string) => void;
}

function SlotGroup({ label, icon, slots, value, onSelect }: SlotGroupProps) {
  return (
    <div>
      <div className="mb-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {slots.map((slot) => (
          <SlotButton
            key={slot.time}
            slot={slot}
            selected={value === slot.time}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

interface TimeSlotGridProps {
  value?: string;
  onChange: (slot: string) => void;
  disabledSlots?: string[];
}

export function TimeSlotGrid({ value, onChange, disabledSlots = [] }: TimeSlotGridProps) {
  const isDisabled = (time: string) => disabledSlots.includes(time);

  const morning = MORNING_SLOTS.map((s) => ({ ...s, disabled: isDisabled(s.time) }));
  const afternoon = AFTERNOON_SLOTS.map((s) => ({ ...s, disabled: isDisabled(s.time) }));
  const evening = EVENING_SLOTS.map((s) => ({ ...s, disabled: isDisabled(s.time) }));

  return (
    <div className="space-y-5">
      <SlotGroup
        label="Morning"
        icon={<Sun className="h-3.5 w-3.5 text-amber-500" />}
        slots={morning}
        value={value}
        onSelect={onChange}
      />
      <SlotGroup
        label="Afternoon"
        icon={<Sunset className="h-3.5 w-3.5 text-orange-500" />}
        slots={afternoon}
        value={value}
        onSelect={onChange}
      />
      <SlotGroup
        label="Evening"
        icon={<Moon className="h-3.5 w-3.5 text-indigo-500" />}
        slots={evening}
        value={value}
        onSelect={onChange}
      />
    </div>
  );
}
