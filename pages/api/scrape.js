export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { brand, subreddits } = req.body;
  if (!brand || !subreddits) return res.status(400).json({ error: 'Missing required fields' });

  const APIFY_API_KEY = process.env.APIFY_API_KEY;
  if (!APIFY_API_KEY) return res.status(500).json({ error: 'APIFY_API_KEY not configured' });

  const BRAND_SEARCH_TERMS = {
    Aashirvaad: {
      default: 'Aashirvaad',
      'Atta': 'Aashirvaad atta',
      'Salt': 'Aashirvaad salt',
      'Spices': 'Aashirvaad spices masala',
      'Dal': 'Aashirvaad dal',
      'Besan': 'Aashirvaad besan',
      'Rawa': 'Aashirvaad rawa sooji',
      'Vermicelli': 'Aashirvaad vermicelli',
      'Ghee': 'Aashirvaad ghee',
    },
    Sunfeast: {
      default: 'Sunfeast biscuit',
      'Dark Fantasy': 'Sunfeast Dark Fantasy',
      "Moms Magic": "Sunfeast Moms Magic",
      'Farmlite': 'Sunfeast Farmlite digestive',
      'Bounce': 'Sunfeast Bounce biscuit',
      'Dream Cream': 'Sunfeast Dream Cream',
      'Marie Light': 'Sunfeast Marie Light',
      'All Rounder': 'Sunfeast All Rounder crackers',
      'Nice': 'Sunfeast Nice biscuit',
      'Glucose': 'Sunfeast Glucose biscuit',
      'Milk Magic': 'Sunfeast Milk Magic',
      'Wowzers': 'Sunfeast Wowzers',
      'Fantastik': 'Sunfeast Fantastik chocolate',
      'Yippee': 'Sunfeast Yippee noodles',
      'Milk Shake & Smoothies': 'Sunfeast milkshake smoothie',
    },
    Bingo: {
      default: 'Bingo snacks',
      'Mad Angles': 'Bingo Mad Angles',
      'Tedhe Medhe': 'Bingo Tedhe Medhe',
      'Potato Chips': 'Bingo potato chips',
    },
    'B Natural': {
      default: 'B Natural juice',
      'Juice': 'B Natural fruit juice',
    },
    Candyman: {
      default: 'Candyman ITC',
      'Eclairs': 'Candyman eclairs',
      'Toffees': 'Candyman toffee',
    },
    'Kitchens of India': {
      default: 'Kitchens of India',
      'Ready to Eat': 'Kitchens of India ready to eat',
      'Pastes': 'Kitchens of India cooking paste',
    },
    'Masterchef Creation': {
      default: 'ITC Masterchef frozen',
      'Frozen Snacks': 'ITC Masterchef frozen snacks',
      'Frozen Seafood': 'ITC Masterchef frozen seafood',
    },
    Fabelle: {
      default: 'Fabelle chocolate ITC',
      'Chocolate': 'Fabelle chocolate',
    },
    Sunbean: {
      default: 'Sunbean coffee ITC',
      'Coffee': 'Sunbean coffee',
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
          searchSort: 'relevance',
          searchTime: 'all',
          maxPostsCount: 50,
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

    const r = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_API_KEY}&limit=100&clean=true`);
    const rawItems = await r.json();

    console.log('Reddit raw items:', rawItems?.length || 0);
    if (rawItems?.length > 0) {
      console.log('Reddit first item keys:', Object.keys(rawItems[0]));
    }
    console.log('Safe posts after NSFW filter:', safePosts?.length || 0);
    console.log('Brand posts (mention brand):', brandPosts?.length || 0);
    console.log('Search term used:', searchTerm);

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
    const finalPosts = [...brandPosts, ...otherPosts];
    console.log(`Posts breakdown: raw=${rawItems?.length} safe=${safePosts.length} brand=${brandPosts.length} other=${otherPosts.length} final=${finalPosts.length}`);

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
