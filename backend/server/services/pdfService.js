import PDFDocument from 'pdfkit';

export function buildInvoicePdf(inv, dataCallback, endCallback) {
  // 0 margin allows us to draw edge-to-edge banners
  const doc = new PDFDocument({ size: 'A4', margin: 0 });

  doc.on('data', dataCallback);
  doc.on('end', endCallback);

  const fmt = (n) => `Rs. ${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const A4_WIDTH = 595.28;
  
  // ── BACKGROUND WATERMARK ──
  doc.save();
  doc.translate(A4_WIDTH / 2 - 200, 400);
  doc.rotate(-30);
  doc.fontSize(80).font('Helvetica-Bold').fillColor('#f1f5f9').text('HOMEHERO', 0, 0, { opacity: 0.3 });
  doc.restore();

  // ── HEADER BANNER ──
  doc.rect(0, 0, A4_WIDTH, 140).fill('#2563eb'); // Brand Blue
  
  // Header Content
  doc
    .fillColor('#ffffff')
    .fontSize(32)
    .font('Helvetica-Bold')
    .text(inv.company.name.toUpperCase(), 50, 45);

  doc
    .fillColor('#bfdbfe') // Light Blue
    .fontSize(10)
    .font('Helvetica')
    .text(inv.company.tagline, 50, 82)
    .text(`${inv.company.email}   |   ${inv.company.phone}`, 50, 98);

  // INVOICE Title
  doc
    .fillColor('#ffffff')
    .fontSize(36)
    .font('Helvetica-Bold')
    .text('INVOICE', 345, 45, { align: 'right', width: 200 });

  doc
    .fillColor('#bfdbfe')
    .fontSize(10)
    .font('Helvetica-Bold')
    .text(`INV #: ${inv.invoice_number}`, 345, 82, { align: 'right', width: 200 })
    .font('Helvetica')
    .text(`Date: ${fmtDate(inv.issued_at)}`, 345, 98, { align: 'right', width: 200 });

  // ── CARDS (Bill To & Service Details) ──
  const cardY = 170;

  // Card 1: Bill To
  doc.roundedRect(50, cardY, 235, 110, 8).fill('#f8fafc');
  doc.roundedRect(50, cardY, 235, 110, 8).lineWidth(1).stroke('#e2e8f0');
  
  doc.fillColor('#94a3b8').fontSize(9).font('Helvetica-Bold').text('BILL TO', 65, cardY + 15);
  doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text(inv.customer.name || 'Customer', 65, cardY + 32);
  
  doc.fillColor('#475569').fontSize(10).font('Helvetica');
  let currentY = cardY + 50;
  if (inv.customer.phone) { doc.text(inv.customer.phone, 65, currentY); currentY += 15; }
  if (inv.address) { doc.text(inv.address, 65, currentY, { width: 200 }); }

  // Card 2: Service Details
  doc.roundedRect(310, cardY, 235, 110, 8).fill('#f8fafc');
  doc.roundedRect(310, cardY, 235, 110, 8).lineWidth(1).stroke('#e2e8f0');

  doc.fillColor('#94a3b8').fontSize(9).font('Helvetica-Bold').text('SERVICE DETAILS', 325, cardY + 15);
  
  doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text('Provider:', 325, cardY + 32);
  doc.font('Helvetica').text(inv.expert.name || 'Assigned Expert', 380, cardY + 32);
  
  doc.font('Helvetica-Bold').text('Service:', 325, cardY + 50);
  doc.font('Helvetica').text(inv.booking.booking_type, 380, cardY + 50);

  doc.font('Helvetica-Bold').text('Date:', 325, cardY + 68);
  doc.font('Helvetica').text(inv.booking.scheduled_at ? fmtDate(inv.booking.scheduled_at) : 'Not Scheduled', 380, cardY + 68);

  doc.font('Helvetica-Bold').text('Status:', 325, cardY + 86);
  doc.font('Helvetica').text(inv.booking.status, 380, cardY + 86);

  // ── PAID / PENDING WATERMARK STAMP ──
  doc.save();
  doc.translate(A4_WIDTH / 2, cardY + 55);
  doc.rotate(-15);
  doc.fontSize(48).font('Helvetica-Bold');
  if (inv.payment.status === 'PAID') {
    doc.fillColor('rgba(21, 128, 61, 0.15)').text('PAID IN FULL', -150, -20);
  } else {
    doc.fillColor('rgba(234, 88, 12, 0.15)').text('PAYMENT PENDING', -200, -20);
  }
  doc.restore();

  // ── TABLE ──
  const yTable = 320;

  // Table Header
  doc.roundedRect(50, yTable, 495, 30, 4).fill('#1e293b'); // Dark Slate
  doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold');
  doc.text('DESCRIPTION', 70, yTable + 10);
  doc.text('AMOUNT', 400, yTable + 10, { width: 125, align: 'right' });

  // Table Rows
  let itemY = yTable + 40;
  inv.line_items.forEach((item, i) => {
    // Alternating row background
    if (i % 2 === 0) {
      doc.rect(50, itemY - 8, 495, 30).fill('#f8fafc');
    }

    const isDiscount = item.amount < 0;
    doc.fillColor(isDiscount ? '#15803d' : '#334155').fontSize(10).font('Helvetica');
    doc.text(item.description, 70, itemY);

    const amountStr = isDiscount 
      ? `-Rs. ${Math.abs(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` 
      : fmt(item.amount);

    doc.font(isDiscount ? 'Helvetica-Bold' : 'Helvetica').text(amountStr, 400, itemY, { width: 125, align: 'right' });

    itemY += 30;
  });

  // Table Bottom Border
  doc.moveTo(50, itemY).lineTo(545, itemY).lineWidth(1).stroke('#cbd5e1');

  // ── SUMMARY & PAYMENT ──
  let totalY = itemY + 20;

  // Payment Box (Left Side)
  doc.roundedRect(50, totalY, 235, 95, 8).fill('#f8fafc');
  doc.roundedRect(50, totalY, 235, 95, 8).lineWidth(1).stroke('#e2e8f0');
  
  doc.fillColor('#94a3b8').fontSize(9).font('Helvetica-Bold').text('PAYMENT INFO', 65, totalY + 15);
  doc.fillColor('#475569').fontSize(10).font('Helvetica');
  doc.text('Method:', 65, totalY + 35);
  doc.fillColor('#0f172a').font('Helvetica-Bold').text(inv.payment.method, 115, totalY + 35);
  
  doc.fillColor('#475569').font('Helvetica').text('Status:', 65, totalY + 55);
  const statusColor = inv.payment.status === 'PAID' ? '#15803d' : '#ea580c';
  doc.fillColor(statusColor).font('Helvetica-Bold').text(inv.payment.status, 115, totalY + 55);

  doc.fillColor('#64748b').fontSize(8).font('Helvetica').text('All amounts are in Indian Rupees (INR).', 65, totalY + 75);

  // Totals Box (Right Side)
  doc.roundedRect(310, totalY, 235, 130, 8).fill('#f1f5f9');
  doc.roundedRect(310, totalY, 235, 130, 8).lineWidth(1).stroke('#e2e8f0');

  let innerY = totalY + 20;
  
  doc.fillColor('#475569').fontSize(10).font('Helvetica').text('Subtotal', 330, innerY);
  doc.fillColor('#0f172a').font('Helvetica-Bold').text(fmt(inv.totals.base), 390, innerY, { width: 135, align: 'right' });
  innerY += 25;

  if (inv.totals.discount > 0) {
    doc.fillColor('#15803d').font('Helvetica').text('Discount', 330, innerY);
    doc.text(`-${fmt(inv.totals.discount)}`, 390, innerY, { width: 135, align: 'right' });
    innerY += 25;
  }

  // Grand Total Banner inside the Box
  doc.rect(310, innerY, 235, 60).fill('#2563eb');
  
  // Need to redraw borders for the bottom rounded corners
  doc.roundedRect(310, totalY, 235, 130, 8).lineWidth(1).stroke('#2563eb');

  doc.fillColor('#bfdbfe').fontSize(11).font('Helvetica-Bold').text('GRAND TOTAL', 330, innerY + 22);
  doc.fillColor('#ffffff').fontSize(20).text(fmt(inv.totals.total), 390, innerY + 16, { width: 135, align: 'right' });

  // ── FOOTER ──
  doc
    .fillColor('#94a3b8')
    .fontSize(10)
    .font('Helvetica')
    .text(`Thank you for choosing ${inv.company.name}!`, 0, A4_WIDTH + 170, { align: 'center', width: A4_WIDTH });

  doc
    .fontSize(8)
    .text(`For any support, please contact us at ${inv.company.email}. This is a computer-generated document.`, 0, A4_WIDTH + 185, { align: 'center', width: A4_WIDTH });

  doc.end();
}
