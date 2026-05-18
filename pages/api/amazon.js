export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { brand, subCategory } = req.body;
  if (!brand) return res.status(400).json({ error: 'Missing brand' });

  const APIFY_API_KEY = process.env.APIFY_API_KEY;
  if (!APIFY_API_KEY) return res.status(500).json({ error: 'APIFY_API_KEY not configured' });

  // Keyword-based config — searches Amazon for each keyword
  const BRAND_KEYWORDS = {
    Aashirvaad: {
      subCategories: {
        'All Products':   ['Aashirvaad atta','Aashirvaad spices','Aashirvaad ghee','Aashirvaad besan'],
        'Atta & Flour':   ['Aashirvaad shudh chakki atta','Aashirvaad multigrain atta','Aashirvaad select atta','Aashirvaad organic atta','Aashirvaad sugar release control','Aashirvaad gluten free','Aashirvaad besan'],
        'Basic Spices':   ['Aashirvaad chilli powder','Aashirvaad turmeric powder','Aashirvaad coriander powder','Aashirvaad garam masala','Aashirvaad sambar powder','Aashirvaad kashmiri mirch'],
        'Whole Spices':   ['Aashirvaad cumin seeds','Aashirvaad black pepper','Aashirvaad cardamom','Aashirvaad kasuri methi','Aashirvaad whole spices'],
        'Ghee & Dairy':   ['Aashirvaad Svasti ghee','Aashirvaad cow ghee','Aashirvaad organic ghee'],
      },
      defaultSubCategory: 'All Products',
    },
    Sunfeast: {
      subCategories: {
        'All Products':   ['Dark Fantasy biscuits','Sunfeast Mom Magic','Sunfeast Farmlite','Sunfeast Marie Light','Sunfeast Bounce','Sunfeast cake'],
        'Dark Fantasy':   ['Dark Fantasy Choco Fills','Dark Fantasy Bourbon','Dark Fantasy Yumfills'],
        'Mom\'s Magic':   ['Sunfeast Mom Magic cashew','Sunfeast Mom Magic butter'],
        'Farmlite':       ['Sunfeast Farmlite digestive','Sunfeast Farmlite 5 grain'],
        'Marie & Others': ['Sunfeast Marie Light','Sunfeast Bounce cream','Sunfeast Shines'],
        'Cakes':          ['Sunfeast Caker cake','Sunfeast Dark Fantasy cake'],
      },
      defaultSubCategory: 'All Products',
    },
    Yippee: {
      subCategories: {
        'All Products':   ['Yippee noodles','Yippee pasta'],
        'Noodles':        ['Yippee Magic Masala noodles','Yippee Mood Masala','Yippee Power Up atta noodles'],
        'Pasta':          ['Yippee pasta treat','Yippee tricolor pasta'],
      },
      defaultSubCategory: 'All Products',
    },
    Bingo: {
      subCategories: {
        'All Products':   ['Bingo chips','Bingo Mad Angles','Bingo Tedhe Medhe','Bingo Nachos','Bingo Curlz'],
      },
      defaultSubCategory: 'All Products',
    },
    Candyman: {
      subCategories: {
        'All Products':   ['Candyman eclairs','Candyman toffee','ITC Candyman'],
      },
      defaultSubCategory: 'All Products',
    },
    Fabelle: {
      subCategories: {
        'All Products':   ['Fabelle chocolate','Fabelle exquisite chocolates','ITC Fabelle'],
      },
      defaultSubCategory: 'All Products',
    },
  };

  const brandConfig = BRAND_KEYWORDS[brand];
  if (!brandConfig) return res.status(400).json({ error: 'Brand not configured' });

  const selectedSub = subCategory || brandConfig.defaultSubCategory;
  const keywords = brandConfig.subCategories[selectedSub] || brandConfig.subCategories[brandConfig.defaultSubCategory];

  try {
    // Build startUrls from Amazon search keywords
    const startUrls = keywords.slice(0, 4).map(kw => ({
      url: `https://www.amazon.in/s?k=${encodeURIComponent(kw)}&i=grocery`,
    }));

    const runResponse = await fetch(
      `https://api.apify.com/v2/acts/junglee~amazon-reviews-scraper/runs?token=${APIFY_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startUrls,
          maxReviews: 50,
          filterByRating: 'all_stars',
          sortBy: 'recent',
          proxy: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] },
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
      keywords,
      scrapeDate: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Amazon error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}

// Return sub-categories for a brand — used by frontend
export const BRAND_SUB_CATEGORIES = {
  Aashirvaad: ['All Products','Atta & Flour','Basic Spices','Whole Spices','Ghee & Dairy'],
  Sunfeast: ['All Products','Dark Fantasy','Mom\'s Magic','Farmlite','Marie & Others','Cakes'],
  Yippee: ['All Products','Noodles','Pasta'],
  Bingo: ['All Products'],
  Candyman: ['All Products'],
  Fabelle: ['All Products'],
};

export const config = { api: { bodyParser: { sizeLimit: '2mb' }, responseLimit: '10mb' } };
