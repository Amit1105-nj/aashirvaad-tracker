export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { brand, subreddits } = req.body;
  if (!brand || !subreddits) return res.status(400).json({ error: 'Missing required fields' });

  const APIFY_API_KEY = process.env.APIFY_API_KEY;
  if (!APIFY_API_KEY) return res.status(500).json({ error: 'APIFY_API_KEY not configured' });

  const BRAND_SEARCH_TERMS = {
    Aashirvaad: 'Aashirvaad atta',
    Bingo: 'Bingo chips',
    Candyman: 'Candyman eclairs',
    Sunfeast: 'Sunfeast biscuit',
    Yippee: 'Yippee noodles',
    Fabelle: 'Fabelle chocolate',
  };

  try {
    const subList = subreddits.split(',').map(s => s.trim().replace('r/', '')).slice(0, 6);
    const brandLower = brand.toLowerCase();
    const searchTerm = BRAND_SEARCH_TERMS[brand] || brand;
    const allPosts = [];

    // Run one Apify call per subreddit — using exact input format from Apify console
    for (const sub of subList) {
      try {
        const runResponse = await fetch(
          `https://api.apify.com/v2/acts/harshmaur~reddit-scraper/runs?token=${APIFY_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              searchTerms: [searchTerm],
              withinCommunity: `r/${sub}`,
              searchPosts: true,
              searchComments: false,
              searchCommunities: false,
              searchSort: 'new',
              searchTime: 'month',
              maxPostsCount: 10,
              includeNSFW: false,
              fastMode: true,
              crawlCommentsPerPost: false,
              proxy: {
                useApifyProxy: true,
                apifyProxyGroups: ['RESIDENTIAL'],
              },
            })
          }
        );

        if (!runResponse.ok) {
          console.log(`Run failed for r/${sub}`);
          continue;
        }

        const runData = await runResponse.json();
        const runId = runData.data?.id;
        if (!runId) continue;

        // Poll for completion — max 90 seconds per subreddit
        let attempts = 0;
        let runStatus = 'RUNNING';
        let datasetId = null;

        while (attempts < 18 && (runStatus === 'RUNNING' || runStatus === 'READY')) {
          await new Promise(r => setTimeout(r, 5000));
          const s = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_KEY}`);
          const sd = await s.json();
          runStatus = sd.data?.status;
          datasetId = sd.data?.defaultDatasetId;
          if (runStatus === 'FAILED' || runStatus === 'ABORTED') break;
          attempts++;
        }

        if (runStatus === 'SUCCEEDED' && datasetId) {
          const r = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_API_KEY}&limit=15&clean=true`);
          const items = await r.json();
          if (Array.isArray(items)) {
            // Tag each post with the subreddit
            items.forEach(p => { p._subreddit = sub; });
            allPosts.push(...items);
          }
        }
      } catch (subErr) {
        console.log(`Error for r/${sub}:`, subErr.message);
        continue;
      }
    }

    if (allPosts.length === 0) {
      return res.status(200).json({ success: true, posts: [], message: 'No posts found' });
    }

    // Filter posts only + no NSFW
    const safePosts = allPosts.filter(p => {
      if (p.dataType && p.dataType !== 'post') return false;
      return !p.over18 && !p.nsfw && !p.isNsfw && (p.title || p.body);
    });

    // Prioritise brand mentions
    const brandPosts = safePosts.filter(p =>
      (p.title || '').toLowerCase().includes(brandLower) ||
      (p.body || '').toLowerCase().includes(brandLower)
    );
    const otherPosts = safePosts.filter(p => !brandPosts.includes(p));
    const finalPosts = [...brandPosts, ...otherPosts].slice(0, 25);

    // Normalise using exact field names from Apify output
    const posts = finalPosts.map(p => ({
      title: (p.title || p.body || 'Reddit Post').slice(0, 200),
      subreddit: `r/${p.communityName || p._subreddit || 'reddit'}`,
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
      subreddits: subList,
      scrapeDate: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Scrape error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}

export const config = { api: { bodyParser: { sizeLimit: '2mb' }, responseLimit: '8mb' } };
