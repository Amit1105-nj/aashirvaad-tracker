import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── BRAND CONFIG MAP ──
const BRAND_CONFIG = {
  Aashirvaad: {
    category: 'atta and wheat flour',
    description: "ITC's flagship atta brand — India's most popular wheat flour for chapatis and rotis",
    subreddits: ['r/india','r/IndianFood','r/cooking','r/bangalore','r/delhi','r/grocery','r/mumbai','r/pune','r/AskIndia','r/IndianKitchen','r/diabetes_india','r/HealthyFood','r/vegetarian','r/IndianDietPlan','r/PCOS'],
    competitors: ['Pillsbury','Fortune Atta','Annapurna','Patanjali Atta',"Nature's Basket"],
    topics: 'chapati softness, price hike, diabetic atta, packaging tears, Blinkit delivery, chakki comparison, roti texture, multigrain, whole wheat, PCOS-friendly diet, vegetarian cooking',
  },
  Bingo: {
    category: 'snacks and chips',
    description: "ITC's popular snack brand — includes Mad Angles, Tedhe Medhe, and various chip variants",
    subreddits: ['r/india','r/AskIndia','r/bangalore','r/mumbai','r/delhi','r/IndianFood','r/teenagers','r/pune','r/munchies','r/cricket','r/IndianTeens','r/Bollywood','r/gaming','r/CasualConversation'],
    competitors: ['Lays','Kurkure','Haldirams','Too Yumm','Doritos'],
    topics: 'flavour variety, crunchiness, value for money, packet size, availability, new flavours, oily vs dry snacks, gaming snacks, Bollywood munching, cricket match snacks',
  },
  Candyman: {
    category: 'confectionery and candies',
    description: "ITC's candy brand — includes eclairs, Lacto King, and other sugar confectionery",
    subreddits: ['r/india','r/AskIndia','r/IndianFood','r/mumbai','r/delhi','r/bangalore','r/sweets','r/nostalgia','r/IndianParenting','r/teachers','r/Diwali'],
    competitors: ['Cadbury Eclairs','Mentos','Alpenliebe','Parle','Kopiko'],
    topics: 'childhood nostalgia, sweetness level, price per candy, school tuck shop, Diwali gifting, kids favourites, IndianParenting recommendations, flavour variety',
  },
  Sunfeast: {
    category: 'biscuits, cookies and pasta',
    description: "ITC's biscuit and pasta brand — includes Dark Fantasy, Farmlite, Marie Light, and pasta range",
    subreddits: ['r/india','r/IndianFood','r/AskIndia','r/cooking','r/bangalore','r/delhi','r/mumbai','r/snackexchange','r/HealthyFood','r/diabetes_india','r/Fitness','r/IndianDietPlan','r/vegetarian'],
    competitors: ['Britannia','Parle-G','McVities','Oreo','Maggi','Unibic','Bonn','Bambino','Del Monte'],
    topics: 'biscuit texture, cream filling, tea time biscuits, Dark Fantasy premium feel, pasta cooking time, Farmlite health claims, sugar-free biscuits, protein biscuits, fitness snacking',
  },
  Yippee: {
    category: 'instant noodles',
    description: "ITC's Yippee instant noodles brand competing in the Indian instant noodle market",
    subreddits: ['r/india','r/IndianFood','r/AskIndia','r/cooking','r/bangalore','r/mumbai','r/delhi','r/pune','r/CasualConversation','r/IndianTeens','r/Hostels','r/CollegeIndia','r/LateNightFood'],
    competitors: ['Maggi','Wai Wai','Knorr',"Ching's Secret",'Top Ramen'],
    topics: 'taste vs Maggi, cooking time, masala flavour, hostel food, college meals, late night cooking, spice level, variety of flavours, price comparison',
  },
  Fabelle: {
    category: 'premium chocolates',
    description: "ITC's luxury chocolate brand — positioned as India's finest artisan chocolate, sold in ITC hotels and premium retail",
    subreddits: ['r/india','r/chocolate','r/IndianFood','r/AskIndia','r/bangalore','r/mumbai','r/delhi','r/luxury','r/GiftsForHer','r/weddingplanning','r/IndianWeddings','r/corporate_india','r/DateNight','r/luxuryindia'],
    competitors: ['Cadbury Silk','Ferrero Rocher','Lindt','Amul Dark','Smoor','Manam','Royce'],
    topics: 'premium gifting, hotel chocolate, price vs quality, cocoa percentage, packaging luxury, wedding gifting, corporate gifting, date night, luxury India, comparison to Smoor and Manam',
  },
};

function makePostId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

