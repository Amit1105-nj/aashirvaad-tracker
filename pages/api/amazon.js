export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { brand, subCategory } = req.body;
  if (!brand) return res.status(400).json({ error: 'Missing brand' });

  const APIFY_API_KEY = process.env.APIFY_API_KEY;
  if (!APIFY_API_KEY) return res.status(500).json({ error: 'APIFY_API_KEY not configured' });

  // All ASIN-based — junglee actor requires productUrls with /product-reviews/ URLs
  const BRAND_ASINS = {
    Aashirvaad: {
      'All Products':  ['B00HUJQIZK','B0CZP8LYWC','B07D3CXH7H','B0154J82KG','B00K0LUSSS','B0CL6K4KGX','B0D9417QJB','B09V37R6F2'],
      'Atta & Flour':  ['B00HUJQIZK','B00K0LUSSS','B09V37R6F2','B0CZP8LYWC'],
      'Basic Spices':  ['B0154J82KG','B0CL6K4KGX'],
      'Whole Spices':  ['B0CL6K4KGX','B0154J82KG'],
      'Ghee & Dairy':  ['B07D3CXH7H','B09V37R6F2'],
    },
    Sunfeast: {
      'All Products':  ['B08B987DBL','B0D83Z6DFQ','B0DGKVSM76','B06WGM2HK2','B0BSX9N69D','B0DYF5KKZZ'],
      'Dark Fantasy':  ['B0D83Z6DFQ','B0DGKVSM76','B0BSX9N69D'],
      "Mom's Magic":   ['B08B987DBL','B0DYF5KKZZ'],
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
      'All Products':  ['B00NPT3WZ8','B07RQKHTCK','B00NPU8R1Q','B07QQ2T6NV','B00XJEUIEM','B00TZS0UR6'],
    },
    Candyman: {
      'All Products':  ['B01IKD32B2','B079GXVSKC','B07QR6YYM8','B07216MWSY','B072QM6L75'],
    },
    Fabelle: {
      'All Products':  ['B07Z8ZBTRB','B07Z8Z53WM','B07RKVCR8R','B07RQR9RQ3','B07RLPF9BF','B07SBTSD91','B07Z8ZXKJQ'],
    },
  };

  const brandConfig = BRAND_ASINS[brand];
  if (!brandConfig) return res.status(400).json({ error: 'Brand not configured' });

  const selectedSub = subCategory || 'All Products';
  const asins = brandConfig[selectedSub] || brandConfig['All Products'];

  try {
    // Exact format required by junglee/amazon-reviews-scraper
    const productUrls = asins.slice(0, 6).map(asin => ({
      url: `https://www.amazon.in/product-reviews/${asin}/?sortBy=recent&pageSize=20`,
    }));

    const runResponse = await fetch(
      `https://api.apify.com/v2/acts/junglee~amazon-reviews-scraper/runs?token=${APIFY_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productUrls,
          maxReviews: 50,
          filterByRating: 'all_stars',
          sortBy: 'recent',
          proxy: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] },
          includeGdprSensitive: false,
          filterByRatings: ['allStars'],
          deduplicateRedirectedAsins: true,
          scrapeProductDetails: false,
        })
      }
    );

    if (!runResponse.ok) {
      const errText = await runResponse.text();
      throw new Error(`Apify failed (${runResponse.status}): ${errText.slice(0, 200)}`);
    }

    const runData = await runResponse.json();
    const runId = runData.data?.id;
    if (!runId) throw new Error('No run ID from Apify');

    // Poll — max 3 minutes
    let attempts = 0, runStatus = 'RUNNING', datasetId = null;
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

    const reviews = rawItems.map(item => ({
      title: (item.reviewTitle || item.title || '').slice(0, 200),
      body: (item.reviewBody || item.body || item.text || '').slice(0, 500),
      rating: parseFloat(item.ratingScore || item.rating || item.stars || 0),
      author: item.reviewerName || item.userName || item.author || 'Verified Buyer',
      date: item.reviewedIn || item.date || item.publishedDate || '',
      verified: item.isVerifiedPurchase || item.verified || false,
      helpful: item.helpfulCount || item.foundHelpful || 0,
      product: (item.productName || item.asin || brand).slice(0, 100),
      url: item.reviewUrl || item.url || '',
    })).filter(r => r.body || r.title);

    const ratings = reviews.filter(r => r.rating > 0).map(r => r.rating);
    const avgRating = ratings.length > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : 0;
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    ratings.forEach(r => { const k = Math.round(r); if (dist[k] !== undefined) dist[k]++; });

    return res.status(200).json({
      success: true,
      reviews: reviews.slice(0, 50),
      total: reviews.length,
      avgRating,
      ratingDistribution: dist,
      subCategory: selectedSub,
      scrapeDate: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Amazon error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}

export const config = { api: { bodyParser: { sizeLimit: '2mb' }, responseLimit: '10mb' } };
