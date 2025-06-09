const express = require('express');
const fs = require('fs');
const csv = require('csv-parser');
const cors = require('cors');
const axios = require('axios'); // <-- ADDED

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json()); // <-- Needed to parse JSON bodies

let products = [];

function loadCSVData() {
  products = [];
  fs.createReadStream('products.csv')
    .pipe(csv())
    .on('data', (row) => {
      products.push({
        code: row.item_code,
        name: row.item_name.toLowerCase(),
        price: row.item_price,
      });
    })
    .on('end', () => {
      console.log('CSV file successfully loaded.');
    });
}

loadCSVData();

app.get('/search', (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'Query is required' });

  const queries = query
    .toLowerCase()
    .replace(/ and /g, ',')
    .split(',')
    .map(q => q.trim())
    .filter(q => q.length > 0);

  const foundItems = queries
    .map(q => products.find(p => p.name.includes(q)))
    .filter(Boolean);

  if (foundItems.length > 0) {
    return res.json({ items: foundItems });
  } else {
    return res.status(404).json({ error: 'No matching products found' });
  }
});

// ✅ NEW: Proxy route to VAPI to fix CORS
app.post('/proxy/vapi', async (req, res) => {
  try {
    const response = await axios.post('https://api.vapi.ai/call/web', req.body, {
      headers: {
        'Authorization': `Bearer 34f5fbca-0559-4d31-95a8-4f06ed995b57`,
        'Content-Type': 'application/json',
      },
    });

    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('VAPI proxy error:', error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || 'VAPI proxy failed',
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
