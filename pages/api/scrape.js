export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { brand, subreddits } = req.body;
  if (!brand || !subreddits) return res.status(400).json({ error: 'Missing required fields' });

  const APIFY_API_KEY = process.env.APIFY_API_KEY;
  if (!APIFY_API_KEY) return res.status(500).json({ error: 'APIFY_API_KEY not configured' });

  const BRAND_SEARCH_TERMS = {
    Aashirvaad: {
      default: 'Aashirvaad atta',
      'All Products': 'Aashirvaad',
      'Atta & Flour': 'Aashirvaad atta',
      'Basic Spices': 'Aashirvaad spices',
      'Whole Spices': 'Aashirvaad whole spices',
      'Ghee & Dairy': 'Aashirvaad ghee',
    },
    Bingo: {
      default: 'Bingo chips',
      'All Products': 'Bingo snacks',
      'Mad Angles': 'Bingo Mad Angles',
      'Tedhe Medhe': 'Bingo Tedhe Medhe',
      'Chips': 'Bingo chips',
    },
    Candyman: {
      default: 'Candyman eclairs',
      'All Products': 'Candyman ITC',
    },
    Sunfeast: {
      default: 'Sunfeast biscuit',
      'All Products': 'Sunfeast biscuit',
      'Dark Fantasy': 'Sunfeast Dark Fantasy',
      "Mom's Magic": "Sunfeast Mom's Magic",
      'Farmlite': 'Sunfeast Farmlite',
      'Marie & Others': 'Sunfeast Marie',
      'Cakes': 'Sunfeast cake',
    },
    Yippee: {
      default: 'Yippee noodles',
      'All Products': 'Yippee noodles',
      'Noodles': 'Yippee Magic Masala noodles',
      'Pasta': 'Yippee pasta',
    },
    Fabelle: {
      default: 'Fabelle chocolate',
      'All Products': 'Fabelle chocolate ITC',
    },
  };

  try {
    const brandLower = brand.toLowerCase();
    const subCat = req.body.subCategory || 'All Products';
    const customKeyword = req.body.customKeyword;
    const brandTerms = BRAND_SEARCH_TERMS[brand] || { default: brand };
    const searchTerm = customKeyword || brandTerms[subCat] || brandTerms.default || brand;
    console.log(`Searching: "${searchTerm}" for ${brand} / ${subCat}${customKeyword?' (custom keyword)':''}`);

    // Start Apify run
    const runResponse = await fetch(
      `https://api.apify.com/v2/acts/harshmaur~reddit-scraper/runs?token=${APIFY_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchTerms: [searchTerm],
          searchPosts: true,
          searchComments: false,
          searchCommunities: false,
          searchSort: 'new',
          searchTime: 'all',
          maxPostsCount: 25,
          includeNSFW: false,
          fastMode: true,
          crawlCommentsPerPost: false,
          proxy: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] },
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

    // Poll max 45 seconds (Vercel limit is 60s)
    let attempts = 0;
    let runStatus = 'RUNNING';
    let datasetId = null;

    while (attempts < 9 && (runStatus === 'RUNNING' || runStatus === 'READY')) {
      await new Promise(r => setTimeout(r, 5000));
      const s = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_KEY}`);
      const sd = await s.json();
      runStatus = sd.data?.status;
      datasetId = sd.data?.defaultDatasetId;
      if (runStatus === 'FAILED' || runStatus === 'ABORTED') throw new Error(`Apify run ${runStatus}`);
      attempts++;
    }

    // If still running after 45s — fetch whatever results exist so far
    if (runStatus !== 'SUCCEEDED' && datasetId) {
      console.log('Fetching partial results after timeout, status:', runStatus);
    } else if (runStatus !== 'SUCCEEDED') {
      throw new Error('Scrape timed out with no results');
    }

    const r = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_API_KEY}&limit=50&clean=true`);
    const rawItems = await r.json();

    console.log('Reddit raw items:', rawItems?.length || 0);
    if (rawItems?.length > 0) {
      console.log('Reddit first item keys:', Object.keys(rawItems[0]));
    }

    if (!rawItems || rawItems.length === 0) {
      return res.status(200).json({ success: true, posts: [], message: 'No posts found' });
    }

    // Filter NSFW
    const safePosts = rawItems.filter(p => {
      if (p.dataType && p.dataType !== 'post') return false;
      return !p.over18 && !p.nsfw && !p.isNsfw && (p.title || p.body);
    });

    const brandPosts = safePosts.filter(p =>
      (p.title || '').toLowerCase().includes(brandLower) ||
      (p.body || '').toLowerCase().includes(brandLower)
    );
    const otherPosts = safePosts.filter(p => !brandPosts.includes(p));
    const finalPosts = [...brandPosts, ...otherPosts].slice(0, 25);

    const posts = finalPosts.map(p => ({
      title: (p.title || p.body || 'Reddit Post').slice(0, 200),
      subreddit: `r/${p.communityName || p.subreddit || p.community || 'reddit'}`,
      upvotes: p.upVotes || p.score || p.ups || 0,
      num_comments: p.commentsCount || p.num_comments || 0,
      author: p.authorName || p.author || p.username || 'redditor',
      body: (p.body || p.selftext || '').slice(0, 500),
      key_quote: (p.body || p.selftext || p.title || '').slice(0, 150),
      reddit_url: p.postUrl || p.url || (p.permalink ? `https://www.reddit.com${p.permalink}` : ''),
      created_at: p.createdAt || new Date().toISOString(),
      flair: p.flair || p.link_flair_text || '',
      awards: p.awards || 0,
      mentions_brand: brandPosts.includes(p),
    }));

    return res.status(200).json({
      success: true,
      posts,
      total: posts.length,
      brand_mentions: brandPosts.length,
      scrapeDate: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Scrape error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}

export const config = { api: { bodyParser: { sizeLimit: '2mb' }, responseLimit: '8mb' } };
