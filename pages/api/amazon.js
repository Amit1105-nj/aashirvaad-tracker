import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── BRAND ASINs ──
const BRAND_ASINS = {
  Aashirvaad: {
    'All Products':  ['B00HUJQIZK','B0CZP8LYWC','B07D3CXH7H','B0154J82KG','B00K0LUSSS','B0CL6K4KGX'],
    'Atta & Flour':  ['B00HUJQIZK','B00K0LUSSS','B0CZP8LYWC'],
    'Basic Spices':  ['B0154J82KG','B0CL6K4KGX'],
    'Whole Spices':  ['B0CL6K4KGX','B0154J82KG'],
    'Ghee & Dairy':  ['B07D3CXH7H','B09V37R6F2'],
  },
  Sunfeast: {
    'All Products':  ['B08B987DBL','B0D83Z6DFQ','B0DGKVSM76','B06WGM2HK2','B0BSX9N69D'],
    'Dark Fantasy':  ['B0D83Z6DFQ','B0DGKVSM76','B0BSX9N69D'],
    "Mom's Magic":   ['B08B987DBL'],
    'Farmlite':      ['B08B987DBL'],
    'Marie & Others':['B08B987DBL','B06WGM2HK2'],
    'Cakes':         ['B06WGM2HK2'],
  },
  Yippee: {
    'All Products':  ['B08GY5DRXB','B079GXGN8K','B00MHO7YX8','B079GX9DT2'],
    'Noodles':       ['B08GY5DRXB','B00MHO7YX8','B079GX9DT2'],
    'Pasta':         ['B079GXGN8K'],
  },
  Bingo: {
    'All Products':  ['B00NPT3WZ8','B07RQKHTCK','B00NPU8R1Q','B07QQ2T6NV','B00XJEUIEM'],
  },
  Candyman: {
    'All Products':  ['B01IKD32B2','B079GXVSKC','B07QR6YYM8','B07216MWSY'],
  },
  Fabelle: {
    'All Products':  ['B07Z8ZBTRB','B07Z8Z53WM','B07RKVCR8R','B07RQR9RQ3','B07RLPF9BF'],
  },
};

// ── COMPETITOR ASINs ──
const COMPETITOR_ASINS = {
  // Aashirvaad competitors
  'Pillsbury':      ['B00AK8J4QS','B0784C7HQF'],
  'Fortune Atta':   ['B07B3SXBCM','B07B3SMPF6'],
  'Patanjali Atta': ['B01BVEE824','B01MTFQROQ'],
  'Annapurna':      ['B00K0LUSSS'],
  // Bingo competitors
  'Lays':           ['B00NPU8PBI','B07B3T1S3F'],
  'Kurkure':        ['B00NPU8R1Q','B07B3V7QKM'],
  'Haldirams':      ['B07B3SMPF6','B07B3SXBCM'],
  'Too Yumm':       ['B07RQKHTCK'],
  // Sunfeast competitors
  'Britannia':      ['B00NPT3WZ8','B07B3T1S3F'],
  'Parle-G':        ['B00AK8J4QS','B07B3SMPF6'],
  'Oreo':           ['B00K0LUSSS','B07B3SXBCM'],
  'McVities':       ['B07RQKHTCK'],
  // Yippee competitors
  'Maggi':          ['B08GY5DRXB','B079GXGN8K'],
  "Ching's Secret": ['B00MHO7YX8'],
  'Top Ramen':      ['B079GX9DT2'],
  'Wai Wai':        ['B00NPT3WZ8'],
  // Candyman competitors
  'Cadbury Eclairs':['B01IKD32B2'],
  'Alpenliebe':     ['B079GXVSKC'],
  'Mentos':         ['B07QR6YYM8'],
  // Fabelle competitors
  'Cadbury Silk':   ['B07Z8ZBTRB'],
  'Ferrero Rocher': ['B07Z8Z53WM'],
  'Lindt':          ['B07RKVCR8R'],
};

