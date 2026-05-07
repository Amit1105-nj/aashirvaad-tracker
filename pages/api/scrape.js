export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { brand, subreddits, fromDate, toDate } = req.body;
  if (!brand || !subreddits) return res.status(400).json({ error: 'Missing required fields' });

  const APIFY_API_KEY = process.env.APIFY_API_KEY;
  if (!APIFY_API_KEY) return res.status(500).json({ error: 'APIFY_API_KEY not configured' });

  try {
    const subList = subreddits.split(',').map(s => s.trim().replace('r/', '')).slice(0, 8);
    const brandLower = brand.toLowerCase();

    // harshmaur/reddit-scraper correct input format:
    // uses searchTerms array + subreddits array
    const runResponse = await fetch(
      `https://api.apify.com/v2/acts/harshmaur~reddit-scraper/runs?token=${APIFY_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchTerms: [brand],
          subreddits: subList,
          type: 'posts',
          maxItems: 50,
          includeComments: false,
          sort: 'new',
          time: 'month',
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
      throw new Error(`Scrape timed out after ${attempts * 5}s — try again`);
    }

    // Fetch results
    const resultsResp = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_API_KEY}&limit=60&clean=true`
    );
    const rawItems = await resultsResp.json();

    if (!rawItems || rawItems.length === 0) {
      return res.status(200).json({ success: true, posts: [], message: 'No posts found' });
    }

    // Filter out NSFW posts
    const safePosts = rawItems.filter(p => {
      const isNSFW = p.over18 || p.nsfw || p.isNsfw ||
        (p.flair || '').toLowerCase().includes('nsfw') ||
        (p.link_flair_text || '').toLowerCase().includes('nsfw');
      return !isNSFW && (p.title || p.body);
    });

    // Prioritise posts that mention the brand
    const brandPosts = safePosts.filter(p =>
      (p.title || '').toLowerCase().includes(brandLower) ||
      (p.body || '').toLowerCase().includes(brandLower) ||
      (p.selftext || '').toLowerCase().includes(brandLower)
    );
    const otherPosts = safePosts.filter(p =>
      !(p.title || '').toLowerCase().includes(brandLower) &&
      !(p.body || '').toLowerCase().includes(brandLower)
    );

    const finalPosts = [...brandPosts, ...otherPosts].slice(0, 25);

    // Normalise — build real Reddit URLs from permalink
    const posts = finalPosts.map(p => {
      let redditUrl = '';
      if (p.permalink) {
        redditUrl = `https://www.reddit.com${p.permalink.startsWith('/') ? p.permalink : '/' + p.permalink}`;
      } else if (p.url && p.url.includes('reddit.com/r/')) {
        redditUrl = p.url;
      } else if (p.id) {
        const sub = p.subreddit || p.community || 'reddit';
        redditUrl = `https://www.reddit.com/r/${sub}/comments/${p.id}/`;
      }

      return {
        title: (p.title || p.body || 'Reddit Post').slice(0, 200),
        subreddit: `r/${p.subreddit || p.community || 'reddit'}`,
        upvotes: p.score || p.ups || p.numberOfUpvotes || 0,
        num_comments: p.num_comments || p.numberOfComments || 0,
        author: p.author || p.username || 'redditor',
        body: (p.selftext || p.body || '').slice(0, 500),
        key_quote: (p.selftext || p.body || p.title || '').slice(0, 150),
        reddit_url: redditUrl,
        created_at: p.created_utc ? new Date(p.created_utc * 1000).toISOString() : new Date().toISOString(),
        flair: p.link_flair_text || p.flair || '',
        awards: p.total_awards_received || p.awards || 0,
        mentions_brand: (p.title || '').toLowerCase().includes(brandLower) ||
          (p.selftext || '').toLowerCase().includes(brandLower),
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
