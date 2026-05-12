// Reddit scraper using Reddit's public JSON API — no Apify needed for base scraping
// Apify key kept for future use with other platforms

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { brand, subreddits, fromDate, toDate } = req.body;
  if (!brand || !subreddits) return res.status(400).json({ error: 'Missing required fields' });

  const BRAND_SEARCH_TERMS = {
    Aashirvaad: ['Aashirvaad atta', 'Aashirvaad flour', 'Aashirvaad'],
    Bingo: ['Bingo chips', 'Bingo Mad Angles', 'Tedhe Medhe'],
    Candyman: ['Candyman eclairs', 'ITC Candyman', 'Candyman candy'],
    Sunfeast: ['Sunfeast biscuit', 'Sunfeast Dark Fantasy', 'Sunfeast'],
    Yippee: ['Yippee noodles', 'Sunfeast Yippee', 'ITC Yippee'],
    Fabelle: ['Fabelle chocolate', 'Fabelle ITC', 'Fabelle'],
  };

  try {
    const subList = subreddits.split(',').map(s => s.trim().replace('r/', '')).slice(0, 6);
    const brandLower = brand.toLowerCase();
    const searchTerms = BRAND_SEARCH_TERMS[brand] || [brand];
    const allPosts = [];

    // Use Reddit's public JSON search API — completely free and reliable
    const headers = {
      'User-Agent': 'ITC-Brand-Radar/1.0 (brand intelligence tool)',
      'Accept': 'application/json',
    };

    // Search each term across all subreddits
    for (const term of searchTerms.slice(0, 2)) {
      for (const sub of subList.slice(0, 4)) {
        try {
          const url = `https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(term)}&restrict_sr=1&sort=new&t=month&limit=25`;
          const response = await fetch(url, { headers });
          
          if (!response.ok) continue;
          
          const data = await response.json();
          const posts = data?.data?.children || [];
          
          posts.forEach(({ data: p }) => {
            if (!p || p.over_18 || p.removed_by_category) return;
            allPosts.push({
              title: p.title || '',
              subreddit: `r/${p.subreddit || sub}`,
              upvotes: p.score || 0,
              num_comments: p.num_comments || 0,
              author: p.author || 'redditor',
              body: (p.selftext || '').slice(0, 500),
              key_quote: (p.selftext || p.title || '').slice(0, 150),
              reddit_url: p.url || `https://www.reddit.com${p.permalink || ''}`,
              created_at: p.created_utc ? new Date(p.created_utc * 1000).toISOString() : new Date().toISOString(),
              flair: p.link_flair_text || '',
              awards: p.total_awards_received || 0,
            });
          });

          // Small delay to be respectful
          await new Promise(r => setTimeout(r, 300));

        } catch (subErr) {
          console.log(`Skip ${sub}/${term}:`, subErr.message);
          continue;
        }
      }
    }

    if (allPosts.length === 0) {
      return res.status(200).json({ success: true, posts: [], message: 'No posts found' });
    }

    // Deduplicate by URL
    const seen = new Set();
    const uniquePosts = allPosts.filter(p => {
      if (seen.has(p.reddit_url)) return false;
      seen.add(p.reddit_url);
      return true;
    });

    // Prioritise brand mentions
    const brandPosts = uniquePosts.filter(p =>
      (p.title || '').toLowerCase().includes(brandLower) ||
      (p.body || '').toLowerCase().includes(brandLower)
    );
    const otherPosts = uniquePosts.filter(p => !brandPosts.includes(p));
    const finalPosts = [...brandPosts, ...otherPosts].slice(0, 25);

    return res.status(200).json({
      success: true,
      posts: finalPosts,
      total: finalPosts.length,
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
