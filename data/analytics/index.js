// Vercel Serverless API for CRM analytics
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
  
  // Category breakdown
  const categories = {};
  contacts.forEach(c => {
    const cat = c.category || 'unknown';
    if (!categories[cat]) categories[cat] = { count: 0, followers: 0, verified: 0 };
    categories[cat].count++;
    categories[cat].followers += c.followers || 0;
    if (c.verified) categories[cat].verified++;
  });

  // Follower tiers
  const tiers = {
    'mega': { min: 1000000, count: 0, contacts: [] },      // 1M+
    'macro': { min: 100000, max: 999999, count: 0, contacts: [] },  // 100K-1M
    'mid': { min: 10000, max: 99999, count: 0, contacts: [] },     // 10K-100K
    'micro': { min: 1000, max: 9999, count: 0, contacts: [] },     // 1K-10K
    'nano': { min: 0, max: 999, count: 0, contacts: [] }           // <1K
  };

  contacts.forEach(c => {
    const f = c.followers || 0;
    if (f >= 1000000) { tiers.mega.count++; if (tiers.mega.contacts.length < 10) tiers.mega.contacts.push(c); }
    else if (f >= 100000) { tiers.macro.count++; if (tiers.macro.contacts.length < 10) tiers.macro.contacts.push(c); }
    else if (f >= 10000) { tiers.mid.count++; if (tiers.mid.contacts.length < 10) tiers.mid.contacts.push(c); }
    else if (f >= 1000) { tiers.micro.count++; if (tiers.micro.contacts.length < 10) tiers.micro.contacts.push(c); }
    else { tiers.nano.count++; if (tiers.nano.contacts.length < 10) tiers.nano.contacts.push(c); }
  });

  // Top contacts by category
  const topByCategory = {};
  Object.keys(categories).forEach(cat => {
    topByCategory[cat] = contacts
      .filter(c => c.category === cat)
      .sort((a, b) => (b.followers || 0) - (a.followers || 0))
      .slice(0, 20);
  });

  // Verified stats
  const verifiedCount = contacts.filter(c => c.verified).length;
  const totalFollowers = contacts.reduce((sum, c) => sum + (c.followers || 0), 0);
  const avgFollowers = Math.round(totalFollowers / contacts.length);

  // High value prospects (verified OR >10K followers)
  const highValue = contacts.filter(c => c.verified || c.followers >= 10000);

  res.json({
    total: contacts.length,
    verified: verifiedCount,
    totalFollowers,
    avgFollowers,
    highValueCount: highValue.length,
    categories,
    tiers: {
      mega: { count: tiers.mega.count, sample: tiers.mega.contacts },
      macro: { count: tiers.macro.count, sample: tiers.macro.contacts },
      mid: { count: tiers.mid.count, sample: tiers.mid.contacts },
      micro: { count: tiers.micro.count, sample: tiers.micro.contacts },
      nano: { count: tiers.nano.count, sample: tiers.nano.contacts }
    },
    topByCategory
  });
};
