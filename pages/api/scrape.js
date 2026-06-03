export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { brand, subreddits } = req.body;
  if (!brand || !subreddits) return res.status(400).json({ error: 'Missing required fields' });

  const APIFY_API_KEY = process.env.APIFY_API_KEY;
  if (!APIFY_API_KEY) return res.status(500).json({ error: 'APIFY_API_KEY not configured' });

  const BRAND_SEARCH_TERMS = {
    Aashirvaad: {
      default: { primary: 'Aashirvaad', fallbacks: ['Aashirvaad ITC', 'ITC atta brand', 'Aashirvaad review'] },
      'All': { primary: 'Aashirvaad', fallbacks: ['Aashirvaad ITC', 'ITC atta brand', 'Aashirvaad review'] },
      'Atta': { primary: 'Aashirvaad atta', fallbacks: ['chakki atta India', 'best atta brand', 'roti atta soft', 'whole wheat atta', 'multigrain atta India', 'atta for soft roti', 'wheat flour India', 'aata brand review'] },
      'Salt': { primary: 'Aashirvaad salt', fallbacks: ['best salt India', 'iodized salt India', 'pink salt vs regular', 'low sodium salt India', 'salt brand review India', 'sendha namak', 'rock salt India'] },
      'Spices': { primary: 'Aashirvaad spices masala', fallbacks: ['best masala brand India', 'Indian spice brand', 'kitchen masala India', 'garam masala review', 'haldi brand India', 'coriander powder India', 'red chilli powder brand', 'masala dabba India'] },
      'Dal': { primary: 'Aashirvaad dal', fallbacks: ['best dal brand India', 'toor dal India', 'moong dal brand', 'chana dal India', 'dal quality India', 'packaged dal India', 'protein dal India'] },
      'Besan': { primary: 'Aashirvaad besan', fallbacks: ['gram flour India', 'best besan brand', 'besan quality India', 'chickpea flour India', 'besan for cooking', 'gluten free flour India'] },
      'Rawa': { primary: 'Aashirvaad rawa sooji', fallbacks: ['best sooji India', 'upma rawa', 'semolina India', 'rava idli brand', 'sooji halwa brand', 'fine rava India'] },
      'Vermicelli': { primary: 'Aashirvaad vermicelli', fallbacks: ['seviyan India', 'vermicelli brand India', 'sevai milk', 'roasted vermicelli', 'vermicelli kheer', 'pasta vermicelli India'] },
      'Ghee': { primary: 'Aashirvaad ghee', fallbacks: ['pure desi ghee India', 'best ghee brand', 'cow ghee vs buffalo', 'A2 ghee India', 'ghee for cooking', 'organic ghee India', 'ghee quality review', 'clarified butter India'] },
    },
    Sunfeast: {
      default: { primary: 'Sunfeast biscuit', fallbacks: ['ITC biscuit brand', 'best biscuit India', 'biscuit brand review India', 'Sunfeast cookies'] },
      'All': { primary: 'Sunfeast biscuit', fallbacks: ['ITC biscuit brand', 'best biscuit India', 'biscuit brand review India', 'Sunfeast cookies'] },
      'Dark Fantasy': { primary: 'Sunfeast Dark Fantasy', fallbacks: ['dark fantasy choco fills', 'premium biscuit India', 'chocolate biscuit India', 'best chocolate cookie', 'luxury biscuit India', 'choco filled biscuit', 'dark fantasy review', 'indulgent biscuit India'] },
      'Moms Magic': { primary: 'Sunfeast Moms Magic', fallbacks: ['butter cookies India', 'cashew cookies brand', 'Indian butter biscuit', 'moms magic review', 'tea time biscuit India'] },
      'Farmlite': { primary: 'Sunfeast Farmlite digestive', fallbacks: ['digestive biscuit India', 'healthy biscuit brand', 'oats biscuit India', 'low sugar biscuit', 'weight loss biscuit', 'multigrain biscuit India', 'fibre biscuit India'] },
      'Bounce': { primary: 'Sunfeast Bounce biscuit', fallbacks: ['cream sandwich biscuit', 'jelly biscuit India', 'kids biscuit India', 'fun biscuit brand'] },
      'Dream Cream': { primary: 'Sunfeast Dream Cream', fallbacks: ['cream biscuit India', 'vanilla cream biscuit', 'best cream biscuit brand', 'filled cream biscuit'] },
      'Marie Light': { primary: 'Sunfeast Marie Light', fallbacks: ['marie biscuit India', 'light biscuit brand', 'tea biscuit India', 'diet biscuit India', 'marie gold alternative'] },
      'All Rounder': { primary: 'Sunfeast All Rounder crackers', fallbacks: ['cracker biscuit India', 'namkeen biscuit brand', 'salty biscuit India', '50 50 alternative'] },
      'Nice': { primary: 'Sunfeast Nice biscuit', fallbacks: ['coconut biscuit India', 'nice biscuit brand', 'sweet biscuit India'] },
      'Glucose': { primary: 'Sunfeast Glucose biscuit', fallbacks: ['glucose biscuit kids', 'energy biscuit India', 'parle g alternative', 'plain biscuit India'] },
      'Milk Magic': { primary: 'Sunfeast Milk Magic', fallbacks: ['milk biscuit India', 'calcium biscuit kids', 'kids biscuit milk India'] },
      'Wowzers': { primary: 'Sunfeast Wowzers', fallbacks: ['cracker snack India', 'ritz alternative India', 'cheese cracker India', 'salty cracker brand'] },
      'Fantastik': { primary: 'Sunfeast Fantastik chocolate', fallbacks: ['wafer chocolate India', 'chocolate wafer biscuit', 'hazelnut wafer India', 'chocolate snack India'] },
      'Yippee': { primary: 'Sunfeast Yippee noodles', fallbacks: ['Yippee vs Maggi', 'best instant noodles India', '2 minute noodles India', 'masala noodles India', 'instant noodles review', 'noodles for kids India', 'spicy noodles India', 'college hostel noodles'] },
      'Milk Shake & Smoothies': { primary: 'Sunfeast milkshake smoothie', fallbacks: ['flavoured milk India', 'mango milkshake brand', 'chocolate milk brand India', 'kids milk drink India', 'packaged smoothie India'] },
    },
    Bingo: {
      default: { primary: 'Bingo snacks', fallbacks: ['ITC chips brand', 'Indian snack brand', 'best chips India', 'munch snacks India', 'Bingo review'] },
      'All': { primary: 'Bingo snacks', fallbacks: ['ITC chips brand', 'Indian snack brand', 'best chips India', 'munch snacks India', 'Bingo review'] },
      'Mad Angles': { primary: 'Bingo Mad Angles', fallbacks: ['mad angles flavours', 'triangle chips India', 'masala chips India', 'mad angles review', 'chatpata chips', 'best masala chips', 'mad angles new flavour'] },
      'Tedhe Medhe': { primary: 'Bingo Tedhe Medhe', fallbacks: ['tedhe medhe snack', 'masala puffs India', 'corn snack India', 'spicy puffs India', 'tedhe medhe review'] },
      'Potato Chips': { primary: 'Bingo potato chips', fallbacks: ['best potato chips India', 'salted chips India', 'crispy chips brand', 'Lays alternative India', 'thin chips India', 'potato wafers India'] },
    },
    'B Natural': {
      default: { primary: 'B Natural juice', fallbacks: ['natural juice India', 'no preservative juice India', 'ITC juice brand', 'fruit juice brand India'] },
      'All': { primary: 'B Natural juice', fallbacks: ['natural juice India', 'no preservative juice India', 'ITC juice brand', 'fruit juice brand India'] },
      'Juice': { primary: 'B Natural fruit juice', fallbacks: ['mango juice India', 'mixed fruit juice brand', 'healthy juice India', 'real juice alternative', 'no added sugar juice', 'fruit drink for kids', 'cold pressed juice India', '100 percent fruit juice'] },
    },
    Candyman: {
      default: { primary: 'Candyman ITC', fallbacks: ['ITC candy brand', 'Indian candy brand', 'toffee brand India'] },
      'All': { primary: 'Candyman ITC', fallbacks: ['ITC candy brand', 'Indian candy brand', 'toffee brand India'] },
      'Eclairs': { primary: 'Candyman eclairs', fallbacks: ['chocolate eclairs India', 'caramel toffee India', 'best eclairs brand', 'ITC chocolate candy', 'eclairs childhood India', 'coffee eclairs India'] },
      'Toffees': { primary: 'Candyman toffee', fallbacks: ['Indian toffee brand', 'hard candy India', 'fruit toffee India', 'penny candy India', 'school candy India', 'nostalgic candy India'] },
    },
    'Kitchens of India': {
      default: { primary: 'Kitchens of India', fallbacks: ['ITC ready to eat', 'premium Indian food brand', 'gourmet Indian food'] },
      'All': { primary: 'Kitchens of India', fallbacks: ['ITC ready to eat', 'premium Indian food brand', 'gourmet Indian food'] },
      'Ready to Eat': { primary: 'Kitchens of India ready to eat', fallbacks: ['best ready to eat India', 'dal makhani ready to eat', 'biryani ready to eat', 'butter chicken ready to eat', 'instant Indian meal', 'travel food India', 'office lunch ready to eat', 'microwave Indian food', 'packaged Indian food', 'RTE food India'] },
      'Pastes': { primary: 'Kitchens of India cooking paste', fallbacks: ['cooking paste India', 'curry paste India', 'biryani paste brand', 'tikka masala paste', 'ginger garlic paste brand', 'korma paste India'] },
    },
    'Masterchef Creation': {
      default: { primary: 'ITC Masterchef frozen', fallbacks: ['frozen food India', 'frozen snack brand India', 'ITC frozen food'] },
      'All': { primary: 'ITC Masterchef frozen', fallbacks: ['frozen food India', 'frozen snack brand India', 'ITC frozen food'] },
      'Frozen Snacks': { primary: 'ITC Masterchef frozen snacks', fallbacks: ['frozen chicken India', 'frozen nuggets India', 'frozen kebab India', 'quick frozen snacks', 'party snacks frozen', 'frozen appetizer India', 'freezer snacks India', 'frozen momos India'] },
      'Frozen Seafood': { primary: 'ITC Masterchef frozen seafood', fallbacks: ['frozen prawns India', 'frozen fish India', 'frozen fish fillet', 'seafood brand India', 'frozen squid India', 'ready to cook seafood India'] },
    },
    Fabelle: {
      default: { primary: 'Fabelle chocolate ITC', fallbacks: ['ITC chocolate brand', 'luxury chocolate India', 'premium chocolate gift India'] },
      'All': { primary: 'Fabelle chocolate ITC', fallbacks: ['ITC chocolate brand', 'luxury chocolate India', 'premium chocolate gift India'] },
      'Chocolate': { primary: 'Fabelle chocolate', fallbacks: ['dark chocolate India', 'artisan chocolate India', 'bean to bar chocolate India', 'Belgian chocolate India', '70 percent dark chocolate', 'chocolate gifting India', 'single origin chocolate', 'ITC hotel chocolate', 'luxury truffle India', 'chocolate box India'] },
    },
    Sunbean: {
      default: { primary: 'Sunbean coffee ITC', fallbacks: ['ITC coffee brand', 'Indian coffee brand', 'new coffee brand India'] },
      'All': { primary: 'Sunbean coffee ITC', fallbacks: ['ITC coffee brand', 'Indian coffee brand', 'new coffee brand India'] },
      'Coffee': { primary: 'Sunbean coffee', fallbacks: ['filter coffee India', 'south Indian coffee brand', 'best instant coffee India', 'coffee powder brand', 'freshly ground coffee India', 'arabica coffee India', 'dark roast coffee India', 'coffee capsule India', 'pour over coffee India', 'cold brew India'] },
    },
  };

  try {
    const brandLower = brand.toLowerCase();
    const subCat = req.body.subCategory || 'All';
    const excludeKeywords = req.body.excludeKeywords
      ? req.body.excludeKeywords.split(',').map(k=>k.trim().toLowerCase()).filter(Boolean)
      : [];
    const customKeyword = req.body.customKeyword;
    const brandTerms = BRAND_SEARCH_TERMS[brand] || { default: { primary: brand, fallbacks: [] } };
    const termConfig = brandTerms[subCat] || brandTerms.default || { primary: brand, fallbacks: [] };
    const primaryTerm = customKeyword ? `${customKeyword} ${termConfig.primary}` : termConfig.primary;
    const allSearchTerms = [primaryTerm, ...(termConfig.fallbacks || [])];
    console.log(`Search terms for ${brand}/${subCat}: primary="${primaryTerm}", ${termConfig.fallbacks?.length||0} fallbacks`);

    // Start Apify run
    const runResponse = await fetch(
      `https://api.apify.com/v2/acts/harshmaur~reddit-scraper/runs?token=${APIFY_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchTerms: [primaryTerm],
          searchPosts: true,
          searchComments: false,
          searchCommunities: false,
          searchSort: 'relevance',
          searchTime: 'all',
          maxPostsCount: 50,
          includeNSFW: false,
          fastMode: true,
          crawlCommentsPerPost: false,
          proxy: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] },
        })
      }
    );

    if (!runResponse.ok) {
      const errText = await runResponse.text();
      throw new Error(`Apify failed (${runResponse.status}): ${errText.slice(0, 200)}`);
    }

    const runData = await runResponse.json();
    const runId = runData.data?.id;
    if (!runId) throw new Error('No run ID from Apify');

    // Poll max 45 seconds (Vercel limit is 60s)
    let attempts = 0;
    let runStatus = 'RUNNING';
    let datasetId = null;

    while (attempts < 9 && (runStatus === 'RUNNING' || runStatus === 'READY')) {
      await new Promise(r => setTimeout(r, 5000));
      const s = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_KEY}`);
      const sd = await s.json();
      runStatus = sd.data?.status;
      datasetId = sd.data?.defaultDatasetId;
      if (runStatus === 'FAILED' || runStatus === 'ABORTED') throw new Error(`Apify run ${runStatus}`);
      attempts++;
    }

    // If still running after 45s — fetch whatever results exist so far
    if (runStatus !== 'SUCCEEDED' && datasetId) {
      console.log('Fetching partial results after timeout, status:', runStatus);
    } else if (runStatus !== 'SUCCEEDED') {
      throw new Error('Scrape timed out with no results');
    }

    const r = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_API_KEY}&limit=100&clean=true`);
    const rawItems = await r.json();

    console.log('Reddit raw items:', rawItems?.length || 0);
    if (rawItems?.length > 0) {
      console.log('Reddit first item keys:', Object.keys(rawItems[0]));
    }
    console.log('Safe posts after NSFW filter:', safePosts?.length || 0);
    console.log('Brand posts (mention brand):', brandPosts?.length || 0);
    console.log('Search term used:', searchTerm);

    if (!rawItems || rawItems.length === 0) {
      return res.status(200).json({ success: true, posts: [], message: 'No posts found' });
    }

    // Filter NSFW
    const safePosts = rawItems.filter(p => {
      if (p.dataType && p.dataType !== 'post') return false;
      return !p.over18 && !p.nsfw && !p.isNsfw && (p.title || p.body);
    });

    // Apply exclude keywords filter
    const filteredPosts = excludeKeywords.length > 0
      ? safePosts.filter(p => {
          const text = `${p.title||''} ${p.body||''}`.toLowerCase();
          return !excludeKeywords.some(kw => text.includes(kw));
        })
      : safePosts;

    console.log(`Excluded keywords filter: ${safePosts.length} → ${filteredPosts.length} posts`);

    // FALLBACK: if no relevant posts found, try fallback keywords one by one
    let fallbackIndex = 0;
    let currentFilteredPosts = filteredPosts;
    
    while (currentFilteredPosts.length === 0 && fallbackIndex < allSearchTerms.length - 1) {
      fallbackIndex++;
      const fallbackTerm = allSearchTerms[fallbackIndex];
      console.log(`No posts found — trying fallback ${fallbackIndex}: "${fallbackTerm}"`);
      
      try {
        const fbRun = await fetch(
          `https://api.apify.com/v2/acts/harshmaur~reddit-scraper/runs?token=${APIFY_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              searchTerms: [fallbackTerm],
              searchPosts: true,
              searchComments: false,
              searchCommunities: false,
              searchSort: 'relevance',
              searchTime: 'all',
              maxPostsCount: 50,
              includeNSFW: false,
              fastMode: true,
              crawlCommentsPerPost: false,
              proxy: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] },
            })
          }
        );
        if (!fbRun.ok) continue;
        const fbRunData = await fbRun.json();
        const fbRunId = fbRunData.data?.id;
        if (!fbRunId) continue;

        let fbAttempts = 0, fbStatus = 'RUNNING', fbDatasetId = null;
        while (fbAttempts < 9 && (fbStatus === 'RUNNING' || fbStatus === 'READY')) {
          await new Promise(r => setTimeout(r, 5000));
          const fbS = await fetch(`https://api.apify.com/v2/actor-runs/${fbRunId}?token=${APIFY_API_KEY}`);
          const fbSd = await fbS.json();
          fbStatus = fbSd.data?.status;
          fbDatasetId = fbSd.data?.defaultDatasetId;
          if (fbStatus === 'FAILED' || fbStatus === 'ABORTED') break;
          fbAttempts++;
        }
        if (fbStatus !== 'SUCCEEDED' || !fbDatasetId) continue;

        const fbR = await fetch(`https://api.apify.com/v2/datasets/${fbDatasetId}/items?token=${APIFY_API_KEY}&limit=100&clean=true`);
        const fbItems = await fbR.json();

        const fbSafePosts = (fbItems || []).filter(p => {
          if (p.dataType && p.dataType !== 'post') return false;
          return !p.over18 && !p.nsfw && (p.title || p.body);
        });
        const fbFiltered = excludeKeywords.length > 0
          ? fbSafePosts.filter(p => {
              const text = `${p.title||''} ${p.body||''}`.toLowerCase();
              return !excludeKeywords.some(kw => text.includes(kw));
            })
          : fbSafePosts;

        if (fbFiltered.length > 0) {
          currentFilteredPosts = fbFiltered;
          console.log(`Fallback "${fallbackTerm}" found ${fbFiltered.length} posts`);
          // Update brandLower search for fallback results
          break;
        }
      } catch(e) {
        console.log(`Fallback error: ${e.message}`);
        continue;
      }
    }

    const finalFilteredPosts = currentFilteredPosts.length > 0 ? currentFilteredPosts : filteredPosts;
    const brandPosts = finalFilteredPosts.filter(p =>
      (p.title || '').toLowerCase().includes(brandLower) ||
      (p.body || '').toLowerCase().includes(brandLower)
    );
    const otherPosts = finalFilteredPosts.filter(p => !brandPosts.includes(p));
    const finalPosts = [...brandPosts, ...otherPosts];
    console.log(`Final: ${brandPosts.length} brand posts + ${otherPosts.length} other = ${finalPosts.length} total`);
    console.log(`Posts breakdown: raw=${rawItems?.length} safe=${safePosts.length} brand=${brandPosts.length} other=${otherPosts.length} final=${finalPosts.length}`);

    const posts = finalPosts.map(p => ({
      title: (p.title || p.body || 'Reddit Post').slice(0, 200),
      subreddit: `r/${p.communityName || p.subreddit || p.community || 'reddit'}`,
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
      scrapeDate: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Scrape error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}

export const config = { api: { bodyParser: { sizeLimit: '2mb' }, responseLimit: '8mb' } };
