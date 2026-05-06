export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { data, meta } = req.body;
  if (!data || !meta) return res.status(400).json({ error: 'Missing data' });

  const { fromDate, toDate, brand } = meta;
  const sn = data.sentiment_breakdown;
  const now = new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' });

  const esc = s => String(s||'').replace(/&/g,'and').replace(/</g,'(').replace(/>/g,')').replace(/"/g,"'");
  const sc  = s => s==='positive'?'#16a34a':s==='negative'?'#dc2626':'#d97706';
  const uc  = u => u==='high'?'#dc2626':u==='medium'?'#d97706':'#16a34a';
  const tc  = t => t==='rising'?'#16a34a':t==='falling'?'#dc2626':'#94a3b8';
  const ta  = t => t==='rising'?'Rising':t==='falling'?'Falling':'Stable';
  const sColor = data.summary.sentiment_score>=70?'#16a34a':data.summary.sentiment_score>=50?'#d97706':'#dc2626';

  const postCards = (data.top_posts||[]).map(p => `
<div style="border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin:8px 0;background:#f8fafc">
  <p style="margin-bottom:5px">
    <b style="color:#e84317">${esc(p.subreddit)}</b>
    ${p.flair ? `&nbsp;<span style="background:#f1f5f9;padding:1px 6px;border-radius:4px;font-size:9pt">${esc(p.flair)}</span>` : ''}
    &nbsp;·&nbsp; <span style="color:#64748b">▲ ${p.upvotes} upvotes</span>
    ${p.num_comments ? `&nbsp;·&nbsp; <span style="color:#64748b">💬 ${p.num_comments} comments</span>` : ''}
    ${p.awards > 0 ? `&nbsp;·&nbsp; <span style="color:#d97706">🏆 ${p.awards} award${p.awards>1?'s':''}</span>` : ''}
    ${p.author ? `&nbsp;·&nbsp; <span style="color:#94a3b8">u/${esc(p.author)}</span>` : ''}
  </p>
  <p style="font-size:12pt;font-weight:bold;margin-bottom:5px">
    <a href="${p.reddit_url}" style="color:#e84317;text-decoration:none">${esc(p.title)} ↗</a>
  </p>
  <p style="color:#475569;font-style:italic;border-left:3px solid #e84317;padding-left:8px;margin-bottom:8px">"${esc(p.key_quote)}"</p>
  <p style="font-size:9pt"><a href="${p.reddit_url}" style="color:#e84317">${p.reddit_url}</a></p>
</div>`).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
body{font-family:Arial,sans-serif;font-size:11pt;color:#1e293b;margin:2cm;line-height:1.5}
h1{font-size:15pt;color:#e84317;border-bottom:2px solid #e84317;padding-bottom:5px;margin:22px 0 10px;page-break-before:always}
h1:first-of-type{page-break-before:avoid}
h2{font-size:12pt;color:#1e293b;border-left:3px solid #e84317;padding-left:8px;margin:14px 0 7px}
p{margin:5px 0}
table{width:100%;border-collapse:collapse;margin:8px 0;font-size:10pt}
th{background:#1e293b;color:white;padding:7px 9px;text-align:left}
td{padding:6px 9px;border-bottom:1px solid #e2e8f0;vertical-align:top}
tr:nth-child(even) td{background:#f8fafc}
.kpirow{display:flex;gap:12px;margin:12px 0;flex-wrap:wrap}
.kpi{flex:1;min-width:120px;border:1px solid #e2e8f0;border-radius:6px;padding:10px 14px;text-align:center;background:#f8fafc}
.kn{font-size:20pt;font-weight:900;display:block}
.kl{font-size:9pt;color:#94a3b8}
.ins{background:#f5f3ff;border-left:3px solid #7c3aed;padding:9px 12px;margin:7px 0;border-radius:0 5px 5px 0}
.brief{background:#fff7ed;border:1px solid #fed7aa;border-radius:7px;padding:14px;font-size:10.5pt;line-height:1.8}
.chip{display:inline-block;border-radius:14px;padding:2px 8px;margin:2px;font-size:9pt;font-weight:bold}
</style>
</head>
<body>

<div style="text-align:center;padding:40px 0 24px;border-bottom:2px solid #e84317;margin-bottom:20px">
  <p style="color:#e84317;font-size:10pt;font-weight:bold;text-transform:uppercase;letter-spacing:2px">Reddit Brand Intelligence Report</p>
  <p style="font-size:26pt;font-weight:900;margin:8px 0">🌾 ${esc(brand)}</p>
  <p style="color:#64748b">Sentiment, Keyword and Post Link Analysis</p>
  <p style="color:#94a3b8;font-size:10pt;margin-top:10px">${esc(fromDate)} to ${esc(toDate)} | ${data.summary.total_posts} posts | Generated: ${esc(now)}</p>
</div>

<h1>1. Executive Summary</h1>
<div class="kpirow">
  <div class="kpi"><span class="kn" style="color:#e84317">${data.summary.total_posts}</span><span class="kl">Posts Found</span></div>
  <div class="kpi"><span class="kn" style="color:#7c3aed">${data.summary.total_comments}</span><span class="kl">Comments</span></div>
  <div class="kpi"><span class="kn" style="color:${sColor}">${data.summary.sentiment_score}/100</span><span class="kl">Sentiment Score</span></div>
  <div class="kpi"><span class="kn" style="font-size:13pt;padding-top:6px">${esc(data.summary.sentiment_label)}</span><span class="kl">Overall Mood</span></div>
</div>
<p><b style="color:#16a34a">Positive: ${sn.positive}%</b> | <b style="color:#d97706">Neutral: ${sn.neutral}%</b> | <b style="color:#dc2626">Negative: ${sn.negative}%</b></p>
<p>Top community: <b>${esc(data.summary.top_subreddit)}</b></p>

<h1>2. Hot Topics and Themes</h1>
<table>
  <tr><th>Theme</th><th>Mentions</th><th>Sentiment</th><th>Sample Quote</th></tr>
  ${(data.top_themes||[]).map(t=>`<tr><td><b>${t.icon} ${esc(t.theme)}</b></td><td>${t.count}</td><td style="color:${sc(t.sentiment)};font-weight:bold">${t.sentiment}</td><td><i>${esc(t.example)}</i></td></tr>`).join('')}
</table>

<h1>3. Keyword Associations</h1>
<p>Words Reddit users co-mention with ${esc(brand)}:</p><br>
${(data.keyword_associations||[]).map(k=>`<span class="chip" style="background:${tc(k.trend)}22;color:${tc(k.trend)};border:1px solid ${tc(k.trend)}55">${esc(k.keyword)} (${k.frequency})</span>`).join('')}
<br><br>
<table>
  <tr><th>Keyword</th><th>Frequency</th><th>Trend</th><th>Why Users Link It</th></tr>
  ${(data.keyword_associations||[]).map(k=>`<tr><td><b>${esc(k.keyword)}</b></td><td>${k.frequency}</td><td style="color:${tc(k.trend)};font-weight:bold">${ta(k.trend)}</td><td><i>${esc(k.context)}</i></td></tr>`).join('')}
</table>
${(data.keyword_clusters||[]).length ? `<h2>Keyword Clusters</h2>${(data.keyword_clusters||[]).map(c=>`<p><b style="color:#7c3aed">${esc(c.cluster)}:</b> ${c.keywords.map(esc).join(', ')}</p>`).join('')}` : ''}

<h1>4. Top Reddit Posts with Direct Links</h1>
<p style="color:#64748b;font-size:10pt">Click any title to open the original Reddit post.</p>
${postCards}

<h1>5. Competitor Landscape</h1>
<table>
  <tr><th>Brand</th><th>Mentions</th><th>vs ${esc(brand)}</th><th>Assessment</th></tr>
  ${(data.competitors_mentioned||[]).map(c=>{
    const col=c.vs_aashirvaad==='favorable'?'#16a34a':c.vs_aashirvaad==='unfavorable'?'#dc2626':'#d97706';
    const lbl=c.vs_aashirvaad==='favorable'?'We outperform':c.vs_aashirvaad==='unfavorable'?'They outperform':'Comparable';
    return `<tr><td><b>${esc(c.brand)}</b></td><td>${c.mentions}</td><td style="color:${col};font-weight:bold">${esc(c.vs_aashirvaad)}</td><td style="color:${col}">${lbl}</td></tr>`;
  }).join('')}
</table>

<h1>6. Strategic AI Insights</h1>
${(data.insights||[]).map((ins,i)=>`<div class="ins"><p style="font-size:9pt;color:#7c3aed;font-weight:bold;margin-bottom:4px">INSIGHT ${i+1}</p><p>${esc(ins)}</p></div>`).join('')}

<h1>7. Signal Alerts and Recommendations</h1>
${(data.signal_alerts||[]).map(s=>`<div style="background:${uc(s.urgency)}11;border-left:4px solid ${uc(s.urgency)};border-radius:5px;padding:9px 12px;margin:7px 0"><p style="font-size:9pt;font-weight:bold;color:${uc(s.urgency)};margin-bottom:4px">${s.urgency.toUpperCase()} PRIORITY</p><p><b>${esc(s.signal)}</b></p><p style="color:#475569;margin-top:3px">Action: ${esc(s.action)}</p></div>`).join('')}

<h1>8. Executive Brief</h1>
<div class="brief">
  <b style="color:#e84317">${esc(brand)} Reddit Pulse | ${esc(fromDate)} to ${esc(toDate)}</b><br><br>
  Sentiment: ${data.summary.sentiment_score}/100 (${esc(data.summary.sentiment_label)})<br>
  Posts: ${data.summary.total_posts} analyzed across ${esc(data.summary.top_subreddit)}<br>
  Top topic: ${esc(data.top_themes[0]?.theme||'')}<br>
  Key insight: ${esc(data.insights[0]||'')}<br>
  Alert: ${esc(data.signal_alerts[0]?.signal||'')} (${esc(data.signal_alerts[0]?.urgency||'')} priority)<br>
  Top post: <a href="${data.top_posts[0]?.reddit_url||''}" style="color:#e84317">${data.top_posts[0]?.reddit_url||''}</a>
</div>

<p style="text-align:center;color:#94a3b8;font-size:9pt;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:10px">
  ${esc(brand)} Reddit Intelligence Agent · Powered by Claude AI · ${esc(now)}
</p>
</body></html>`;

  res.setHeader('Content-Type','application/msword');
  res.setHeader('Content-Disposition',`attachment; filename="${brand}_Reddit_Report_${fromDate}_to_${toDate}.doc"`);
  res.setHeader('Cache-Control','no-cache');
  res.status(200).send(html);
}

export const config = { api:{ bodyParser:{ sizeLimit:'2mb' } } };
