// Vercel Serverless API for CRM contacts
const fs = require('fs');
const path = require('path');

let contactsCache = null;

function loadContacts() {
  if (contactsCache) return contactsCache;
  const filePath = path.join(__dirname, '..', 'crm.json');
  contactsCache = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return contactsCache;
}

module.exports = (req, res) => {
  const contacts = loadContacts();
  
  const {
    search = '',
    category = 'all',
    verified = '',
    minFollowers = 0,
    maxFollowers = Infinity,
    sortBy = 'followers',
    sortOrder = 'desc',
    page = 1,
    limit = 50
  } = req.query;

  let filtered = contacts;

  // Search filter
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(c => 
      (c.name || '').toLowerCase().includes(s) ||
      (c.username || '').toLowerCase().includes(s) ||
      (c.bio || '').toLowerCase().includes(s)
    );
  }

  // Category filter
  if (category && category !== 'all') {
    filtered = filtered.filter(c => c.category === category);
  }

  // Verified filter
  if (verified === 'true') {
    filtered = filtered.filter(c => c.verified === true);
  }

  // Followers range
  const minF = parseInt(minFollowers) || 0;
  const maxF = parseInt(maxFollowers) || Infinity;
  filtered = filtered.filter(c => c.followers >= minF && c.followers <= maxF);

  // Sort
  filtered.sort((a, b) => {
    const aVal = a[sortBy] || 0;
    const bVal = b[sortBy] || 0;
    return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
  });

  // Pagination
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 50;
  const start = (pageNum - 1) * limitNum;
  const paginated = filtered.slice(start, start + limitNum);

  res.json({
    total: filtered.length,
    page: pageNum,
    limit: limitNum,
    pages: Math.ceil(filtered.length / limitNum),
    data: paginated
  });
};
