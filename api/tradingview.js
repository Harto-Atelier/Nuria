// TradingView Webhook Receiver
// Endpoint: POST /api/tradingview
// GET to see recent signals, POST to receive new signals

// In-memory store (resets on cold start, but good for demo)
// For production, use a database like Upstash Redis
const signals = [];
const MAX_SIGNALS = 100;

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // GET - Return recent signals
    if (req.method === 'GET') {
        return res.status(200).json({
            success: true,
            count: signals.length,
            signals: signals.slice(-20).reverse() // Last 20, newest first
        });
    }

    // POST - Receive new signal from TradingView
    if (req.method === 'POST') {
        try {
            let signal = req.body;
            
            // TradingView sometimes sends as string
            if (typeof signal === 'string') {
                try {
                    signal = JSON.parse(signal);
                } catch (e) {
                    signal = { raw: signal };
                }
            }
            
            // Log the incoming signal
            console.log('📊 TradingView Signal:', JSON.stringify(signal, null, 2));
            
            // Add timestamp and ID
            const entry = {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                ticker: signal.ticker || 'UNKNOWN',
                action: signal.action || 'UNKNOWN',
                alert_name: signal.alert_name || '',
                price: signal.price || '',
                raw: signal
            };
            
            // Add to store
            signals.push(entry);
            if (signals.length > MAX_SIGNALS) {
                signals.shift(); // Remove oldest
            }

            // Format message for display
            const emoji = (entry.action || '').toLowerCase().includes('buy') ? '🟢' : '🔴';
            const actionText = (entry.action || '').toLowerCase().includes('buy') ? 'LONG' : 'SHORT';
            
            const message = `📊 TradingView Signal\n\n${emoji} ${actionText} ${entry.ticker}\n💰 Price: $${entry.price || 'N/A'}\n📋 ${entry.alert_name}\n⏰ ${new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}`;

            // Try to notify via Upstash (if configured)
            try {
                const upstashUrl = 'https://pumped-shad-30856.upstash.io';
                const upstashToken = 'AXiIAAIncDI1Yzk1YTUyMjZiMjE0MWIwYmYyZDk2ZDIxYWU3MDFjOXAyMzA4NTY';
                
                // Push to a Redis list for Nuria to check
                await fetch(`${upstashUrl}/lpush/tradingview-signals/${encodeURIComponent(JSON.stringify(entry))}`, {
                    headers: { 'Authorization': `Bearer ${upstashToken}` }
                });
            } catch (e) {
                console.log('Upstash push failed (non-critical):', e.message);
            }

            return res.status(200).json({
                success: true,
                message: 'Signal received',
                signal: entry,
                formatted: message
            });

        } catch (error) {
            console.error('TradingView webhook error:', error);
            return res.status(500).json({ error: 'Internal server error', details: error.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
