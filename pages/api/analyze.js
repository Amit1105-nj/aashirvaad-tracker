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
Date range: ${fromDate} to $