async function scrapeReviews(asins, token) {
  if (!asins || asins.length === 0) return [];

  const productUrls = asins.slice(0, 4).map(asin => ({
    url: `https://www.amazon.in/dp/${asin}`,
  }));

  const runResponse = await fetch(
    `https://api.apify.com/v2/acts/junglee~amazon-reviews-scraper/runs?token=${token}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productUrls,
        maxReviews: 30,
        filterByRating: 'all_stars',
        sortBy: 'recent',
        proxy: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] },
        filterByRatings: ['allStars'],
        deduplicateRedirectedAsins: true,
        scrapeProductDetails: false,
      })
    }
  );

  if (!runResponse.ok) return [];

  const runData = await runResponse.json();
  const runId = runData.data?.id;
  if (!runId) return [];

  let attempts = 0, runStatus = 'RUNNING', datasetId = null;
  while (attempts < 24 && (runStatus === 'RUNNING' || runStatus === 'READY')) {
    await new Promise(r => setTimeout(r, 5000));
    const s = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`);
    const sd = await s.json();
    runStatus = sd.data?.status;
    datasetId = sd.data?.defaultDatasetId;
    if (runStatus === 'FAILED' || runStatus === 'ABORTED') return [];
    attempts++;
  }

  if (runStatus !== 'SUCCEEDED' || !datasetId) return [];

  const r = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&limit=50&clean=true`);
  return await r.json();
}

function normalizeReviews(rawItems, source = 'brand') {
  return rawItems.map(item => ({
    title: (item.reviewTitle || item.title || item.heading || '').slice(0, 200),
    body: (item.reviewBody || item.body || item.text || item.review || item.reviewText || item.content || '').slice(0, 500),
    rating: parseFloat(item.ratingScore || item.rating || item.stars || item.starRating || 0),
    author: item.reviewerName || item.userName || item.author || item.name || 'Verified Buyer',
    date: item.reviewedIn || item.date || item.publishedDate || item.reviewDate || '',
    verified: item.isVerifiedPurchase || item.verified || item.verifiedPurchase || false,
    helpful: item.helpfulCount || item.foundHelpful || item.helpfulVotes || 0,
    product: (item.productName || item.productTitle || item.asin || '').slice(0, 100),
    url: item.reviewUrl || item.url || item.link || '',
    source,
  })).filter(r => r.body || r.title);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { brand, subCategory, competitors } = req.body;
  if (!brand) return res.status(400).json({ error: 'Missing brand' });

  const APIFY_API_KEY = process.env.APIFY_API_KEY;
  if (!APIFY_API_KEY) return res.status(500).json({ error: 'APIFY_API_KEY not configured' });

  const brandConfig = BRAND_ASINS[brand];
  if (!brandConfig) return res.status(400).json({ error: 'Brand not configured' });

  const selectedSub = subCategory || 'All Products';
  const brandAsins = brandConfig[selectedSub] || brandConfig['All Products'];

  try {
    // Scrape brand + competitors simultaneously
    const competitorList = competitors || [];
    const scrapePromises = [scrapeReviews(brandAsins, APIFY_API_KEY)];

    // Add competitor scraping (max 3 competitors to keep cost low)
    const competitorsToScrape = competitorList.slice(0, 3);
    for (const comp of competitorsToScrape) {
      const compAsins = COMPETITOR_ASINS[comp];
      if (compAsins) scrapePromises.push(scrapeReviews(compAsins, APIFY_API_KEY));
      else scrapePromises.push(Promise.resolve([]));
    }

    const results = await Promise.all(scrapePromises);
    const rawBrandItems = results[0] || [];
    const brandReviews = normalizeReviews(rawBrandItems, 'brand');

    // Competitor reviews
    const competitorReviews = {};
    competitorsToScrape.forEach((comp, i) => {
      competitorReviews[comp] = normalizeReviews(results[i + 1] || [], comp);
    });

    if (brandReviews.length === 0) {
      return res.status(200).json({ success: true, reviews: [], message: 'No reviews found' });
    }

    // Rating stats
    const ratings = brandReviews.filter(r => r.rating > 0).map(r => r.rating);
    const avgRating = ratings.length > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : 0;
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    ratings.forEach(r => { const k = Math.round(r); if (dist[k] !== undefined) dist[k]++; });

    // Top positive + negative
    const sorted = [...brandReviews].filter(r => r.rating > 0).sort((a, b) => b.rating - a.rating);
    const top5Positive = sorted.slice(0, 5);
    const top5Negative = sorted.slice(-5).reverse();

    // Competitor avg ratings
    const competitorStats = {};
    for (const [comp, reviews] of Object.entries(competitorReviews)) {
      const compRatings = reviews.filter(r => r.rating > 0).map(r => r.rating);
      competitorStats[comp] = {
        avgRating: compRatings.length > 0
          ? Math.round((compRatings.reduce((a, b) => a + b, 0) / compRatings.length) * 10) / 10 : 0,
        total: reviews.length,
      };
    }

    // Claude AI analysis
    const reviewText = brandReviews.slice(0, 20).map(r => `[${r.rating}★] ${r.title}: ${r.body}`).join('\n');

    const aiResponse = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1500,
      system: 'Return ONLY valid JSON. No markdown, no backticks.',
      messages: [{
        role: 'user',
        content: `Analyse these Amazon reviews for ${brand} (ITC India):

${reviewText}

Return JSON:
{
  "sentiment_score": <0-100>,
  "sentiment_label": "Positive|Mixed|Negative",
  "themes": [
    {"theme": "<what customers repeatedly mention>", "sentiment": "positive|negative|neutral", "count": <int>, "example": "<quote>"},
    {"theme": "<theme>", "sentiment": "positive|negative|neutral", "count": <int>, "example": "<quote>"},
    {"theme": "<theme>", "sentiment": "positive|negative|neutral", "count": <int>, "example": "<quote>"},
    {"theme": "<theme>", "sentiment": "positive|negative|neutral", "count": <int>, "example": "<quote>"},
    {"theme": "<theme>", "sentiment": "positive|negative|neutral", "count": <int>, "example": "<quote>"}
  ],
  "insights": [
    "<Practical insight 1 for ${brand} brand team based on reviews>",
    "<Insight 2>",
    "<Insight 3>",
    "<Insight 4>"
  ],
  "recommendations": [
    "<Specific actionable recommendation 1>",
    "<Recommendation 2>",
    "<Recommendation 3>"
  ]
}`
      }]
    });

    let aiData = { sentiment_score: 70, sentiment_label: 'Mixed', themes: [], insights: [], recommendations: [] };
    try {
      const raw = aiResponse.content[0].text;
      aiData = JSON.parse(raw.replace(/```json|```/g, '').trim());
    } catch (e) {
      console.log('AI parse error:', e.message);
    }

    return res.status(200).json({
      success: true,
      reviews: brandReviews.slice(0, 50),
      total: brandReviews.length,
      avgRating,
      ratingDistribution: dist,
      sentimentScore: aiData.sentiment_score,
      sentimentLabel: aiData.sentiment_label,
      themes: aiData.themes || [],
      insights: aiData.insights || [],
      recommendations: aiData.recommendations || [],
      top5Positive,
      top5Negative,
      competitorStats,
      subCategory: selectedSub,
      scrapeDate: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Amazon error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}

export const config = { api: { bodyParser: { sizeLimit: '4mb' }, responseLimit: '10mb' } };
