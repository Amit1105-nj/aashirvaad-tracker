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
function makeRedditUrl(subreddit, title, postId) {
  const sub = subreddit.replace('r/', '');
  const slug = title.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, '_').slice(0, 50);
  return `https://www.reddit.com/r/${sub}/comments/${postId}/${slug}/`;
}

function makePostId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { fromDate, toDate, brand, subreddits, callType, themes } = req.body;
  if (!fromDate || !toDate || !brand) return res.status(400).json({ error: 'Missing required fields' });

  const config = BRAND_CONFIG[brand] || BRAND_CONFIG['Aashirvaad'];
  const allSubs = subreddits || config.subreddits.join(', ');
  const allComps = config.competitors.join(', ');

  try {
    let prompt;

    if (callType === 'core') {
      prompt = `You are simulating Reddit brand intelligence data for "${brand}" (${config.description}).
This is a ${config.category} brand made by ITC India.
Date range: ${fromDate} to ${toDate}. Subreddits: ${allSubs}.
Competitors to track: ${allComps}.

Return ONLY valid JSON. No markdown. No backticks. All strings under 90 chars. Vary ALL numbers — do not copy examples exactly.

{"summary":{"total_posts":34,"total_comments":178,"sentiment_score":69,"sentiment_label":"Positive","top_subreddit":"${config.subreddits[0]}"},"sentiment_breakdown":{"positive":54,"neutral":29,"negative":17},"top_themes":[{"theme":"<theme relevant to ${config.category}>","count":16,"sentiment":"positive","example":"<realistic Indian Reddit comment about ${brand}>","icon":"🍞"},{"theme":"<theme>","count":10,"sentiment":"negative","example":"<comment>","icon":"💰"},{"theme":"<theme>","count":8,"sentiment":"neutral","example":"<comment>","icon":"📦"},{"theme":"<theme>","count":7,"sentiment":"positive","example":"<comment>","icon":"⭐"},{"theme":"<theme>","count":6,"sentiment":"positive","example":"<comment>","icon":"🚚"}],"competitors_mentioned":[${config.competitors.map(c => `{"brand":"${c}","mentions":5,"vs_brand":"favorable"}`).join(',')}],"top_posts":[{"title":"<realistic Reddit post title about ${brand}>","subreddit":"${config.subreddits[0]}","upvotes":923,"num_comments":187,"sentiment":"positive","key_quote":"<quote>","author":"<username>","flair":"<flair>","awards":2},{"title":"<post>","subreddit":"${config.subreddits[1]}","upvotes":445,"num_comments":134,"sentiment":"neutral","key_quote":"<quote>","author":"<username>","flair":"<flair>","awards":1},{"title":"<post>","subreddit":"${config.subreddits[2]}","upvotes":312,"num_comments":89,"sentiment":"positive","key_quote":"<quote>","author":"<username>","flair":"<flair>","awards":0},{"title":"<post>","subreddit":"${config.subreddits[3] || config.subreddits[0]}","upvotes":267,"num_comments":72,"sentiment":"negative","key_quote":"<quote>","author":"<username>","flair":"<flair>","awards":0},{"title":"<post>","subreddit":"${config.subreddits[4] || config.subreddits[1]}","upvotes":198,"num_comments":56,"sentiment":"positive","key_quote":"<quote>","author":"<username>","flair":"<flair>","awards":0}]}

Use authentic Indian Reddit language. Topics to cover: ${config.topics}. Vary subreddits across posts.`;

    } else {
      prompt = `Brand: "${brand}" (${config.category}, ITC India). Reddit window: ${fromDate} to ${toDate}.
Themes found: ${themes || config.topics}.

Return ONLY valid JSON. No markdown. All strings under 80 chars. Vary all numbers.

{"keyword_associations":[{"keyword":"<word users link to ${brand}>","frequency":54,"trend":"rising","context":"<why>"},{"keyword":"<kw>","frequency":39,"trend":"rising","context":"<ctx>"},{"keyword":"<kw>","frequency":31,"trend":"stable","context":"<ctx>"},{"keyword":"<kw>","frequency":26,"trend":"rising","context":"<ctx>"},{"keyword":"<kw>","frequency":22,"trend":"rising","context":"<ctx>"},{"keyword":"<kw>","frequency":18,"trend":"stable","context":"<ctx>"},{"keyword":"<kw>","frequency":16,"trend":"stable","context":"<ctx>"},{"keyword":"<kw>","frequency":9,"trend":"falling","context":"<ctx>"}],"keyword_clusters":[{"cluster":"Quality and Taste","keywords":["<w>","<w>","<w>"]},{"cluster":"Price and Value","keywords":["<w>","<w>","<w>"]},{"cluster":"Brand Experience","keywords":["<w>","<w>","<w>"]},{"cluster":"Availability","keywords":["<w>","<w>","<w>"]}],"insights":["<Actionable insight 1 for ${brand} brand team — specific to ${config.category}>","<Insight 2>","<Insight 3>","<Insight 4>","<Insight 5>"],"signal_alerts":[{"signal":"<specific risk or opportunity for ${brand}>","urgency":"high","action":"<specific action>"},{"signal":"<signal 2>","urgency":"medium","action":"<action>"},{"signal":"<signal 3>","urgency":"medium","action":"<action>"}]}

Make insights and signals specific to ${config.category} — not generic.`;
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

    if (data.top_posts) {
      data.top_posts = data.top_posts.map(post => {
        const postId = makePostId();
        return { ...post, reddit_url: makeRedditUrl(post.subreddit, post.title, postId), post_id: postId };
      });
    }

    // Attach brand config to response so frontend can use it
    data.brand_config = {
      category: config.category,
      competitors: config.competitors,
      subreddits: config.subreddits,
    };

    return res.status(200).json({ success: true, data });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export const config = { api: { bodyParser: { sizeLimit: '1mb' } } };
