// api/me-proxy.js - Magic Eden API Proxy
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { endpoint, symbol, limit = 50, minPrice, maxPrice } = req.query;
  
  let meUrl;
  
  try {
    // Build URL based on endpoint type
    switch (endpoint) {
      case 'stat':
        if (!symbol) {
          return res.status(400).json({ error: 'Missing symbol parameter' });
        }
        meUrl = `https://api-mainnet.magiceden.dev/v2/ord/btc/stat?collectionSymbol=${symbol}`;
        break;
        
      case 'listings':
        if (!symbol) {
          return res.status(400).json({ error: 'Missing symbol parameter' });
        }
        meUrl = `https://api-mainnet.magiceden.dev/v2/ord/btc/tokens?collectionSymbol=${symbol}&limit=${limit}`;
        break;
        
      case 'tokens':
        // Default token listing with price filters
        const params = new URLSearchParams({ limit });
        if (minPrice) params.set('minPrice', minPrice);
        if (maxPrice) params.set('maxPrice', maxPrice);
        meUrl = `https://api-mainnet.magiceden.dev/v2/ord/btc/tokens?${params}`;
        break;
        
      case 'collections':
        meUrl = `https://api-mainnet.magiceden.dev/v2/ord/btc/collections?limit=${limit}`;
        break;
        
      default:
        // If endpoint looks like a full URL, use it directly (backward compat)
        if (endpoint && endpoint.startsWith('http')) {
          meUrl = endpoint;
        } else {
          // Default: token listings
          meUrl = `https://api-mainnet.magiceden.dev/v2/ord/btc/tokens?limit=${limit}&minPrice=100000&maxPrice=1000000`;
        }
    }
    
    const ME_API_KEY = process.env.MAGIC_EDEN_API_KEY || 'a9091e2e-d2c8-40bc-bd9d-a59666a02db2';
    
    const response = await fetch(meUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; NuriaDashboard/1.0)',
        'Authorization': `Bearer ${ME_API_KEY}`
      }
    });
    
    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `Magic Eden API error: ${response.status}`,
        url: meUrl
      });
    }
    
    const data = await response.json();
    res.status(200).json(data);
    
  } catch (error) {
    console.error('ME Proxy error:', error);
    res.status(500).json({ error: error.message, url: meUrl });
  }
}
