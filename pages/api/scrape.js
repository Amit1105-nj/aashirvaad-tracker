export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { brand, subreddits, fromDate, toDate } = req.body;
  if (!brand || !subreddits) return res.status(400).json({ error: 'Missing required fields' });

  const APIFY_API_KEY = process.env.APIFY_API_KEY;
  if (!APIFY_API_KEY) return res.status(500).json({ error: 'APIFY_API_KEY not configured' });

  // Brand-specific search terms
  const BRAND_SEARCH_TERMS = {
    Aashirvaad: ['Aashirvaad atta', 'Aashirvaad flour', 'Aashirvaad wheat'],
    Bingo: ['Bingo chips', 'Bingo Mad Angles', 'Bingo Tedhe Medhe', 'Tedhe Medhe', 'ITC Bingo'],
    Candyman: ['Candyman candy', 'Candyman eclairs', 'ITC Candyman'],
    Sunfeast: ['Sunfeast', 'Sunfeast biscuit', 'Sunfeast Dark Fantasy', 'Sunfeast Farmlite'],
    Yippee: ['Yippee noodles', 'Sunfeast Yippee', 'ITC Yippee'],
    Fabelle: ['Fabelle', 'Fabelle chocolate', 'Fabelle ITC'],
  };

  try {
    const subList = subreddits.split(',').map(s => s.trim().replace('r/', '')).slice(0, 6);
    const brandLower = brand.toLowerCase();
    const searchTerms = BRAND_SEARCH_TERMS[brand] || [brand];

    // Build startUrls — Reddit search URLs for each term in each subreddit
    // This is the most reliable approach for harshmaur/reddit-scraper
    const startUrls = [];
    searchTerms.slice(0, 3).forEach(term => {
      subList.forEach(sub => {
        startUrls.push({
          url: `https://www.reddit.com/r/${sub}/search/?q=${encodeURIComponent(term)}&restrict_sr=1&sort=new&t=month`,
          method: 'GET'
        });
      });
    });

    const runResponse = await fetch(
      `https://api.apify.com/v2/acts/harshmaur~reddit-scraper/runs?token=${APIFY_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startUrls,
          maxItems: 60,
          includeComments: false,
        })
      }
    );

    if (!runResponse.ok) {
      const errText = await runResponse.text();
      throw new Error(`Apify start failed (${runResponse.status}): ${errText.slice(0, 300)}`);
    }

    const runData = await runResponse.json();
    const runId = runData.data?.id;
    if (!runId) throw new Error('No run ID returned from Apify');

    // Poll for completion — max 2 minutes
    let attempts = 0;
    let runStatus = 'RUNNING';
    let datasetId = null;

    while (attempts < 24 && (runStatus === 'RUNNING' || runStatus === 'READY')) {
      await new Promise(r => setTimeout(r, 5000));
      const statusResp = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_KEY}`
      );
      const statusData = await statusResp.json();
      runStatus = statusData.data?.status;
      datasetId = statusData.data?.defaultDatasetId;
      if (runStatus === 'FAILED' || runStatus === 'ABORTED') {
        throw new Error(`Apify run ${runStatus}`);
      }
      attempts++;
    }

    if (runStatus !== 'SUCCEEDED') {
      throw new Error(`Scrape timed out after ${attempts * 5}s`);
    }

    // Fetch results
    const resultsResp = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_API_KEY}&limit=80&clean=true`
    );
    const rawItems = await resultsResp.json();

    if (!rawItems || rawItems.length === 0) {
      return res.status(200).json({ success: true, posts: [], message: 'No posts found' });
    }

    // Filter to posts only + remove NSFW
    const safePosts = rawItems.filter(p => {
      if (p.dataType && p.dataType !== 'post') return false; // posts only
      const isNSFW = p.over18 || p.nsfw || p.isNsfw ||
        (p.flair || '').toLowerCase().includes('nsfw') ||
        (p.link_flair_text || '').toLowerCase().includes('nsfw');
      return !isNSFW && (p.title || p.body);
    });

    // Prioritise brand mentions
    const brandPosts = safePosts.filter(p =>
      (p.title || '').toLowerCase().includes(brandLower) ||
      (p.body || '').toLowerCase().includes(brandLower) ||
      (p.selftext || '').toLowerCase().includes(brandLower)
    );
    const otherPosts = safePosts.filter(p => !brandPosts.includes(p));
    const finalPosts = [...brandPosts, ...otherPosts].slice(0, 25);

    // Normalise — using correct field names from Apify output
    const posts = finalPosts.map(p => {
      // Real Reddit URL — postUrl is the correct field per Apify output
      const redditUrl = p.postUrl || p.url || 
        (p.permalink ? `https://www.reddit.com${p.permalink}` : '') ||
        (p.id && p.communityName ? `https://www.reddit.com/r/${p.communityName}/comments/${p.id}/` : '');

      return {
        title: (p.title || p.body || 'Reddit Post').slice(0, 200),
        subreddit: `r/${p.communityName || p.subreddit || p.community || 'reddit'}`,
        upvotes: p.upVotes || p.score || p.ups || 0,
        num_comments: p.commentsCount || p.num_comments || 0,
        author: p.authorName || p.author || p.username || 'redditor',
        body: (p.body || p.selftext || '').slice(0, 500),
        key_quote: (p.body || p.selftext || p.title || '').slice(0, 150),
        reddit_url: redditUrl,
        created_at: p.createdAt || new Date().toISOString(),
        flair: p.flair || p.link_flair_text || '',
        awards: p.awards || 0,
        mentions_brand: brandPosts.includes(p),
      };
    });

    return res.status(200).json({
      success: true,
      posts,
      total: posts.length,
      brand_mentions: brandPosts.length,
      subreddits: subList,
      scrapeDate: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Scrape error:', error.message);
    return res.status(500).json({ error: error.message || 'Scraping failed' });
  }
}

export const config = { api: { bodyParser: { sizeLimit: '2mb' }, responseLimit: '8mb' } };
