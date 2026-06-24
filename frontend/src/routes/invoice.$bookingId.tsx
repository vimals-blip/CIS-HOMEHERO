import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, API_BASE, getAccessToken } from "@/lib/api";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

export const Route = createFileRoute("/invoice/$bookingId")({
  head: () => ({ meta: [{ title: "Invoice — HomeHero" }] }),
  component: InvoicePage,
});

const fmt = (n: number) => `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

function InvoicePage() {
  const { bookingId } = Route.useParams();

  const { data: inv, isLoading, isError } = useQuery({
    queryKey: ["invoice", bookingId],
    queryFn: () => apiFetch(`/bookings/${bookingId}/invoice`),
  });

  if (isLoading) return <div className="flex h-screen items-center justify-center"><LoadingSpinner /></div>;
  if (isError || !inv) return <div className="flex h-screen items-center justify-center text-muted-foreground">Invoice not found.</div>;

  const subtotal = inv.totals.base;
  const total = inv.totals.total;

  const handleDownloadPdf = async () => {
    try {
      const token = getAccessToken();
      const res = await fetch(`${API_BASE}/bookings/${bookingId}/invoice/pdf`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!res.ok) {
        let errMessage = res.statusText;
        try {
          const body = await res.json();
          errMessage = body?.message || body?.error || errMessage;
        } catch { /* ignore */ }
        throw new Error(`[${res.status}] ${errMessage}`);
      }
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${bookingId.slice(-8).toUpperCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      alert(`Failed to download PDF invoice: ${err.message}`);
    }
  };

  return (
    <>
      <button
        onClick={handleDownloadPdf}
        className="no-print fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
      >
        🖨 Download PDF Invoice
      </button>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; }
          @page { size: A4; margin: 20mm; }
        }
      `}</style>

      <div className="mx-auto max-w-2xl px-6 py-10 print:px-0 print:py-0">
        {/* Header */}
        <div className="flex items-start justify-between border-b pb-6">
          <div>
            <div className="text-2xl font-extrabold tracking-tight text-primary">{inv.company.name}</div>
            <div className="text-xs text-muted-foreground">{inv.company.tagline}</div>
            <div className="mt-1 text-xs text-muted-foreground">{inv.company.email} · {inv.company.phone}</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold">INVOICE</div>
            <div className="mt-1 font-mono text-sm font-semibold text-muted-foreground">{inv.invoice_number}</div>
            <div className="mt-1 text-xs text-muted-foreground">Issued: {fmtDate(inv.issued_at)}</div>
          </div>
        </div>

        {/* Bill to / Expert */}
        <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs font-semibold uppercase text-muted-foreground">Bill To</div>
            <div className="mt-1 font-semibold">{inv.customer.name ?? "—"}</div>
            {inv.customer.phone && <div className="text-muted-foreground">{inv.customer.phone}</div>}
            {inv.address && <div className="mt-1 text-xs text-muted-foreground">{inv.address}</div>}
          </div>
          <div>
            <div className="text-xs font-semibold uppercase text-muted-foreground">Service By</div>
            <div className="mt-1 font-semibold">{inv.expert.name ?? "—"}</div>
            <div className="mt-2 text-xs text-muted-foreground">
              <span className="font-medium">Type:</span> {inv.booking.booking_type}<br />
              {inv.booking.scheduled_at && <><span className="font-medium">Date:</span> {fmtDate(inv.booking.scheduled_at)}<br /></>}
              <span className="font-medium">Status:</span> {inv.booking.status}
            </div>
          </div>
        </div>

        {/* Service details */}
        <div className="mt-6 rounded-lg border text-sm">
          <div className="grid grid-cols-[1fr_auto] gap-4 border-b bg-muted/50 px-4 py-2 text-xs font-semibold uppercase text-muted-foreground">
            <span>Description</span>
            <span className="text-right">Amount</span>
          </div>
          {inv.line_items.map((item: any, i: number) => (
            <div key={i} className={`grid grid-cols-[1fr_auto] gap-4 px-4 py-3 ${item.amount < 0 ? "text-green-700" : ""} ${i < inv.line_items.length - 1 ? "border-b" : ""}`}>
              <span>{item.description}</span>
              <span className="text-right font-medium">{item.amount < 0 ? `-₹${Math.abs(item.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : fmt(item.amount)}</span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="mt-2 flex flex-col items-end gap-1 text-sm">
          <div className="flex gap-10 text-muted-foreground">
            <span>Subtotal</span><span>{fmt(subtotal)}</span>
          </div>
          {inv.totals.discount > 0 && (
            <div className="flex gap-10 text-green-700">
              <span>Discount</span><span>-{fmt(inv.totals.discount)}</span>
            </div>
          )}
          <div className="mt-1 flex gap-10 border-t pt-2 text-base font-bold">
            <span>Total</span><span>{fmt(total)}</span>
          </div>
        </div>

        {/* Payment */}
        <div className="mt-6 rounded-lg border px-4 py-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Payment method</span>
            <span className="font-medium">{inv.payment.method}</span>
          </div>
          <div className="mt-1 flex justify-between">
            <span className="text-muted-foreground">Payment status</span>
            <span className={`font-medium ${inv.payment.status === "PAID" ? "text-green-700" : "text-amber-600"}`}>{inv.payment.status}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 border-t pt-4 text-center text-xs text-muted-foreground">
          Thank you for choosing {inv.company.name}! · This is a computer-generated invoice.
        </div>
      </div>
    </>
  );
}
