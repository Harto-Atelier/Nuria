// api/me-proxy.js
export default async function handler(req, res) {
  const { endpoint } = req.query;
  
  // Default endpoint for listings
  const meUrl = endpoint || 'https://api-mainnet.magiceden.dev/v2/ord/btc/tokens?limit=50&minPrice=100000&maxPrice=1000000';
  
  try {
    const response = await fetch(meUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      }
    });
    
    const data = await response.json();
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=60');
    
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
