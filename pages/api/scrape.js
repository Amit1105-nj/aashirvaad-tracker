// ── Apify Reddit Scraper Integration ──
// Uses harshmaur/reddit-scraper — rated 4.96/5, 94% success rate

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { brand, subreddits, fromDate, toDate } = req.body;
  if (!brand || !subreddits) return res.status(400).json({ error: 'Missing required fields' });

  const APIFY_API_KEY = process.env.APIFY_API_KEY;
  if (!APIFY_API_KEY) return res.status(500).json({ error: 'APIFY_API_KEY not configured' });

  try {
    // Build search queries — brand keyword across each subreddit
    const subList = subreddits.split(',').map(s => s.trim()).slice(0, 5); // limit to 5 subs per run
    
    // Calculate date range
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const daysDiff = Math.ceil((to - from) / (1000 * 60 * 60 * 24));

    // Start Apify Reddit Scraper run
    const startResponse = await fetch(
      'https://api.apify.com/v2/acts/harshmaur~reddit-scraper/runs?token=' + APIFY_API_KEY,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searches: subList.map(sub => ({
            searchQuery: brand,
            subreddit: sub.replace('r/', ''),
            type: 'posts',
            maxItems: 10,
          })),
          maxItems: 50,
          includeComments: true,
          maxComments: 5,
          proxy: { useApifyProxy: true },
        })
      }
    );

    if (!startResponse.ok) {
      const err = await startResponse.json();
      throw new Error('Apify start failed: ' + (err.error?.message || startResponse.status));
    }

    const startData = await startResponse.json();
    const runId = startData.data?.id;
    if (!runId) throw new Error('No run ID returned from Apify');

    // Poll for completion (max 90 seconds)
    let attempts = 0;
    let runData = null;
    while (attempts < 18) {
      await new Promise(r => setTimeout(r, 5000)); // wait 5 seconds
      const statusResp = await fetch(
        `https://api.apify.com/v2/acts/harshmaur~reddit-scraper/runs/${runId}?token=${APIFY_API_KEY}`
      );
      runData = await statusResp.json();
      const status = runData.data?.status;
      if (status === 'SUCCEEDED') break;
      if (status === 'FAILED' || status === 'ABORTED') throw new Error('Apify run failed: ' + status);
      attempts++;
    }

    if (!runData || runData.data?.status !== 'SUCCEEDED') {
      throw new Error('Apify scrape timed out — try a shorter date range');
    }

    // Fetch results from dataset
    const datasetId = runData.data?.defaultDatasetId;
    const resultsResp = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_API_KEY}&limit=50`
    );
    const rawPosts = await resultsResp.json();

    if (!rawPosts || rawPosts.length === 0) {
      return res.status(200).json({ success: true, posts: [], message: 'No posts found for this brand in selected subreddits' });
    }

    // Normalise Apify output to our standard format
    const posts = rawPosts
      .filter(p => p.title || p.body)
      .slice(0, 20)
      .map(p => ({
        title: p.title || p.body?.slice(0, 100) || 'Reddit Post',
        subreddit: `r/${p.subreddit || 'reddit'}`,
        upvotes: p.score || p.ups || 0,
        num_comments: p.numComments || p.num_comments || 0,
        author: p.author || 'u/redditor',
        body: p.body || p.selftext || '',
        key_quote: p.body?.slice(0, 150) || p.title?.slice(0, 150) || '',
        reddit_url: p.url || `https://reddit.com${p.permalink || ''}`,
        created_at: p.createdAt || p.created_utc ? new Date(p.created_utc * 1000).toISOString() : new Date().toISOString(),
        flair: p.linkFlairText || p.flair || '',
        awards: p.totalAwardsReceived || 0,
        sentiment: 'neutral', // Claude will analyse this
      }));

    return res.status(200).json({
      success: true,
      posts,
      total: posts.length,
      subreddits: subList,
      scrapeDate: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Scrape error:', error);
    return res.status(500).json({ error: error.message || 'Scraping failed' });
  }
}

export const config = { api: { bodyParser: { sizeLimit: '1mb' } } };
