import { Star } from "lucide-react";

export interface ReviewData {
  id: string;
  customerName: string;
  rating: number;
  comment?: string | null;
  providerReply?: string | null;
  createdAt: string;
}

export function ReviewCard({ r }: { r: ReviewData }) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {r.customerName[0]?.toUpperCase() ?? "C"}
          </div>
          <div>
            <div className="text-sm font-medium">{r.customerName}</div>
            <div className="text-xs text-muted-foreground">
              {new Date(r.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`h-4 w-4 ${
                i < r.rating ? "fill-warning text-warning" : "text-muted-foreground/30"
              }`}
            />
          ))}
        </div>
      </div>
      {r.comment && <p className="mt-3 text-sm">{r.comment}</p>}
      {r.providerReply && (
        <div className="mt-3 rounded-xl bg-muted/50 p-3 text-sm">
          <div className="mb-1 text-xs font-medium text-primary">Provider's reply</div>
          {r.providerReply}
        </div>
      )}
    </div>
  );
}
