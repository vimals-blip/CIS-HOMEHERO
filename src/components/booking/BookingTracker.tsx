import { Check, Search, UserCheck, Navigation, MapPin, Loader2, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";

// The happy-path flow a booking moves through, in order.
const FLOW = [
  { status: "SEARCHING",   label: "Finding your expert", icon: Search },
  { status: "ASSIGNED",    label: "Expert assigned",     icon: UserCheck },
  { status: "ACCEPTED",    label: "Expert accepted",     icon: UserCheck },
  { status: "ON_THE_WAY",  label: "On the way",          icon: Navigation },
  { status: "ARRIVED",     label: "Arrived",             icon: MapPin },
  { status: "IN_PROGRESS", label: "Service in progress", icon: Loader2 },
  { status: "COMPLETED",   label: "Completed",           icon: PartyPopper },
] as const;

export function BookingTracker({ status }: { status: string }) {
  if (status === "CANCELLED") {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5 text-center text-sm font-medium text-red-600">
        This booking was cancelled.
      </div>
    );
  }

  const currentIdx = FLOW.findIndex((s) => s.status === status);

  return (
    <ol className="relative space-y-1">
      {FLOW.map((step, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        const Icon = step.icon;
        return (
          <li key={step.status} className="flex items-center gap-4">
            <div className="flex flex-col items-center">
              <div className={cn(
                "grid h-9 w-9 place-items-center rounded-full border-2 transition-colors",
                done && "border-primary bg-primary text-primary-foreground",
                active && "border-primary bg-primary/10 text-primary",
                !done && !active && "border-border text-muted-foreground/40",
              )}>
                {done ? <Check className="h-4 w-4" /> : <Icon className={cn("h-4 w-4", active && step.status === "IN_PROGRESS" && "animate-spin")} />}
              </div>
              {i < FLOW.length - 1 && (
                <span className={cn("h-6 w-0.5", i < currentIdx ? "bg-primary" : "bg-border")} />
              )}
            </div>
            <span className={cn(
              "text-sm font-medium",
              active ? "text-foreground" : done ? "text-foreground/70" : "text-muted-foreground",
            )}>
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
