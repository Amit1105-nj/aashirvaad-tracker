import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── BRAND CONFIG MAP ──
const BRAND_CONFIG = {
  Aashirvaad: {
    category: 'foods',
    description: "ITC's flagship food brand covering atta, spices, ghee, dal and more",
    subreddits: ['r/india','r/IndianFood','r/cooking','r/bangalore','r/delhi','r/grocery','r/mumbai','r/pune','r/AskIndia','r/IndianKitchen','r/diabetes_india','r/HealthyFood','r/vegetarian','r/IndianDietPlan','r/PCOS'],
    subBrandCompetitors: {
      'Atta': ['Pillsbury','Fortune Atta','Patanjali Atta','Annapurna'],
      'Salt': ['Tata Salt','Catch Salt','Annapurna Salt'],
      'Spices': ['Everest','MDH','Catch','Badshah'],
      'Dal': ['Tata Sampann','Fortune Dal'],
      'Besan': ['Tata Sampann Besan','Fortune Besan'],
      'Rawa': ['Fortune Rawa','Tata Sampann'],
      'Vermicelli': ['Bambino Vermicelli','MTR Vermicelli'],
      'Ghee': ['Amul Ghee','Mother Dairy Ghee','Patanjali Ghee'],
    },
    competitors: ['Pillsbury','Fortune','Tata Salt','Everest','MDH','Tata Sampann','Bambino','Amul'],
    topics: 'chapati softness, price hike, diabetic atta, packaging, Blinkit delivery, roti texture, multigrain, whole wheat, spice quality, ghee purity',
  },
  Sunfeast: {
    category: 'biscuits, snacks and beverages',
    description: "ITC's biscuit, cookie and beverage brand including Dark Fantasy, Yippee noodles, and more",
    subreddits: ['r/india','r/IndianFood','r/AskIndia','r/cooking','r/bangalore','r/delhi','r/mumbai','r/snackexchange','r/HealthyFood','r/diabetes_india','r/Fitness','r/IndianDietPlan','r/vegetarian','r/Hostels','r/CollegeIndia'],
    subBrandCompetitors: {
      'Dark Fantasy': ['Oreo','Hide & Seek','Unibic Choco Kiss'],
      "Mom's Magic": ['Good Day','Unibic Cookies'],
      'Farmlite': ['NutriChoice Digestive','Britannia Digestive'],
      'Bounce': ['Oreo','Bourbon','Treat'],
      'Dream Cream': ['Britannia Treat','Oreo'],
      'Marie Light': ['Marie Gold','Marie Lite'],
      'All Rounder': ['50-50','KrackJack'],
      'Nice': ['Nice Time'],
      'Glucose': ['Parle-G','Tiger'],
      'Milk Magic': ['Milk Bikis'],
      'Wowzers': ['Ritz','50-50'],
      'Fantastik': ['Munch','Perk','5 Star','Dairy Milk'],
      'Yippee': ['Maggi','Top Ramen','Wai Wai'],
      'Milk Shake & Smoothies': ['Amul Kool','Hersheys','Epigamia'],
    },
    competitors: ['Britannia','Parle','Oreo','Maggi','Marie Gold','Parle-G','Good Day','50-50'],
    topics: 'biscuit texture, cream filling, tea time biscuits, Dark Fantasy premium, noodles taste, Farmlite health claims, sugar-free, protein biscuits',
  },
  Bingo: {
    category: 'snacks and chips',
    description: "ITC's popular snack brand — Mad Angles, Tedhe Medhe, Potato Chips",
    subreddits: ['r/india','r/AskIndia','r/bangalore','r/mumbai','r/delhi','r/IndianFood','r/teenagers','r/pune','r/munchies','r/cricket','r/IndianTeens','r/Bollywood','r/gaming','r/CasualConversation'],
    subBrandCompetitors: {
      'Mad Angles': ['Lays Classic','Kurkure Masala Munch','Doritos'],
      'Tedhe Medhe': ['Kurkure','Too Yumm'],
      'Potato Chips': ['Lays','Haldirams Chips','Too Yumm'],
    },
    competitors: ['Lays','Kurkure','Haldirams','Too Yumm','Doritos'],
    topics: 'flavour variety, crunchiness, value for money, packet size, gaming snacks, cricket match snacks',
  },
  'B Natural': {
    category: 'juices and fruit beverages',
    description: "ITC's natural fruit juice brand with no added preservatives",
    subreddits: ['r/india','r/IndianFood','r/AskIndia','r/bangalore','r/mumbai','r/delhi','r/HealthyFood','r/Fitness','r/vegetarian','r/IndianDietPlan'],
    subBrandCompetitors: {
      'Juice': ['Real','Paper Boat','Real Activ','Tropicana'],
    },
    competitors: ['Real','Paper Boat','Tropicana','Minute Maid','Real Activ'],
    topics: 'no preservatives, taste, packaging, price, mango juice, mixed fruit, healthy drinks',
  },
  Candyman: {
    category: 'confectionery and candies',
    description: "ITC's candy brand — Eclairs, Toffees and more",
    subreddits: ['r/india','r/AskIndia','r/IndianFood','r/mumbai','r/delhi','r/bangalore','r/nostalgia','r/IndianParenting','r/teenagers'],
    subBrandCompetitors: {
      'Eclairs': ['Cadbury Eclairs','Alpenliebe'],
      'Toffees': ['Mentos','Parle','Kopiko'],
    },
    competitors: ['Cadbury Eclairs','Alpenliebe','Mentos','Parle','Kopiko'],
    topics: 'childhood nostalgia, sweetness, price, school tuck shop, Diwali gifting, kids favourites',
  },
  'Kitchens of India': {
    category: 'ready to eat and cooking pastes',
    description: "ITC's premium ready-to-eat and cooking pastes brand",
    subreddits: ['r/india','r/IndianFood','r/AskIndia','r/cooking','r/bangalore','r/mumbai','r/delhi','r/MealPrepSunday','r/vegetarian','r/IndianKitchen'],
    subBrandCompetitors: {
      'Ready to Eat': ['MTR','Haldirams','Gits'],
      'Pastes': ['Kohinoor','Patak's'],
    },
    competitors: ['MTR','Haldirams','Gits','Kohinoor','Patak's'],
    topics: 'convenience, taste authenticity, packaging, shelf life, travel food, office lunch',
  },
  'Masterchef Creation': {
    category: 'frozen snacks and seafood',
    description: "ITC's frozen snacks and seafood brand for home cooking",
    subreddits: ['r/india','r/IndianFood','r/AskIndia','r/cooking','r/bangalore','r/mumbai','r/delhi','r/MealPrepSunday','r/IndianKitchen'],
    subBrandCompetitors: {
      'Frozen Snacks': ['Godrej Yummiez','Venky's'],
      'Frozen Seafood': ['Fresho','FreshToHome','Licious'],
    },
    competitors: ['Godrej Yummiez','Venky's','FreshToHome','Licious','Fresho'],
    topics: 'frozen food quality, taste, convenience, price, home cooking, quick meals',
  },
  Fabelle: {
    category: 'premium chocolates',
    description: "ITC's luxury artisan chocolate brand sold in ITC hotels and premium retail",
    subreddits: ['r/india','r/chocolate','r/IndianFood','r/AskIndia','r/bangalore','r/mumbai','r/delhi','r/luxury','r/GiftsForHer','r/weddingplanning','r/IndianWeddings'],
    subBrandCompetitors: {
      'Chocolate': ['Lindt','Manam','Ferrero Rocher','Cadbury Silk'],
    },
    competitors: ['Lindt','Manam','Ferrero Rocher','Cadbury Silk','Smoor'],
    topics: 'premium gifting, hotel chocolate, cocoa percentage, luxury packaging, wedding gifting, corporate gifting',
  },
  Sunbean: {
    category: 'coffee',
    description: "ITC's coffee brand competing in the Indian coffee market",
    subreddits: ['r/india','r/Coffee','r/IndianFood','r/AskIndia','r/bangalore','r/mumbai','r/delhi','r/cafe','r/CasualConversation'],
    subBrandCompetitors: {
      'Coffee': ['Nescafe','Bru','Blue Tokai','Sleepy Owl','Third Wave Coffee'],
    },
    competitors: ['Nescafe','Bru','Blue Tokai','Sleepy Owl','Third Wave Coffee'],
    topics: 'coffee taste, aroma, price, instant vs filter, cafe quality, morning routine',
  },
};


export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { fromDate, toDate, brand, subreddits, callType, themes, realPosts, customKeyword } = req.body;
  if (!fromDate || !toDate || !brand) return res.status(400).json({ error: 'Missing required fields' });

  const baseConfig = BRAND_CONFIG[brand] || BRAND_CONFIG['Aashirvaad'];
  const subBrand = req.body.subBrand || req.body.subCategory || null;
  // Use sub-brand specific competitors if available — don't mutate const
  const config = {
    ...baseConfig,
    competitors: (subBrand && baseConfig.subBrandCompetitors && baseConfig.subBrandCompetitors[subBrand])
      ? baseConfig.subBrandCompetitors[subBrand]
      : baseConfig.competitors
  };
  const allSubs = subreddits || config.subreddits.join(', ');

  // Check if we have real scraped posts to analyse
  const hasRealData = realPosts && realPosts.length > 0;
  const dataSource = hasRealData ? 'Live Reddit data scraped via Apify' : 'No data found';

  // Return null if no real posts — no fake simulation
  if (!hasRealData && callType === 'core') {
    return res.status(200).json({
      success: true,
      data: null,
      no_data: true,
      message: `No Reddit posts found for "${brand}" in this date range. Try expanding the date range or using a different keyword.`
    });
  }

  try {
    let prompt;

    if (callType === 'core') {
      const postsContext = hasRealData
        ? `Here are the REAL Reddit posts scraped from Reddit for "${brand}":
${realPosts.slice(0, 40).map((p, i) => `
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

Analyse these REAL posts to extract sentiment, themes, and competitor mentions relevant to "${brand}" (${config.category}).
${customKeyword ? `Context: User searched for "${customKeyword}" — focus on how this topic relates to ${brand} specifically.` : ''}
Only include posts where ${brand} or its direct competitors are relevant. Discard posts about unrelated topics.
Use only the actual post data.`
        : `Simulate realistic Reddit data for "${brand}" (${config.description}) based on your training knowledge about Indian consumers discussing this brand on Reddit. Date: ${fromDate} to ${toDate}. Subreddits: ${allSubs}.`;
      // This path no longer reached — no simulation allowed

      prompt = `You are a brand intelligence analyst. ${postsContext}

${hasRealData ? 'Analyse the real posts above and' : ''} Return ONLY valid JSON. No markdown. No backticks. All strings under 90 chars.

{"summary":{"total_posts":${realPosts.length},"total_comments":${realPosts.reduce((a,p) => a + (p.num_comments||0), 0)},"sentiment_score":<int 40-90>,"sentiment_label":"Positive|Neutral|Mixed|Negative","top_subreddit":"${config.subreddits[0]}","data_source":"${dataSource}"},"sentiment_breakdown":{"positive":<int>,"neutral":<int>,"negative":<int — must sum to exactly 100>},"top_themes":[{"theme":"<theme relevant to ${config.category}>","count":<int>,"sentiment":"positive|neutral|negative","example":"<${hasRealData ? 'direct quote or paraphrase from real posts above' : 'realistic Indian Reddit comment about ' + brand}>","icon":"<emoji>"},{"theme":"<theme>","count":<int>,"sentiment":"positive|neutral|negative","example":"<${hasRealData ? 'quote from real posts' : 'comment'}>","icon":"<emoji>"},{"theme":"<theme>","count":<int>,"sentiment":"positive|neutral|negative","example":"<example>","icon":"<emoji>"},{"theme":"<theme>","count":<int>,"sentiment":"positive|neutral|negative","example":"<example>","icon":"<emoji>"},{"theme":"<theme>","count":<int>,"sentiment":"positive|neutral|negative","example":"<example>","icon":"<emoji>"}],"competitors_mentioned":[${config.competitors.map(c => `{"brand":"${c}","mentions":<count how many real posts mention ${c} — use 0 if none>,"vs_brand":"favorable|unfavorable|neutral — based on how ${c} is discussed vs ${brand}"}`).join(',')}],"top_posts":[${hasRealData ? realPosts.slice(0,5).map(p => `{"title":"${p.title.replace(/"/g,"'")}","subreddit":"${p.subreddit}","upvotes":${p.upvotes},"num_comments":${p.num_comments},"sentiment":"<positive|neutral|negative>","key_quote":"<key insight from this post under 80 chars>","author":"${p.author}","flair":"${p.flair||''}","awards":${p.awards||0},"reddit_url":"${p.reddit_url}"}`).join(',') : `{"title":"<realistic Reddit post title about ${brand}>","subreddit":"${config.subreddits[0]}","upvotes":<int>,"num_comments":<int>,"sentiment":"positive|neutral|negative","key_quote":"<quote>","author":"<username>","flair":"<flair>","awards":<int>,"reddit_url":"https://reddit.com/r/${config.subreddits[0].replace('r/','')}/comments/${makePostId()}/<slug>/"},{"title":"<post>","subreddit":"${config.subreddits[1]}","upvotes":<int>,"num_comments":<int>,"sentiment":"positive|neutral|negative","key_quote":"<quote>","author":"<username>","flair":"<flair>","awards":<int>,"reddit_url":"https://reddit.com/r/${config.subreddits[1].replace('r/','')}/comments/${makePostId()}/<slug>/"},{"title":"<post>","subreddit":"${config.subreddits[2]}","upvotes":<int>,"num_comments":<int>,"sentiment":"positive|neutral|negative","key_quote":"<quote>","author":"<username>","flair":"<flair>","awards":<int>,"reddit_url":"https://reddit.com/r/${config.subreddits[2].replace('r/','')}/comments/${makePostId()}/<slug>/"},{"title":"<post>","subreddit":"${config.subreddits[3]||config.subreddits[0]}","upvotes":<int>,"num_comments":<int>,"sentiment":"positive|neutral|negative","key_quote":"<quote>","author":"<username>","flair":"<flair>","awards":<int>,"reddit_url":"https://reddit.com/r/${(config.subreddits[3]||config.subreddits[0]).replace('r/','')}/comments/${makePostId()}/<slug>/"},{"title":"<post>","subreddit":"${config.subreddits[4]||config.subreddits[1]}","upvotes":<int>,"num_comments":<int>,"sentiment":"positive|neutral|negative","key_quote":"<quote>","author":"<username>","flair":"<flair>","awards":<int>,"reddit_url":"https://reddit.com/r/${(config.subreddits[4]||config.subreddits[1]).replace('r/','')}/comments/${makePostId()}/<slug>/"}`}]}

${hasRealData ? `IMPORTANT: 
1. For top_posts, use the EXACT reddit_url from the real posts provided above.
2. For competitors_mentioned, count how many of the real posts above actually mention each competitor by name. Use 0 if not mentioned. Do NOT invent mention counts.` : 'Use authentic Indian Reddit language. Topics: ' + config.topics}

`;

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

    // For simulated posts — mark clearly, no fake URLs
    if (!hasRealData && data.top_posts) {
      data.top_posts = data.top_posts.map(post => {
        post.reddit_url = ''; // No fake URLs for simulated data
        post.is_simulated = true;
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
