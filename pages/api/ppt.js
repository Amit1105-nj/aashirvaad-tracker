import PptxGenJS from 'pptxgenjs';
import path from 'path';
import fs from 'fs';

// Load logos from public folder as base64
function loadLogo(filename) {
  try {
    const filePath = path.join(process.cwd(), 'public', filename);
    const data = fs.readFileSync(filePath);
    const ext = filename.split('.').pop().toLowerCase();
    const mime = ext === 'jpg' || ext === 'jpeg' ? 'jpeg' : ext === 'webp' ? 'webp' : 'png';
    return `data:image/${mime};base64,${data.toString('base64')}`;
  } catch(e) {
    return null;
  }
}

const LOGO_ITC = loadLogo('ITC.jpg');
const LOGO_AMAZON = loadLogo('amazon.png');
const LOGO_REDDIT = loadLogo('Reddit.png');
const BRAND_LOGOS = {
  Aashirvaad: loadLogo('Aashirvaad.png'),
  Bingo: loadLogo('Bingo.png'),
  Candyman: loadLogo('Candyman (1).jpg'),
  Sunfeast: loadLogo('Sunfeast.png'),
  Yippee: loadLogo('Yippee.webp'),
  Fabelle: loadLogo('Fabelle.jpg'),
};

// Color palette
const CLR = {
  bg:     '0F0F17',
  surf:   '1A1A2E',
  card:   '16213E',
  acc:    'FF4500',
  acc2:   'FF6A3D',
  white:  'FFFFFF',
  text:   'E8ECF4',
  muted:  '7C8499',
  grn:    '22C55E',
  ylw:    'F59E0B',
  red:    'EF4444',
  pur:    'A78BFA',
  dark:   '0A0A12',
};

const sentClr = s => s === 'positive' ? CLR.grn : s === 'negative' ? CLR.red : CLR.ylw;
const urgClr  = u => u === 'high'     ? CLR.red : u === 'medium'   ? CLR.ylw : CLR.grn;
const trendClr= t => t === 'rising'   ? CLR.grn : t === 'falling'  ? CLR.red : CLR.muted;

// Add a dark slide background
function addBg(slide) {
  slide.addShape('rect', { x: 0, y: 0, w: '100%', h: '100%', fill: { color: CLR.bg } });
}

// Slide header strip with accent bar
function addSlideHeader(slide, slideNum, title) {
  // Orange accent bar at top
  slide.addShape('rect', { x: 0, y: 0, w: '100%', h: 0.07, fill: { color: CLR.acc } });
  // Slide number badge
  slide.addShape('rect', { x: 0.4, y: 0.18, w: 0.8, h: 0.28, fill: { color: CLR.acc }, rectRadius: 0.04 });
  slide.addText(`SLIDE ${String(slideNum).padStart(2,'0')}`, {
    x: 0.4, y: 0.18, w: 0.8, h: 0.28,
    fontSize: 8, bold: true, color: CLR.white, align: 'center', valign: 'middle', margin: 0
  });
  // Title
  slide.addText(title, {
    x: 1.35, y: 0.15, w: 8.2, h: 0.35,
    fontSize: 16, bold: true, color: CLR.white, valign: 'middle', margin: 0
  });
  // Divider line
  slide.addShape('line', { x: 0.4, y: 0.57, w: 9.2, h: 0, line: { color: '2D3A55', width: 1 } });
}

// Footer
function addFooter(slide, brand, date) {
  slide.addShape('rect', { x: 0, y: 5.45, w: '100%', h: 0.18, fill: { color: CLR.dark } });
  slide.addText(`ITC ${brand}  ·  Reddit Intelligence  ·  Powered by Claude AI  ·  ${date}`, {
    x: 0.4, y: 5.45, w: 9.2, h: 0.18,
    fontSize: 7, color: CLR.muted, align: 'center', valign: 'middle', margin: 0
  });
}

