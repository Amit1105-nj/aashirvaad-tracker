export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { brand } = req.body;
  if (!brand) return res.status(400).json({ error: 'Missing brand' });

  const APIFY_API_KEY = process.env.APIFY_API_KEY;
  if (!APIFY_API_KEY) return res.status(500).json({ error: 'APIFY_API_KEY not configured' });

  // Brand config — ASINs for direct product scraping, keywords for search-based
  const BRAND_AMAZON = {
    Aashirvaad: {
      mode: 'asins',
      asins: ['B00HUJQIZK','B0CZP8LYWC','B07D3CXH7H','B0154J82KG','B00K0LUSSS','B0CL6K4KGX','B0D9417QJB','B09V37R6F2'],
    },
    Sunfeast: {
      mode: 'asins',
      asins: ['B08B987DBL','B0D83Z6DFQ','B0DGKVSM76','B06WGM2HK2','B0BSX9N69D','B0DYF5KKZZ'],
    },
    Yippee: {
      mode: 'asins',
      asins: ['B08GY5DRXB','B079GXGN8K','B00MHO7YX8','B079GX9DT2'],
    },
    Bingo: {
      mode: 'keyword',
      keywords: ['Bingo chips', 'Mad Angles', 'Tedhe Medhe', 'Bingo Nachos', 'Bingo Curlz'],
    },
    Candyman: {
      mode: 'keyword',
      keywords: ['Candyman eclairs', 'ITC Candyman'],
    },
    Fabelle: {
      mode: 'keyword',
      keywords: ['Fabelle chocolate', 'Fabelle ITC'],
    },
  };

  const config = BRAND_AMAZON[brand];
  if (!config) return res.status(400).json({ error: 'Brand not configured' });

  try {
    let startUrls = [];

    let productUrls = [];

    if (config.mode === 'asins') {
      // Use clean product page URLs — no tracking params
      productUrls = config.asins.slice(0, 5).map(asin => ({
        url: `https://www.amazon.in/dp/${asin}`,
      }));
    } else {
      // Keyword search on Amazon.in
      productUrls = config.keywords.slice(0, 3).map(kw => ({
        url: `https://www.amazon.in/s?k=${encodeURIComponent(kw)}`,
      }));
    }

    // Use junglee/amazon-reviews-scraper with correct startUrls format
    const runResponse = await fetch(
      `https://api.apify.com/v2/acts/junglee~amazon-reviews-scraper/runs?token=${APIFY_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startUrls: productUrls,
          maxReviews: 30,
          proxy: {
            useApifyProxy: true,
            apifyProxyGroups: ['RESIDENTIAL'],
          },
        })
      }
    );

    if (!runResponse.ok) {
      const errText = await runResponse.text();
      throw new Error(`Apify Amazon start failed (${runResponse.status}): ${errText.slice(0, 200)}`);
    }

    const runData = await runResponse.json();
    const runId = runData.data?.id;
    if (!runId) throw new Error('No run ID from Apify');

    // Poll for completion — max 3 minutes
    let attempts = 0;
    let runStatus = 'RUNNING';
    let datasetId = null;

    while (attempts < 36 && (runStatus === 'RUNNING' || runStatus === 'READY')) {
      await new Promise(r => setTimeout(r, 5000));
      const s = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_KEY}`);
      const sd = await s.json();
      runStatus = sd.data?.status;
      datasetId = sd.data?.defaultDatasetId;
      if (runStatus === 'FAILED' || runStatus === 'ABORTED') throw new Error(`Apify run ${runStatus}`);
      attempts++;
    }

    if (runStatus !== 'SUCCEEDED') throw new Error('Amazon scrape timed out');

    const r = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_API_KEY}&limit=100&clean=true`);
    const rawItems = await r.json();

    if (!rawItems || rawItems.length === 0) {
      return res.status(200).json({ success: true, reviews: [], message: 'No reviews found' });
    }

    // Normalise reviews
    const reviews = rawItems.map(r => ({
      title: (r.reviewTitle || r.title || '').slice(0, 200),
      body: (r.reviewBody || r.body || r.review || '').slice(0, 500),
      rating: parseFloat(r.ratingScore || r.rating || r.starRating || 0),
      author: r.reviewerName || r.author || 'Verified Buyer',
      date: r.reviewedIn || r.date || r.reviewDate || '',
      verified: r.verifiedPurchase || r.verified || false,
      helpful: r.helpfulCount || r.helpful || 0,
      product: (r.productName || r.product || brand).slice(0, 100),
      url: r.url || r.reviewUrl || '',
    })).filter(r => r.body || r.title);

    // Calculate avg rating
    const ratings = reviews.filter(r => r.rating > 0).map(r => r.rating);
    const avgRating = ratings.length > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : 0;

    // Rating distribution
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    ratings.forEach(r => { const k = Math.round(r); if (dist[k] !== undefined) dist[k]++; });

    return res.status(200).json({
      success: true,
      reviews: reviews.slice(0, 50),
      total: reviews.length,
      avgRating,
      ratingDistribution: dist,
      scrapeDate: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Amazon scrape error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}

export const config = { api: { bodyParser: { sizeLimit: '2mb' }, responseLimit: '10mb' } };
