import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const BRAND_SUBREDDITS = [
  'r/india', 'r/IndianFood', 'r/cooking',
  'r/bangalore', 'r/delhi', 'r/grocery',
  'r/mumbai', 'r/pune',
  'r/AskIndia',
  'r/IndianKitchen',
  'r/diabetes_india',
];

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

  const allSubs = subreddits || BRAND_SUBREDDITS.join(', ');

  try {
    let prompt;

    if (callType === 'core') {
      prompt = `You are simulating Reddit brand intelligence data for "${brand}" (ITC atta, India).
Date range: ${fromDate} to ${toDate}. Subreddits: ${allSubs}.
Return ONLY valid JSON. No markdown. No backticks. All strings under 90 chars. Vary all numbers.
{"summary":{"total_posts":34,"total_comments":178,"sentiment_score":69,"sentiment_label":"Positive","top_subreddit":"r/india"},"sentiment_breakdown":{"positive":54,"neutral":29,"negative":17},"top_themes":[{"theme":"Chapati softness","count":16,"sentiment":"positive","example":"Rotis come out so soft and pliable, been buying this for 3 years","icon":"🍞"},{"theme":"Price sensitivity","count":10,"sentiment":"negative","example":"MRP jumped again this month, seriously considering switching brands","icon":"💰"},{"theme":"Packaging quality","count":8,"sentiment":"neutral","example":"Bag tears near the bottom seal every single time, very frustrating","icon":"📦"},{"theme":"Diabetic-friendly","count":7,"sentiment":"positive","example":"Nutritionist recommended low GI atta, this one fits perfectly","icon":"🌾"},{"theme":"Quick commerce","count":6,"sentiment":"positive","example":"Got it delivered from Blinkit in 18 minutes, no more ration shop queues","icon":"🚚"}],"competitors_mentioned":[{"brand":"Pillsbury","mentions":9,"vs_aashirvaad":"favorable"},{"brand":"Fortune Atta","mentions":7,"vs_aashirvaad":"unfavorable"},{"brand":"Annapurna","mentions":5,"vs_aashirvaad":"favorable"},{"brand":"Patanjali Atta","mentions":6,"vs_aashirvaad":"neutral"},{"brand":"Nature's Basket","mentions":4,"vs_aashirvaad":"neutral"}],"top_posts":[{"title":"Which atta brand actually makes the softest phulkas? Honest review","subreddit":"r/IndianFood","upvotes":923,"num_comments":187,"sentiment":"positive","key_quote":"Aashirvaad whole wheat genuinely makes the softest rotis I have tried","author":"roti_enthusiast_del","flair":"Product Review","awards":3},{"title":"Aashirvaad atta price hike — is the quality still worth it?","subreddit":"r/AskIndia","upvotes":445,"num_comments":134,"sentiment":"neutral","key_quote":"Quality is the same but that price jump is really hard to justify now","author":"bangalore_homecook","flair":"Consumer Advice","awards":1},{"title":"Atta recommendation for parents with type 2 diabetes","subreddit":"r/diabetes_india","upvotes":312,"num_comments":89,"sentiment":"positive","key_quote":"Aashirvaad multigrains has helped keep my fathers blood sugar stable","author":"health_conscious_mumbai","flair":"Nutrition Help","awards":2},{"title":"Why does every 5kg atta bag tear at the bottom seal?","subreddit":"r/IndianKitchen","upvotes":267,"num_comments":72,"sentiment":"negative","key_quote":"Third time this month the Aashirvaad bag leaked all over my shelf","author":"frustrated_in_pune","flair":"Rant","awards":0},{"title":"Best atta brands available on Blinkit and Swiggy Instamart?","subreddit":"r/bangalore","upvotes":198,"num_comments":56,"sentiment":"positive","key_quote":"Aashirvaad is always in stock on Blinkit and gets delivered fast","author":"koramangala_cook","flair":"Quick Commerce","awards":0}]}
Use authentic Indian Reddit language. Vary all numbers.`;

    } else {
      prompt = `Brand: "${brand}" (ITC atta, India). Reddit window: ${fromDate} to ${toDate}.
Themes: ${themes || 'chapati softness, price hike, packaging, health, delivery'}.
Return ONLY valid JSON. No markdown. No backticks. All strings under 80 chars.
{"keyword_associations":[{"keyword":"soft roti","frequency":54,"trend":"rising","context":"Top praised quality across all subreddits"},{"keyword":"price hike","frequency":39,"trend":"rising","context":"MRP increase sparking switching intent"},{"keyword":"chakki fresh","frequency":31,"trend":"stable","context":"Compared against local chakki alternatives"},{"keyword":"diabetic atta","frequency":26,"trend":"rising","context":"Health buyers seeking low GI wheat options"},{"keyword":"Blinkit delivery","frequency":22,"trend":"rising","context":"Quick commerce is now a key purchase driver"},{"keyword":"packaging tear","frequency":18,"trend":"stable","context":"Recurring complaint about bag seal quality"},{"keyword":"whole wheat","frequency":16,"trend":"stable","context":"Health positioning resonating with buyers"},{"keyword":"multigrain","frequency":11,"trend":"rising","context":"Growing interest in multigrain variants"}],"keyword_clusters":[{"cluster":"Quality and Taste","keywords":["soft roti","texture","chakki fresh","pliable"]},{"cluster":"Price and Value","keywords":["price hike","MRP","value for money","bulk buy"]},{"cluster":"Health","keywords":["diabetic","whole wheat","multigrain","low GI","protein"]},{"cluster":"Logistics","keywords":["Blinkit","Swiggy Instamart","delivery","availability"]}],"insights":["Softness is the single biggest love driver — lead all creative with texture and pliability","Price sensitivity rising fast — 5kg value pack or cashback could stop switching","Diabetic-friendly segment is underserved but high-intent — dedicated campaign needed now","Quick-commerce packaging experience now part of brand review — fix bag seals urgently","r/AskIndia and r/IndianKitchen are high-signal communities for early brand feedback"],"signal_alerts":[{"signal":"Price-driven switching intent spiking in r/AskIndia and r/bangalore threads","urgency":"high","action":"Launch 5kg value pack or Rs 50 cashback within 30 days"},{"signal":"Packaging tear complaints viral in r/IndianKitchen — 267 upvotes on one post","urgency":"high","action":"Audit bag seal supplier and acknowledge issue within 2 weeks"},{"signal":"Multigrain variant gaining traction in r/diabetes_india discussions","urgency":"medium","action":"Seed nutritionist testimonials in diabetes and health subreddits"}]}`;
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      system: 'Return ONLY valid JSON. No markdown, no backticks, no explanation.',
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

    return res.status(200).json({ success: true, data });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export const config = { api: { bodyParser: { sizeLimit: '1mb' } } };