function makeRedditUrl(subreddit, title, postId) {
  const sub = subreddit.replace('r/', '');
  const slug = title.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, '_').slice(0, 50);
  return `https://www.reddit.com/r/${sub}/comments/${postId}/${slug}/`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { fromDate, toDate, brand, subreddits, callType, themes, realPosts } = req.body;
  if (!fromDate || !toDate || !brand) return res.status(400).json({ error: 'Missing required fields' });

  const config = BRAND_CONFIG[brand] || BRAND_CONFIG['Aashirvaad'];
  const allSubs = subreddits || config.subreddits.join(', ');

  // Check if we have real scraped posts to analyse
  const hasRealData = realPosts && realPosts.length > 0;
  const dataSource = hasRealData ? 'REAL Reddit data scraped via Apify' : 'AI-simulated Reddit data';

  try {
    let prompt;

    if (callType === 'core') {
      const postsContext = hasRealData
        ? `Here are the REAL Reddit posts scraped from Reddit for "${brand}":
${realPosts.slice(0, 15).map((p, i) => `
Post ${i+1}:
- Title: ${p.title}
- Subreddit: ${p.subreddit}
- Upvotes: ${p.upvotes}
- Comments: ${p.num_comments}
- Author: ${p.author}
- Content: ${p.body?.slice(0, 200) || ''}
- URL: ${p.reddit_url}
- Flair: ${p.flair || 'none'}
- Awards: ${p.awards || 0}
`).join('')}

Analyse these REAL posts to extract sentiment, themes, and competitor mentions. Use the actual post data.`
        : `Simulate realistic Reddit data for "${brand}" (${config.description}) based on your training knowledge about Indian consumers discussing this brand on Reddit. Date: ${fromDate} to ${toDate}. Subreddits: ${allSubs}.`;

      prompt = `You are a brand intelligence analyst. ${postsContext}

${hasRealData ? 'Analyse the real posts above and' : ''} Return ONLY valid JSON. No markdown. No backticks. All strings under 90 chars.

{"summary":{"total_posts":${hasRealData ? realPosts.length : 34},"total_comments":${hasRealData ? realPosts.reduce((a,p) => a + (p.num_comments||0), 0) : 178},"sentiment_score":<int 40-90>,"sentiment_label":"Positive|Neutral|Mixed|Negative","top_subreddit":"${config.subreddits[0]}","data_source":"${dataSource}"},"sentiment_breakdown":{"positive":<int>,"neutral":<int>,"negative":<int — must sum to exactly 100>},"top_themes":[{"theme":"<theme relevant to ${config.category}>","count":<int>,"sentiment":"positive|neutral|negative","example":"<${hasRealData ? 'direct quote or paraphrase from real posts above' : 'realistic Indian Reddit comment about ' + brand}>","icon":"<emoji>"},{"theme":"<theme>","count":<int>,"sentiment":"positive|neutral|negative","example":"<${hasRealData ? 'quote from real posts' : 'comment'}>","icon":"<emoji>"},{"theme":"<theme>","count":<int>,"sentiment":"positive|neutral|negative","example":"<example>","icon":"<emoji>"},{"theme":"<theme>","count":<int>,"sentiment":"positive|neutral|negative","example":"<example>","icon":"<emoji>"},{"theme":"<theme>","count":<int>,"sentiment":"positive|neutral|negative","example":"<example>","icon":"<emoji>"}],"competitors_mentioned":[${config.competitors.map(c => `{"brand":"${c}","mentions":<int 1-15>,"vs_brand":"favorable|unfavorable|neutral"}`).join(',')}],"top_posts":[${hasRealData ? realPosts.slice(0,5).map(p => `{"title":"${p.title.replace(/"/g,"'")}","subreddit":"${p.subreddit}","upvotes":${p.upvotes},"num_comments":${p.num_comments},"sentiment":"<positive|neutral|negative>","key_quote":"<key insight from this post under 80 chars>","author":"${p.author}","flair":"${p.flair||''}","awards":${p.awards||0},"reddit_url":"${p.reddit_url}"}`).join(',') : `{"title":"<realistic Reddit post title about ${brand}>","subreddit":"${config.subreddits[0]}","upvotes":<int>,"num_comments":<int>,"sentiment":"positive|neutral|negative","key_quote":"<quote>","author":"<username>","flair":"<flair>","awards":<int>,"reddit_url":"https://reddit.com/r/${config.subreddits[0].replace('r/','')}/comments/${makePostId()}/<slug>/"},{"title":"<post>","subreddit":"${config.subreddits[1]}","upvotes":<int>,"num_comments":<int>,"sentiment":"positive|neutral|negative","key_quote":"<quote>","author":"<username>","flair":"<flair>","awards":<int>,"reddit_url":"https://reddit.com/r/${config.subreddits[1].replace('r/','')}/comments/${makePostId()}/<slug>/"},{"title":"<post>","subreddit":"${config.subreddits[2]}","upvotes":<int>,"num_comments":<int>,"sentiment":"positive|neutral|negative","key_quote":"<quote>","author":"<username>","flair":"<flair>","awards":<int>,"reddit_url":"https://reddit.com/r/${config.subreddits[2].replace('r/','')}/comments/${makePostId()}/<slug>/"},{"title":"<post>","subreddit":"${config.subreddits[3]||config.subreddits[0]}","upvotes":<int>,"num_comments":<int>,"sentiment":"positive|neutral|negative","key_quote":"<quote>","author":"<username>","flair":"<flair>","awards":<int>,"reddit_url":"https://reddit.com/r/${(config.subreddits[3]||config.subreddits[0]).replace('r/','')}/comments/${makePostId()}/<slug>/"},{"title":"<post>","subreddit":"${config.subreddits[4]||config.subreddits[1]}","upvotes":<int>,"num_comments":<int>,"sentiment":"positive|neutral|negative","key_quote":"<quote>","author":"<username>","flair":"<flair>","awards":<int>,"reddit_url":"https://reddit.com/r/${(config.subreddits[4]||config.subreddits[1]).replace('r/','')}/comments/${makePostId()}/<slug>/"}`}]}

${hasRealData ? 'IMPORTANT: For top_posts, use the EXACT reddit_url from the real posts provided above. Do not generate fake URLs.' : 'Use authentic Indian Reddit language. Topics: ' + config.topics}`;

    } else {
      const postsContext = hasRealData
        ? `Based on these real Reddit posts about "${brand}": ${realPosts.slice(0,10).map(p => p.title + '. ' + (p.body||'').slice(0,100)).join(' | ')}`
        : `Based on simulated Reddit data for "${brand}" (${config.category}). Themes: ${themes || config.topics}.`;

      prompt = `Brand: "${brand}" (${config.category}, ITC India). Reddit window: ${fromDate} to ${toDate}.
${postsContext}

Return ONLY valid JSON. No markdown. All strings under 80 chars. Vary all numbers.

{"keyword_associations":[{"keyword":"<word users link to ${brand}>","frequency":<int>,"trend":"rising|stable|falling","context":"<why>"},{"keyword":"<kw>","frequency":<int>,"trend":"rising|stable|falling","context":"<ctx>"},{"keyword":"<kw>","frequency":<int>,"trend":"rising|stable|falling","context":"<ctx>"},{"keyword":"<kw>","frequency":<int>,"trend":"rising|stable|falling","context":"<ctx>"},{"keyword":"<kw>","frequency":<int>,"trend":"rising|stable|falling","context":"<ctx>"},{"keyword":"<kw>","frequency":<int>,"trend":"rising|stable|falling","context":"<ctx>"},{"keyword":"<kw>","frequency":<int>,"trend":"rising|stable|falling","context":"<ctx>"},{"keyword":"<kw>","frequency":<int>,"trend":"rising|stable|falling","context":"<ctx>"}],"keyword_clusters":[{"cluster":"Quality and Taste","keywords":["<w>","<w>","<w>"]},{"cluster":"Price and Value","keywords":["<w>","<w>","<w>"]},{"cluster":"Brand Experience","keywords":["<w>","<w>","<w>"]},{"cluster":"Availability","keywords":["<w>","<w>","<w>"]}],"insights":["<Actionable insight 1 for ${brand} brand team — specific to ${config.category}${hasRealData ? ' based on real Reddit data' : ''}>","<Insight 2>","<Insight 3>","<Insight 4>","<Insight 5>"],"signal_alerts":[{"signal":"<specific risk or opportunity for ${brand}${hasRealData ? ' from real posts' : ''}>","urgency":"high","action":"<specific action>"},{"signal":"<signal 2>","urgency":"medium","action":"<action>"},{"signal":"<signal 3>","urgency":"medium","action":"<action>"}]}`;
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      system: 'Return ONLY valid JSON. No markdown, no backticks, no explanation. Keep all string values under 100 characters.',
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = message.content[0].text;
    let data;
    try {
      data = JSON.parse(raw.replace(/```json|```/g, '').trim());
    } catch (e) {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('Failed to parse AI response as JSON');
      data = JSON.parse(match[0]);
    }

    // For simulated posts, attach generated Reddit URLs
    if (!hasRealData && data.top_posts) {
      data.top_posts = data.top_posts.map(post => {
        if (!post.reddit_url || post.reddit_url.includes('<slug>')) {
          const postId = makePostId();
          post.reddit_url = makeRedditUrl(post.subreddit, post.title, postId);
        }
        return post;
      });
    }

    data.brand_config = { category: config.category, competitors: config.competitors, subreddits: config.subreddits };
    data.data_source = dataSource;
    data.is_real_data = hasRealData;

    return res.status(200).json({ success: true, data });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export const config = { api: { bodyParser: { sizeLimit: '2mb' } } };