// KPI box helper
function addKpiBox(slide, x, y, w, h, value, label, valueColor) {
  slide.addShape('rect', { x, y, w, h, fill: { color: CLR.card }, rectRadius: 0.08, line: { color: '2D3A55', width: 1 } });
  slide.addText(String(value), { x, y: y + 0.08, w, h: h * 0.6, fontSize: 28, bold: true, color: valueColor, align: 'center', valign: 'middle', margin: 0 });
  slide.addText(label,         { x, y: y + h * 0.62, w, h: h * 0.32, fontSize: 9,  color: CLR.muted, align: 'center', valign: 'top', margin: 0 });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { data, meta, amazonData } = req.body;
  if (!meta) return res.status(400).json({ error: 'Missing meta' });
  if (!data && !amazonData) return res.status(400).json({ error: 'Missing report data' });

  const { fromDate, toDate, brand } = meta;
  const sn  = data?.sentiment_breakdown || { positive: 0, neutral: 0, negative: 0 };
  const now = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  // If no Reddit data, generate Amazon-only PPT
  if (!data && amazonData) {
    try {
      const pres = new PptxGenJS();
      pres.layout = 'LAYOUT_16x9';
      pres.author = brand;
      pres.title  = `${brand} Amazon Intelligence Report`;

      const brandLogo = BRAND_LOGOS[brand];
      const totalRatings = Object.values(amazonData.ratingDistribution).reduce((a,b)=>a+b,0);
      const promoters = amazonData.ratingDistribution[5] || 0;
      const detractors = (amazonData.ratingDistribution[1]||0) + (amazonData.ratingDistribution[2]||0);
      const verifiedCount = (amazonData.reviews||[]).filter(r=>r.verified).length;
      const verifiedPct = amazonData.total > 0 ? Math.round((verifiedCount/amazonData.total)*100) : 0;
      const healthScore = Math.round((amazonData.avgRating/5*50) + (amazonData.sentimentScore/100*50));

      // ── SLIDE 1: COVER ──
      const s1 = pres.addSlide();
      addBg(s1);
      // Dark header band
      s1.addShape('rect', { x: 0, y: 0, w: '100%', h: 2.4, fill: { color: '0d1117' } });
      // Amber accent line
      s1.addShape('rect', { x: 0, y: 2.4, w: '100%', h: 0.06, fill: { color: 'F59E0B' } });

      // Large brand logo — centered in header
      if (brandLogo) {
        try {
          s1.addImage({ data: brandLogo, x: 3.5, y: 0.2, w: 3.0, h: 1.9, sizing: { type: 'contain', align: 'center' } });
        } catch(e) {
          s1.addText(brand, { x: 0.5, y: 0.5, w: 9, h: 1.4, fontSize: 48, bold: true, color: CLR.white, align: 'center' });
        }
      }

      // ITC logo small top-left
      try { s1.addImage({ data: LOGO_ITC, x: 0.25, y: 0.15, w: 0.7, h: 0.7, sizing: { type: 'contain' } }); } catch(e) {}
      // Amazon logo small top-right - white bg so it's visible
      s1.addShape('rect', { x: 8.75, y: 0.15, w: 1.1, h: 0.6, fill: { color: 'FFFFFF' }, rectRadius: 0.05 });
      try { s1.addImage({ data: LOGO_AMAZON, x: 8.78, y: 0.18, w: 1.04, h: 0.54, sizing: { type: 'contain' } }); } catch(e) {}

      // Report title
      s1.addText('AMAZON CUSTOMER INTELLIGENCE REPORT', {
        x: 0.5, y: 2.55, w: 9, h: 0.35, fontSize: 11, bold: true, color: 'F59E0B', charSpacing: 3, align: 'center'
      });
      s1.addText(brand, {
        x: 0.5, y: 2.95, w: 9, h: 0.9, fontSize: 44, bold: true, color: CLR.white, align: 'center'
      });

      // Health score badge
      const hsColor = healthScore >= 75 ? CLR.grn : healthScore >= 55 ? CLR.ylw : CLR.red;
      s1.addShape('rect', { x: 3.8, y: 3.9, w: 2.4, h: 0.7, fill: { color: CLR.card }, rectRadius: 0.12, line: { color: hsColor, width: 1.5 } });
      s1.addText('BRAND HEALTH', { x: 3.8, y: 3.95, w: 2.4, h: 0.22, fontSize: 7, bold: true, color: CLR.muted, align: 'center', charSpacing: 2 });
      s1.addText(`${healthScore}/100`, { x: 3.8, y: 4.15, w: 2.4, h: 0.38, fontSize: 22, bold: true, color: hsColor, align: 'center' });

      // Stats row
      [
        [`${amazonData.total}`, 'Reviews'],
        [`${amazonData.avgRating}★`, 'Avg Rating'],
        [`${amazonData.sentimentScore}/100`, 'Sentiment'],
        [`${verifiedPct}%`, 'Verified'],
      ].forEach(([v, l], i) => {
        const x = 0.4 + i * 2.4;
        s1.addShape('rect', { x, y: 4.72, w: 2.1, h: 0.58, fill: { color: CLR.card }, rectRadius: 0.08 });
        s1.addText(v, { x, y: 4.76, w: 2.1, h: 0.3, fontSize: 16, bold: true, color: 'F59E0B', align: 'center' });
        s1.addText(l, { x, y: 5.06, w: 2.1, h: 0.18, fontSize: 8, color: CLR.muted, align: 'center' });
      });

      addFooter(s1, brand, now);

      // Helper: add brand logo small to slide corner
      const addBrandLogoCorner = (slide) => {
        // Brand logo top right
        if (brandLogo) {
          try { slide.addImage({ data: brandLogo, x: 8.8, y: 0.1, w: 0.75, h: 0.42, sizing: { type: 'contain' } }); } catch(e) {}
        }
        // Amazon logo bottom right
        slide.addShape('rect', { x: 8.7, y: 5.22, w: 1.1, h: 0.34, fill: { color: 'FFFFFF' }, rectRadius: 0.04 });
        try { slide.addImage({ data: LOGO_AMAZON, x: 8.72, y: 5.24, w: 1.06, h: 0.3, sizing: { type: 'contain' } }); } catch(e) {}
      };

      // ── SLIDE 2: REVIEW SUMMARY ──
      const s2 = pres.addSlide();
      addBg(s2);
      addSlideHeader(s2, 1, 'Review Summary & Sentiment Analysis');
      addBrandLogoCorner(s2);

      // KPI boxes
      [
        { v: amazonData.total, l: 'Total Reviews', c: 'F59E0B' },
        { v: `${amazonData.avgRating}★`, l: 'Avg Rating', c: 'F59E0B' },
        { v: `${amazonData.sentimentScore}/100`, l: 'Sentiment Score', c: amazonData.sentimentScore>=70?CLR.grn:amazonData.sentimentScore>=50?CLR.ylw:CLR.red },
        { v: amazonData.sentimentLabel, l: 'Overall Mood', c: CLR.white },
        { v: `${promoters}`, l: '5★ Promoters', c: CLR.grn },
        { v: `${detractors}`, l: '1-2★ Detractors', c: CLR.red },
      ].forEach(({v,l,c}, i) => {
        const x = 0.4 + (i%3)*3.1;
        const y = i < 3 ? 0.72 : 1.62;
        s2.addShape('rect', { x, y, w: 2.8, h: 0.72, fill: { color: CLR.card }, rectRadius: 0.08 });
        s2.addText(String(v), { x, y: y+0.06, w: 2.8, h: 0.36, fontSize: 18, bold: true, color: c, align: 'center' });
        s2.addText(l, { x, y: y+0.44, w: 2.8, h: 0.2, fontSize: 8, color: CLR.muted, align: 'center' });
      });

      // Rating distribution
      s2.addText('Rating Distribution', { x: 0.4, y: 2.5, w: 4.2, h: 0.25, fontSize: 10, bold: true, color: CLR.text });
      [5,4,3,2,1].forEach((star, i) => {
        const count = amazonData.ratingDistribution[star] || 0;
        const pct = totalRatings > 0 ? count/totalRatings : 0;
        const y = 2.82 + i * 0.42;
        const barColor = star>=4?CLR.grn:star===3?CLR.ylw:CLR.red;
        s2.addText(`${star}★`, { x: 0.4, y, w: 0.4, h: 0.28, fontSize: 9, color: CLR.muted, align: 'right' });
        s2.addShape('rect', { x: 0.88, y: y+0.06, w: 3.5, h: 0.16, fill: { color: '2D3A55' }, rectRadius: 0.03 });
        if (pct>0) s2.addShape('rect', { x: 0.88, y: y+0.06, w: 3.5*pct, h: 0.16, fill: { color: barColor }, rectRadius: 0.03 });
        s2.addText(`${Math.round(pct*100)}% (${count})`, { x: 4.45, y, w: 1.2, h: 0.28, fontSize: 8, color: CLR.muted });
      });

      // Themes
      s2.addText('Key Themes', { x: 5.7, y: 2.5, w: 3.9, h: 0.25, fontSize: 10, bold: true, color: CLR.text });
      (amazonData.themes||[]).slice(0,5).forEach((t,i) => {
        const y = 2.82 + i*0.44;
        const tColor = t.sentiment==='positive'?CLR.grn:t.sentiment==='negative'?CLR.red:CLR.ylw;
        s2.addShape('rect', { x: 5.7, y, w: 3.9, h: 0.38, fill: { color: CLR.card }, rectRadius: 0.05 });
        s2.addText(t.theme, { x: 5.85, y: y+0.04, w: 3.4, h: 0.16, fontSize: 8, bold: true, color: tColor });
        s2.addText(`"${(t.example||'').slice(0,60)}"`, { x: 5.85, y: y+0.2, w: 3.4, h: 0.14, fontSize: 7, color: CLR.muted, italic: true });
      });
      addFooter(s2, brand, now);

      // ── SLIDE 3: POSITIVE + NEGATIVE (side by side) ──
      const s3 = pres.addSlide();
      addBg(s3);
      addSlideHeader(s3, 2, 'Customer Voice — Positive & Critical Reviews');
      addBrandLogoCorner(s3);

      // Positive header
      s3.addShape('rect', { x: 0.3, y: 0.7, w: 4.5, h: 0.28, fill: { color: '0d2b1a' }, rectRadius: 0.05, line: { color: CLR.grn, width: 0.8 } });
      s3.addText('👍  TOP POSITIVE REVIEWS', { x: 0.3, y: 0.7, w: 4.5, h: 0.28, fontSize: 9, bold: true, color: CLR.grn, align: 'center', valign: 'middle' });

      // Negative header
      s3.addShape('rect', { x: 5.2, y: 0.7, w: 4.5, h: 0.28, fill: { color: '2b0d0d' }, rectRadius: 0.05, line: { color: CLR.red, width: 0.8 } });
      s3.addText('👎  TOP CRITICAL REVIEWS', { x: 5.2, y: 0.7, w: 4.5, h: 0.28, fontSize: 9, bold: true, color: CLR.red, align: 'center', valign: 'middle' });

      // Positive reviews (left)
      (amazonData.top5Positive||[]).slice(0,4).forEach((r,i) => {
        const y = 1.08 + i*1.08;
        s3.addShape('rect', { x: 0.3, y, w: 4.5, h: 0.95, fill: { color: CLR.card }, rectRadius: 0.06, line: { color: '1a3d24', width: 0.5 } });
        const stars = '★'.repeat(Math.round(r.rating||5));
        s3.addText(stars, { x: 0.45, y: y+0.06, w: 1.5, h: 0.2, fontSize: 9, color: CLR.grn, bold: true });
        if(r.verified) s3.addText('✓', { x: 2.1, y: y+0.07, w: 0.3, h: 0.18, fontSize: 8, color: CLR.grn, bold: true });
        s3.addText(r.author||'Buyer', { x: 3.0, y: y+0.06, w: 1.65, h: 0.18, fontSize: 7, color: CLR.muted, align: 'right' });
        s3.addText((r.title||'').slice(0,45), { x: 0.45, y: y+0.28, w: 4.2, h: 0.2, fontSize: 8, bold: true, color: CLR.text });
        s3.addText((r.body||r.title||'').slice(0,100), { x: 0.45, y: y+0.5, w: 4.2, h: 0.35, fontSize: 7.5, color: CLR.muted, italic: true, wrap: true });
      });

      // Negative reviews (right)
      const critReviews = amazonData.top5Negative||[];
      if (critReviews.length === 0) {
        s3.addText('No critical reviews found.', { x: 5.2, y: 2.5, w: 4.5, h: 0.4, fontSize: 11, color: CLR.muted, align: 'center' });
      } else {
        critReviews.slice(0,4).forEach((r,i) => {
          const y = 1.08 + i*1.08;
          s3.addShape('rect', { x: 5.2, y, w: 4.5, h: 0.95, fill: { color: CLR.card }, rectRadius: 0.06, line: { color: '3d1a1a', width: 0.5 } });
          const stars = '★'.repeat(Math.round(r.rating||1));
          s3.addText(stars, { x: 5.35, y: y+0.06, w: 1.5, h: 0.2, fontSize: 9, color: CLR.red, bold: true });
          if(r.verified) s3.addText('✓', { x: 7.0, y: y+0.07, w: 0.3, h: 0.18, fontSize: 8, color: CLR.grn, bold: true });
          s3.addText(r.author||'Buyer', { x: 7.9, y: y+0.06, w: 1.65, h: 0.18, fontSize: 7, color: CLR.muted, align: 'right' });
          s3.addText((r.title||'').slice(0,45), { x: 5.35, y: y+0.28, w: 4.2, h: 0.2, fontSize: 8, bold: true, color: CLR.text });
          s3.addText((r.body||r.title||'').slice(0,100), { x: 5.35, y: y+0.5, w: 4.2, h: 0.35, fontSize: 7.5, color: CLR.muted, italic: true, wrap: true });
        });
      }
      addFooter(s3, brand, now);

      // ── SLIDE 4: COMPETITOR COMPARISON ──
      const s4 = pres.addSlide();
      addBg(s4);
      addSlideHeader(s4, 3, `Competitor Rating Comparison — ${brand} vs Market`);
      addBrandLogoCorner(s4);

      const compStats = amazonData.competitorStats || {};
      const hasComps = Object.keys(compStats).length > 0;

      // Brand row
      s4.addShape('rect', { x: 0.4, y: 0.72, w: 9.2, h: 0.6, fill: { color: '1e1040' }, rectRadius: 0.07, line: { color: CLR.acc, width: 1 } });
      s4.addText(`${brand}  (You)`, { x: 0.6, y: 0.84, w: 3.5, h: 0.32, fontSize: 12, bold: true, color: CLR.text });
      s4.addText(`${amazonData.avgRating}★`, { x: 4.2, y: 0.84, w: 0.8, h: 0.32, fontSize: 14, bold: true, color: 'F59E0B', align: 'center' });
      const bW = (amazonData.avgRating/5)*4.2;
      s4.addShape('rect', { x: 5.1, y: 0.94, w: 4.2, h: 0.18, fill: { color: '2D3A55' }, rectRadius: 0.04 });
      if(bW>0) s4.addShape('rect', { x: 5.1, y: 0.94, w: bW, h: 0.18, fill: { color: CLR.acc }, rectRadius: 0.04 });
      s4.addText(`${Math.round((amazonData.avgRating/5)*100)}%`, { x: 9.0, y: 0.84, w: 0.5, h: 0.32, fontSize: 9, color: CLR.muted, align: 'right' });

      if (!hasComps) {
        s4.addText('Run with competitors selected to see comparison.', { x: 0.4, y: 2.8, w: 9.2, h: 0.4, fontSize: 12, color: CLR.muted, align: 'center' });
      } else {
        Object.entries(compStats).forEach(([comp, stats], i) => {
          const y = 1.45 + i * 0.75;
          const winning = amazonData.avgRating >= stats.avgRating;
          const barColor = winning ? CLR.grn : CLR.red;
          s4.addShape('rect', { x: 0.4, y, w: 9.2, h: 0.62, fill: { color: CLR.card }, rectRadius: 0.07 });
          s4.addText(comp, { x: 0.6, y: y+0.16, w: 3.5, h: 0.28, fontSize: 11, color: CLR.muted });
          s4.addText(`${stats.avgRating}★`, { x: 4.2, y: y+0.14, w: 0.8, h: 0.3, fontSize: 13, bold: true, color: barColor, align: 'center' });
          const cW = (stats.avgRating/5)*4.2;
          s4.addShape('rect', { x: 5.1, y: y+0.22, w: 4.2, h: 0.16, fill: { color: '2D3A55' }, rectRadius: 0.04 });
          if(cW>0) s4.addShape('rect', { x: 5.1, y: y+0.22, w: cW, h: 0.16, fill: { color: barColor }, rectRadius: 0.04 });
          const diff = (amazonData.avgRating - stats.avgRating).toFixed(1);
          s4.addText(winning?`+${diff} ↑`:`${diff} ↓`, { x: 8.85, y: y+0.16, w: 0.65, h: 0.28, fontSize: 10, bold: true, color: barColor, align: 'right' });
        });
      }
      addFooter(s4, brand, now);

      // ── SLIDE 5: INSIGHTS + RECOMMENDATIONS ──
      const s5 = pres.addSlide();
      addBg(s5);
      addSlideHeader(s5, 4, 'AI Insights & Strategic Recommendations');
      addBrandLogoCorner(s5);

      s5.addText('💡 Insights', { x: 0.4, y: 0.72, w: 4.4, h: 0.26, fontSize: 10, bold: true, color: CLR.pur });
      (amazonData.insights||[]).slice(0,4).forEach((ins,i) => {
        const y = 1.02 + i*1.06;
        s5.addShape('rect', { x: 0.4, y, w: 4.4, h: 0.95, fill: { color: CLR.card }, rectRadius: 0.08, line: { color: '6d28d9', width: 0.8 } });
        s5.addText(`INSIGHT ${i+1}`, { x: 0.55, y: y+0.07, w: 1.5, h: 0.18, fontSize: 7, bold: true, color: CLR.pur, charSpacing: 1 });
        s5.addText(ins, { x: 0.55, y: y+0.28, w: 4.1, h: 0.6, fontSize: 8.5, color: CLR.text, wrap: true });
      });

      s5.addText('🎯 Recommendations', { x: 5.1, y: 0.72, w: 4.5, h: 0.26, fontSize: 10, bold: true, color: CLR.grn });
      (amazonData.recommendations||[]).slice(0,3).forEach((rec,i) => {
        const y = 1.02 + i*1.42;
        s5.addShape('rect', { x: 5.1, y, w: 4.5, h: 1.3, fill: { color: CLR.card }, rectRadius: 0.08, line: { color: '15803d', width: 0.8 } });
        s5.addText(`ACTION ${i+1}`, { x: 5.25, y: y+0.07, w: 1.5, h: 0.18, fontSize: 7, bold: true, color: CLR.grn, charSpacing: 1 });
        s5.addText(rec, { x: 5.25, y: y+0.28, w: 4.2, h: 0.95, fontSize: 8.5, color: CLR.text, wrap: true });
      });
      addFooter(s5, brand, now);

      const buf = await pres.write({ outputType: 'nodebuffer' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
      res.setHeader('Content-Disposition', `attachment; filename="${brand}_Amazon_Report.pptx"`);
      return res.send(buf);
    } catch(e) {
      console.error('Amazon PPT error:', e.message);
      return res.status(500).json({ error: 'Amazon PPT failed: ' + e.message });
    }
  }

  try {
    const pres = new PptxGenJS();
    pres.layout  = 'LAYOUT_16x9';
    pres.author  = brand;
    pres.title   = `${brand} Reddit Intelligence Report`;
    pres.subject = `Reddit Brand Analysis ${fromDate} to ${toDate}`;

    // ── SLIDE 1: COVER ──────────────────────────────────────────────
    {
      const s = pres.addSlide();
      addBg(s);
      // Large orange accent left bar
      s.addShape('rect', { x: 0, y: 0, w: 0.18, h: '100%', fill: { color: CLR.acc } });
      // Subtle grid pattern via rectangles
      s.addShape('rect', { x: 0.18, y: 0, w: '100%', h: '100%', fill: { color: CLR.bg } });

      // ITC logo top left
      try { s.addImage({ data: LOGO_ITC, x: 0.3, y: 0.2, w: 0.8, h: 0.8, sizing: { type: 'contain' } }); } catch(e) {}
      // Reddit logo top right
      try { s.addImage({ data: LOGO_REDDIT, x: 8.5, y: 0.2, w: 1.2, h: 0.8, sizing: { type: 'contain' } }); } catch(e) {}

      s.addText('REDDIT BRAND INTELLIGENCE', {
        x: 0.5, y: 1.2, w: 9, h: 0.4,
        fontSize: 11, bold: true, color: CLR.acc, charSpacing: 4, align: 'center'
      });
      s.addText(brand, {
        x: 0.5, y: 1.7, w: 9, h: 1.1,
        fontSize: 54, bold: true, color: CLR.white, align: 'center'
      });
      s.addText('Brand Perception · Sentiment · Keyword Analysis', {
        x: 0.5, y: 2.85, w: 9, h: 0.35,
        fontSize: 14, color: CLR.muted, align: 'center'
      });
      // Orange divider
      s.addShape('line', { x: 3.5, y: 3.35, w: 3, h: 0, line: { color: CLR.acc, width: 2 } });
      // Meta chips
      const chips = [`📅 ${fromDate} → ${toDate}`, `📊 ${data?.summary.total_posts} Posts`, `💬 ${data?.summary.total_comments} Comments`, `🗓 Generated: ${now}`];
      chips.forEach((chip, i) => {
        const cx = 0.5 + i * 2.35;
        s.addShape('rect', { x: cx, y: 3.6, w: 2.15, h: 0.38, fill: { color: CLR.card }, rectRadius: 0.06, line: { color: '2D3A55', width: 1 } });
        s.addText(chip, { x: cx, y: 3.6, w: 2.15, h: 0.38, fontSize: 8.5, color: CLR.text, align: 'center', valign: 'middle', margin: 0 });
      });
      addFooter(s, brand, now);
    }

    // ── SLIDE 2: EXECUTIVE SUMMARY ───────────────────────────────────
    {
      const s = pres.addSlide();
      addBg(s);
      addSlideHeader(s, 2, 'Executive Summary');

      const sColor = data?.summary.sentiment_score >= 70 ? CLR.grn : data?.summary.sentiment_score >= 50 ? CLR.ylw : CLR.red;
      const kpis = [
        { v: data?.summary.total_posts,     l: 'Posts Found',      c: CLR.acc },
        { v: data?.summary.total_comments,  l: 'Comments',         c: CLR.pur },
        { v: data?.summary.sentiment_score + '/100', l: 'Sentiment Score', c: sColor },
        { v: data?.summary.sentiment_label, l: 'Overall Mood',     c: CLR.text },
      ];
      kpis.forEach((k, i) => addKpiBox(s, 0.4 + i * 2.35, 0.72, 2.15, 1.1, k.v, k.l, k.c));

      // Sentiment bar
      s.addText('Sentiment Distribution', { x: 0.4, y: 1.98, w: 4, h: 0.25, fontSize: 9, color: CLR.muted });
      const barY = 2.28, barH = 0.26, barW = 9.2;
      const posW = barW * sn.positive / 100;
      const neuW = barW * sn.neutral  / 100;
      const negW = barW * sn.negative / 100;
      s.addShape('rect', { x: 0.4,              y: barY, w: posW, h: barH, fill: { color: CLR.grn }, rectRadius: 0.04 });
      s.addShape('rect', { x: 0.4 + posW,       y: barY, w: neuW, h: barH, fill: { color: CLR.ylw } });
      s.addShape('rect', { x: 0.4 + posW + neuW, y: barY, w: negW, h: barH, fill: { color: CLR.red }, rectRadius: 0.04 });

      // Legend
      const legends = [[CLR.grn, `Positive ${sn.positive}%`], [CLR.ylw, `Neutral ${sn.neutral}%`], [CLR.red, `Negative ${sn.negative}%`]];
      legends.forEach(([c, l], i) => {
        s.addShape('ellipse', { x: 0.4 + i * 2.1, y: 2.68, w: 0.12, h: 0.12, fill: { color: c } });
        s.addText(l, { x: 0.57 + i * 2.1, y: 2.64, w: 1.8, h: 0.2, fontSize: 9, color: CLR.muted });
      });

      // Top subreddit
      s.addShape('rect', { x: 0.4, y: 3.0, w: 9.2, h: 0.42, fill: { color: CLR.card }, rectRadius: 0.06, line: { color: '2D3A55', width: 1 } });
      s.addText(`Top community: ${data?.summary.top_subreddit}  ·  Date range: ${fromDate} → ${toDate}`, {
        x: 0.5, y: 3.0, w: 9, h: 0.42, fontSize: 10, color: CLR.text, align: 'center', valign: 'middle', margin: 0
      });

      // Sample quote
      const q = data?.top_themes[0];
      if (q) {
        s.addShape('rect', { x: 0.4, y: 3.55, w: 9.2, h: 0.7, fill: { color: CLR.surf }, rectRadius: 0.06, line: { color: CLR.acc, width: 2 } });
        s.addText(`${q.icon}  "${q.example}"`, { x: 0.55, y: 3.6, w: 8.9, h: 0.6, fontSize: 10, italic: true, color: 'CBD5E1', valign: 'middle', margin: 0 });
      }
      addFooter(s, brand, now);
    }

    // ── SLIDE 3: HOT TOPICS & THEMES ─────────────────────────────────
    {
      const s = pres.addSlide();
      addBg(s);
      addSlideHeader(s, 3, 'Hot Topics & Themes');

      data?.top_themes.forEach((t, i) => {
        const rowY = 0.72 + i * 0.88;
        const sc = sentClr(t.sentiment);
        // Row bg
        s.addShape('rect', { x: 0.4, y: rowY, w: 9.2, h: 0.75, fill: { color: CLR.surf }, rectRadius: 0.06, line: { color: '2D3A55', width: 1 } });
        // Icon box
        s.addShape('rect', { x: 0.5, y: rowY + 0.08, w: 0.58, h: 0.58, fill: { color: CLR.card }, rectRadius: 0.06 });
        s.addText(t.icon, { x: 0.5, y: rowY + 0.08, w: 0.58, h: 0.58, fontSize: 18, align: 'center', valign: 'middle', margin: 0 });
        // Theme name
        s.addText(t.theme, { x: 1.2, y: rowY + 0.06, w: 4.5, h: 0.28, fontSize: 11, bold: true, color: CLR.white, margin: 0 });
        // Quote
        s.addText(`"${t.example}"`, { x: 1.2, y: rowY + 0.36, w: 5.5, h: 0.28, fontSize: 9, italic: true, color: CLR.muted, margin: 0 });
        // Count badge
        s.addShape('rect', { x: 7.1, y: rowY + 0.18, w: 0.7, h: 0.38, fill: { color: CLR.card }, rectRadius: 0.05 });
        s.addText(`${t.count}×`, { x: 7.1, y: rowY + 0.18, w: 0.7, h: 0.38, fontSize: 10, bold: true, color: CLR.muted, align: 'center', valign: 'middle', margin: 0 });
        // Sentiment badge
        s.addShape('rect', { x: 7.95, y: rowY + 0.18, w: 1.5, h: 0.38, fill: { color: sc + '22' }, rectRadius: 0.05, line: { color: sc, width: 1 } });
        s.addText(t.sentiment.charAt(0).toUpperCase() + t.sentiment.slice(1), { x: 7.95, y: rowY + 0.18, w: 1.5, h: 0.38, fontSize: 9, bold: true, color: sc, align: 'center', valign: 'middle', margin: 0 });
      });
      addFooter(s, brand, now);
    }

    // ── SLIDE 4: KEYWORD ASSOCIATIONS ────────────────────────────────
    {
      const s = pres.addSlide();
      addBg(s);
      addSlideHeader(s, 4, 'Keyword Associations — What is ' + brand + ' Linked To?');

      // Bubble cloud (top half)
      const kws = data?.keyword_associations || [];
      const maxF = Math.max(...kws.map(k => k.frequency), 1);
      // Place bubbles in a grid
      kws.slice(0, 8).forEach((k, i) => {
        const col = i % 4, row = Math.floor(i / 4);
        const bx = 0.4 + col * 2.35, by = 0.72 + row * 0.72;
        const tc = trendClr(k.trend);
        const szW = 1.8 + (k.frequency / maxF) * 0.4;
        s.addShape('rect', { x: bx, y: by, w: szW, h: 0.52, fill: { color: tc + '22' }, rectRadius: 0.26, line: { color: tc + '66', width: 1 } });
        s.addText(`${k.keyword}  ${k.frequency}`, { x: bx, y: by, w: szW, h: 0.52, fontSize: 9, bold: true, color: tc, align: 'center', valign: 'middle', margin: 0 });
      });

      // Legend
      s.addText('↑ Rising', { x: 0.4, y: 2.2, w: 1.2, h: 0.25, fontSize: 8, color: CLR.grn });
      s.addText('→ Stable', { x: 1.7, y: 2.2, w: 1.2, h: 0.25, fontSize: 8, color: CLR.muted });
      s.addText('↓ Falling', { x: 3.0, y: 2.2, w: 1.2, h: 0.25, fontSize: 8, color: CLR.red });

      // Table header
      const cols = [['Keyword', 2.8], ['Mentions', 1.2], ['Trend', 1.2], ['Context', 4.0]];
      let cx = 0.4;
      cols.forEach(([h, w]) => {
        s.addShape('rect', { x: cx, y: 2.55, w: w, h: 0.3, fill: { color: CLR.surf }, line: { color: '2D3A55', width: 1 } });
        s.addText(h, { x: cx + 0.05, y: 2.55, w: w - 0.1, h: 0.3, fontSize: 8, bold: true, color: CLR.muted, valign: 'middle', margin: 0 });
        cx += w;
      });

      // Table rows
      kws.slice(0, 5).forEach((k, i) => {
        const ry = 2.88 + i * 0.44;
        const fill = i % 2 === 0 ? CLR.card : CLR.surf;
        const tc = trendClr(k.trend);
        const ta = k.trend === 'rising' ? '↑ Rising' : k.trend === 'falling' ? '↓ Falling' : '→ Stable';
        const bw = (k.frequency / maxF) * 2.5;

        s.addShape('rect', { x: 0.4, y: ry, w: 9.2, h: 0.38, fill: { color: fill }, line: { color: '2D3A55', width: 1 } });
        s.addText(k.keyword,          { x: 0.5,  y: ry, w: 2.6, h: 0.38, fontSize: 9, bold: true, color: CLR.white, valign: 'middle', margin: 0 });
        s.addShape('rect',            { x: 3.2,  y: ry + 0.07, w: bw, h: 0.06, fill: { color: tc } });
        s.addText(`${k.frequency}`,   { x: 3.2,  y: ry, w: 1.1, h: 0.38, fontSize: 9, color: CLR.muted, align: 'center', valign: 'middle', margin: 0 });
        s.addText(ta,                 { x: 4.4,  y: ry, w: 1.1, h: 0.38, fontSize: 9, bold: true, color: tc, align: 'center', valign: 'middle', margin: 0 });
        s.addText(k.context,          { x: 5.6,  y: ry, w: 3.9, h: 0.38, fontSize: 8, italic: true, color: CLR.muted, valign: 'middle', margin: 0 });
      });
      addFooter(s, brand, now);
    }

    // ── SLIDE 5: TOP REDDIT POSTS ────────────────────────────────────
    {
      const s = pres.addSlide();
      addBg(s);
      addSlideHeader(s, 5, 'Top Reddit Posts — Click titles to open on Reddit');

      data?.top_posts.slice(0, 4).forEach((p, i) => {
        const py = 0.72 + i * 1.18;
        const sc = sentClr(p.sentiment);
        s.addShape('rect', { x: 0.4, y: py, w: 9.2, h: 1.05, fill: { color: CLR.surf }, rectRadius: 0.07, line: { color: '2D3A55', width: 1 } });
        // Left accent bar
        s.addShape('rect', { x: 0.4, y: py, w: 0.06, h: 1.05, fill: { color: sc }, rectRadius: 0.03 });
        // Subreddit badge
        s.addShape('rect', { x: 0.58, y: py + 0.08, w: 1.3, h: 0.24, fill: { color: CLR.acc + '22' }, rectRadius: 0.04 });
        s.addText(p.subreddit, { x: 0.58, y: py + 0.08, w: 1.3, h: 0.24, fontSize: 8, bold: true, color: CLR.acc, align: 'center', valign: 'middle', margin: 0 });
        if (p.flair) {
          s.addShape('rect', { x: 1.95, y: py + 0.08, w: 1.1, h: 0.24, fill: { color: CLR.card }, rectRadius: 0.04 });
          s.addText(p.flair, { x: 1.95, y: py + 0.08, w: 1.1, h: 0.24, fontSize: 7, color: CLR.muted, align: 'center', valign: 'middle', margin: 0 });
        }
        // Stats
        s.addText(`▲ ${p.upvotes}   💬 ${p.num_comments || 0}${p.awards > 0 ? `   🏆 ${p.awards}` : ''}`, {
          x: 7.2, y: py + 0.08, w: 2.3, h: 0.24, fontSize: 8, color: CLR.muted, align: 'right', valign: 'middle', margin: 0
        });
        // Title with hyperlink
        s.addText(p.title + ' ↗', {
          x: 0.58, y: py + 0.36, w: 8.9, h: 0.3,
          fontSize: 10.5, bold: true, color: CLR.white,
          hyperlink: { url: p.reddit_url }, margin: 0
        });
        // Quote
        s.addShape('rect', { x: 0.58, y: py + 0.68, w: 0.03, h: 0.28, fill: { color: CLR.acc } });
        s.addText(`"${p.key_quote}"`, { x: 0.67, y: py + 0.68, w: 8.8, h: 0.28, fontSize: 8.5, italic: true, color: CLR.muted, valign: 'middle', margin: 0 });
      });
      addFooter(s, brand, now);
    }

    // ── SLIDE 6: COMPETITOR LANDSCAPE ───────────────────────────────
    {
      const s = pres.addSlide();
      addBg(s);
      addSlideHeader(s, 6, 'Competitor Landscape');

      // Header row
      const headers = ['Brand', 'Mentions', `vs ${brand}`, 'Assessment'];
      const cws = [3.2, 1.6, 2.2, 2.2];
      let hx = 0.4;
      headers.forEach((h, i) => {
        s.addShape('rect', { x: hx, y: 0.72, w: cws[i], h: 0.32, fill: { color: CLR.surf }, line: { color: '2D3A55', width: 1 } });
        s.addText(h, { x: hx + 0.05, y: 0.72, w: cws[i] - 0.1, h: 0.32, fontSize: 9, bold: true, color: CLR.muted, valign: 'middle', margin: 0 });
        hx += cws[i];
      });

      data?.competitors_mentioned.forEach((c, i) => {
        const ry = 1.07 + i * 0.68;
        const fill = i % 2 === 0 ? CLR.card : CLR.surf;
        const col = c.vs_aashirvaad === 'favorable' ? CLR.grn : c.vs_aashirvaad === 'unfavorable' ? CLR.red : CLR.ylw;
        const lbl = c.vs_aashirvaad === 'favorable' ? 'We outperform' : c.vs_aashirvaad === 'unfavorable' ? 'They outperform' : 'Comparable';
        let rx = 0.4;
        const vals = [c.brand, String(c.mentions), c.vs_aashirvaad, lbl];
        vals.forEach((v, j) => {
          s.addShape('rect', { x: rx, y: ry, w: cws[j], h: 0.56, fill: { color: fill }, line: { color: '2D3A55', width: 1 } });
          s.addText(v, { x: rx + 0.06, y: ry, w: cws[j] - 0.12, h: 0.56, fontSize: j === 0 ? 11 : 10, bold: j === 0, color: j >= 2 ? col : CLR.white, valign: 'middle', margin: 0 });
          rx += cws[j];
        });
      });
      addFooter(s, brand, now);
    }

    // ── SLIDE 7: AI INSIGHTS ─────────────────────────────────────────
    {
      const s = pres.addSlide();
      addBg(s);
      addSlideHeader(s, 7, 'Strategic AI Insights');

      data?.insights.forEach((ins, i) => {
        const iy = 0.72 + i * 0.92;
        s.addShape('rect', { x: 0.4, y: iy, w: 9.2, h: 0.78, fill: { color: CLR.pur + '10' }, rectRadius: 0.07, line: { color: CLR.pur + '40', width: 1 } });
        s.addShape('rect', { x: 0.4, y: iy, w: 0.06, h: 0.78, fill: { color: CLR.pur }, rectRadius: 0.03 });
        s.addShape('rect', { x: 0.55, y: iy + 0.07, w: 0.85, h: 0.22, fill: { color: CLR.pur + '30' }, rectRadius: 0.04 });
        s.addText(`INSIGHT ${i + 1}`, { x: 0.55, y: iy + 0.07, w: 0.85, h: 0.22, fontSize: 7.5, bold: true, color: CLR.pur, align: 'center', valign: 'middle', margin: 0 });
        s.addText(ins, { x: 1.5, y: iy + 0.06, w: 8.0, h: 0.66, fontSize: 10, color: CLR.text, valign: 'middle', margin: 0 });
      });
      addFooter(s, brand, now);
    }

    // ── SLIDE 8: SIGNAL ALERTS ───────────────────────────────────────
    {
      const s = pres.addSlide();
      addBg(s);
      addSlideHeader(s, 8, 'Signal Alerts & Recommendations');

      data?.signal_alerts.forEach((sig, i) => {
        const sy = 0.72 + i * 1.42;
        const uc = urgClr(sig.urgency);
        s.addShape('rect', { x: 0.4, y: sy, w: 9.2, h: 1.25, fill: { color: uc + '12' }, rectRadius: 0.08, line: { color: uc + '44', width: 1 } });
        s.addShape('rect', { x: 0.4, y: sy, w: 0.07, h: 1.25, fill: { color: uc }, rectRadius: 0.04 });
        // Urgency badge
        s.addShape('rect', { x: 0.6, y: sy + 0.1, w: 1.3, h: 0.26, fill: { color: uc + '30' }, rectRadius: 0.04 });
        s.addText(`${sig.urgency.toUpperCase()} PRIORITY`, { x: 0.6, y: sy + 0.1, w: 1.3, h: 0.26, fontSize: 7.5, bold: true, color: uc, align: 'center', valign: 'middle', margin: 0 });
        // Signal
        s.addText(sig.signal, { x: 2.05, y: sy + 0.07, w: 7.4, h: 0.4, fontSize: 11, bold: true, color: CLR.white, valign: 'middle', margin: 0 });
        // Action
        s.addShape('rect', { x: 0.6, y: sy + 0.55, w: 8.9, h: 0.58, fill: { color: CLR.card }, rectRadius: 0.05 });
        s.addText('→  Recommended action:', { x: 0.72, y: sy + 0.6, w: 2.1, h: 0.2, fontSize: 8, bold: true, color: CLR.muted, margin: 0 });
        s.addText(sig.action, { x: 0.72, y: sy + 0.8, w: 8.6, h: 0.28, fontSize: 9.5, color: CLR.text, valign: 'top', margin: 0 });
      });
      addFooter(s, brand, now);
    }

    // ── SLIDE 9: EXECUTIVE BRIEF ─────────────────────────────────────
    {
      const s = pres.addSlide();
      addBg(s);
      addSlideHeader(s, 9, '📤 Executive Brief — Share Ready');

      s.addText('Copy this into WhatsApp or email for your manager:', {
        x: 0.4, y: 0.72, w: 9.2, h: 0.28, fontSize: 9.5, italic: true, color: CLR.muted
      });

      // Brief card
      s.addShape('rect', { x: 0.4, y: 1.05, w: 9.2, h: 3.6, fill: { color: CLR.acc + '0D' }, rectRadius: 0.1, line: { color: CLR.acc + '44', width: 1.5 } });

      const top = data?.top_themes[0];
      const sig = data?.signal_alerts[0];
      const lines = [
        { label: '🌾  Brand:', value: `${brand} Reddit Pulse  |  ${fromDate} → ${toDate}` },
        { label: '📊  Sentiment:', value: `${data?.summary.sentiment_score}/100  (${data?.summary.sentiment_label})` },
        { label: '📝  Posts:', value: `${data?.summary.total_posts} analyzed across ${data?.summary.top_subreddit}` },
        { label: '🔥  Top topic:', value: `${top?.theme} — "${top?.example}"` },
        { label: '💡  Insight:', value: data?.insights[0] || '—' },
        { label: '🚨  Alert:', value: `${sig?.signal || '—'} (${sig?.urgency || '—'} priority)` },
        { label: '🔗  Top post:', value: data?.top_posts[0]?.reddit_url || '—' },
      ];

      lines.forEach((l, i) => {
        const ly = 1.18 + i * 0.46;
        s.addText(l.label, { x: 0.6,  y: ly, w: 1.6, h: 0.38, fontSize: 9.5, bold: true, color: CLR.acc, valign: 'middle', margin: 0 });
        s.addText(l.value, { x: 2.25, y: ly, w: 7.2, h: 0.38, fontSize: 9.5, color: CLR.text, valign: 'middle', margin: 0 });
      });

      addFooter(s, brand, now);
    }

    // ── WRITE & SEND ─────────────────────────────────────────────────
    const base64 = await pres.write({ outputType: 'base64' });
    const buffer = Buffer.from(base64, 'base64');

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename="${brand}_Reddit_Report_${fromDate}_to_${toDate}.pptx"`);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Content-Length', buffer.length);
    res.status(200).send(buffer);

  } catch (err) {
    console.error('PPT generation error:', err);
    res.status(500).json({ error: err.message || 'PPT generation failed' });
  }
}

export const config = { api: { bodyParser: { sizeLimit: '2mb' }, responseLimit: '10mb' } };
