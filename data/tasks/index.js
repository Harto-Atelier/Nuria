// Vercel Serverless Function for Task Sync
// This endpoint handles sync requests from the dashboard

export default function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method === 'GET') {
        // Return current sync status
        return res.status(200).json({
            status: 'ready',
            message: 'Task sync endpoint ready. POST changes to sync.',
            timestamp: new Date().toISOString()
        });
    }
    
    if (req.method === 'POST') {
        // Receive sync request - store in response for Nuria to pick up
        const { changes } = req.body;
        
        if (!changes || !Array.isArray(changes)) {
            return res.status(400).json({ error: 'Invalid changes array' });
        }
        
        // Return the changes formatted for Nuria
        const syncCommands = changes.map(c => {
            if (c.type === 'status' && c.row) {
                return {
                    action: 'update',
                    row: c.row,
                    column: 'K', // Estado column
                    value: c.status
                };
            }
            return null;
        }).filter(Boolean);
        
        return res.status(200).json({
            success: true,
            message: 'Sync request received',
            commands: syncCommands,
            timestamp: new Date().toISOString()
        });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
}
