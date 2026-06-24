import PDFDocument from 'pdfkit';

async function fetchChartBuffer(chartConfig) {
  try {
    const res = await fetch('https://quickchart.io/chart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chart: chartConfig, width: 600, height: 350, backgroundColor: 'transparent' })
    });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch (e) {
    console.error('QuickChart Error:', e);
    return null;
  }
}

export async function buildAiReportPdf(data, aiInsights, dataCallback, endCallback) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  doc.on('data', dataCallback);
  doc.on('end', endCallback);

  const A4_WIDTH = 595.28;
  const A4_HEIGHT = 841.89;

  // Header and Footer Utilities
  const drawPageHeader = (title) => {
    doc.rect(0, 0, A4_WIDTH, 70).fill('#0f172a');
    doc.fillColor('#ffffff').fontSize(24).font('Helvetica-Bold').text(title, 50, 25);
    doc.fillColor('#94a3b8').fontSize(10).font('Helvetica').text('HomeHero AI Intelligence Report', 50, 25, { align: 'right', width: 495 });
    doc.moveDown(4);
  };

  const drawPageFooter = (pageNumber) => {
    doc.save();
    doc.rect(0, A4_HEIGHT - 40, A4_WIDTH, 40).fill('#f8fafc');
    doc.fillColor('#64748b').fontSize(9).font('Helvetica').text(`Page ${pageNumber} | Highly Confidential`, 50, A4_HEIGHT - 25, { align: 'center', width: 495 });
    doc.restore();
  };

  // Advanced Markdown Text Parser
  const drawSectionText = (text) => {
    if (!text) return;
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (line.trim() === '') {
        doc.moveDown(0.5);
        continue;
      }
      
      let isBullet = false;
      let textToRender = line;
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        isBullet = true;
        textToRender = line.replace(/^[-*]\s/, '');
      }

      if (line.trim().startsWith('### ')) {
        doc.fillColor('#0f172a').fontSize(16).font('Helvetica-Bold');
        doc.text(line.replace('###', '').trim(), 50, doc.y);
        doc.moveDown(0.5);
        continue;
      }

      const xPos = isBullet ? 70 : 50;
      
      if (isBullet) {
        doc.fillColor('#3b82f6').fontSize(16).font('Helvetica').text('•', 50, doc.y - 2, { continued: false });
        doc.moveUp(); 
      }

      doc.fillColor('#334155').fontSize(11).lineGap(5);
      const parts = textToRender.split('**');
      let isBold = false;
      
      for (let i = 0; i < parts.length; i++) {
        if (isBold) {
          doc.font('Helvetica-Bold').fillColor('#0f172a');
        } else {
          doc.font('Helvetica').fillColor('#334155');
        }
        
        doc.text(parts[i], xPos, doc.y, {
          continued: i < parts.length - 1,
          width: 545 - xPos,
          align: 'left'
        });
        isBold = !isBold;
      }
      doc.moveDown(0.5);
    }
  };

  // ── PREPARE CHARTS ──
  // Trend Comparison Chart (MoM)
  const trendChart = await fetchChartBuffer({
    type: 'bar',
    data: {
      labels: ['Bookings', 'Revenue (INR)'],
      datasets: [
        { label: 'Previous 30 Days', data: [data.previous_30_days?.bookings || 0, data.previous_30_days?.revenue || 0], backgroundColor: '#94a3b8' },
        { label: 'Last 30 Days', data: [data.last_30_days?.bookings || 0, data.last_30_days?.revenue || 0], backgroundColor: '#2563eb' }
      ]
    }
  });

  // Revenue Pie
  const revenueChart = await fetchChartBuffer({
    type: 'pie',
    data: {
      labels: ['Platform Fee Profit', 'Expert Earnings'],
      datasets: [{ data: [data.total_platform_fee, data.total_revenue - data.total_platform_fee], backgroundColor: ['#10b981', '#cbd5e1'] }]
    }
  });

  // Bookings By Status
  const statusLabels = data.bookings_by_status?.map(b => b.status) || [];
  const statusData = data.bookings_by_status?.map(b => b._count.id) || [];
  const bookingsChart = await fetchChartBuffer({
    type: 'bar',
    data: {
      labels: statusLabels,
      datasets: [{ label: 'Bookings', data: statusData, backgroundColor: '#3b82f6' }]
    },
    options: { legend: { display: false } }
  });

  // Experts By Status
  const expertLabels = data.experts_by_status?.map(e => e.status) || [];
  const expertData = data.experts_by_status?.map(e => e._count.id) || [];
  const expertChart = await fetchChartBuffer({
    type: 'doughnut',
    data: {
      labels: expertLabels,
      datasets: [{ data: expertData, backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#64748b'] }]
    }
  });

  // ── COVER PAGE ──
  doc.rect(0, 0, A4_WIDTH, A4_HEIGHT).fill('#0f172a');
  doc.fillColor('#ffffff').fontSize(56).font('Helvetica-Bold').text('HOMEHERO', 50, 300);
  doc.fillColor('#bfdbfe').fontSize(24).font('Helvetica').text('Business Intelligence Report', 50, 360);
  doc.moveTo(50, 420).lineTo(200, 420).lineWidth(4).stroke('#ffffff');
  doc.fillColor('#ffffff').fontSize(14).font('Helvetica').text(`Generated on: ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}`, 50, 460);
  doc.fillColor('#94a3b8').text(`Powered by Advanced AI Analytics`, 50, 480);
  doc.fillColor('#334155').fontSize(10).text('CONFIDENTIAL INTERNAL DOCUMENT', 50, 780);

  const initPage = () => {
    doc.addPage({ margin: 50 });
    doc.rect(0, 0, A4_WIDTH, A4_HEIGHT).fill('#ffffff');
    doc.fillColor('#000000');
  };

  // ── PAGE 1: EXECUTIVE SUMMARY ──
  initPage();
  drawPageHeader('Executive Summary');
  drawSectionText(aiInsights.executive_summary);
  drawPageFooter(1);

  // ── PAGE 2: REVENUE ANALYSIS ──
  initPage();
  drawPageHeader('Revenue Analysis');
  
  // Dashboard Metrics Box
  doc.roundedRect(50, 90, 495, 90, 8).fill('#f8fafc').lineWidth(1).stroke('#e2e8f0');
  
  doc.fillColor('#64748b').fontSize(10).font('Helvetica-Bold').text('ALL TIME REVENUE', 70, 110);
  doc.fillColor('#0f172a').fontSize(22).text(`₹${Number(data.total_revenue).toLocaleString('en-IN')}`, 70, 125);
  doc.fillColor('#64748b').fontSize(10).font('Helvetica-Bold').text('30-DAY VELOCITY', 300, 110);
  doc.fillColor('#10b981').fontSize(22).text(`₹${Number(data.last_30_days?.revenue || 0).toLocaleString('en-IN')}`, 300, 125);
  doc.fillColor('#64748b').fontSize(9).font('Helvetica').text(`vs prev 30 days: ₹${Number(data.previous_30_days?.revenue || 0).toLocaleString()}`, 300, 150);

  doc.y = 200;
  if (trendChart) {
    doc.image(trendChart, 50, doc.y, { width: 495, height: 200 });
    doc.y += 220;
  }
  if (revenueChart) {
    // scale pie chart a bit smaller
    doc.image(revenueChart, 150, doc.y, { width: 300, height: 180 });
    doc.y += 200;
  }
  
  // If we run out of space, add page
  if (doc.y > A4_HEIGHT - 150) initPage();
  
  drawSectionText(aiInsights.revenue_analysis);
  drawPageFooter(2);

  // ── PAGE 3: OPERATIONAL EFFICIENCY ──
  initPage();
  drawPageHeader('Operational Efficiency');
  if (bookingsChart) {
    doc.image(bookingsChart, 50, doc.y, { width: 495, height: 220 });
    doc.y += 240;
  }
  drawSectionText(aiInsights.operational_efficiency);
  drawPageFooter(3);

  // ── PAGE 4: EXPERT PERFORMANCE ──
  initPage();
  drawPageHeader('Expert Workforce');
  if (expertChart) {
    doc.image(expertChart, 50, doc.y, { width: 495, height: 220 });
    doc.y += 240;
  }
  drawSectionText(aiInsights.expert_performance);
  drawPageFooter(4);

  // ── PAGE 5: MARKET ANALYSIS ──
  if (aiInsights.market_analysis) {
    initPage();
    drawPageHeader('Market Analysis');
    drawSectionText(aiInsights.market_analysis);
    drawPageFooter(5);
  }

  // ── PAGE 6: RISK ASSESSMENT ──
  if (aiInsights.risk_assessment) {
    initPage();
    drawPageHeader('Risk Assessment');
    drawSectionText(aiInsights.risk_assessment);
    drawPageFooter(6);
  }

  // ── PAGE 7: STRATEGIC RECOMMENDATIONS ──
  initPage();
  drawPageHeader('Strategic Recommendations');
  doc.moveDown(1);
  (aiInsights.strategic_recommendations || []).forEach((rec, idx) => {
    doc.fillColor('#2563eb').fontSize(14).font('Helvetica-Bold').text(`${idx + 1}.`, 50, doc.y);
    doc.fillColor('#0f172a').fontSize(12).font('Helvetica').text(rec, 75, doc.y - 14, { width: 470, align: 'left', lineGap: 4 });
    doc.moveDown(1.5);
  });
  drawPageFooter(7);

  doc.end();
}
