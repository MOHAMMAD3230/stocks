// ===== DEPENDENCIES =====
const express = require('express');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const cron = require('node-cron');
const { google } = require('googleapis');

// ===== CONFIG =====
const API_KEY = "YOUR_RAPIDAPI_KEY"; // <<< Replace with your RapidAPI Yahoo Finance API key
let backendWatchlist = [];
let backendAlerts = {};

// ===== GOOGLE DRIVE AUTH =====
const auth = new google.auth.GoogleAuth({
  keyFile: 'service_account.json', // <<< Your Google Drive Service Account JSON file
  scopes: ['https://www.googleapis.com/auth/drive.file']
});
const driveService = google.drive({ version: 'v3', auth });

// ===== EXPRESS APP =====
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Receive updated watchlist + alerts from frontend
app.post('/update-watchlist', (req, res) => {
  backendWatchlist = req.body.watchlist || [];
  backendAlerts = req.body.alerts || {};
  console.log(`✅ Watchlist Updated:`, backendWatchlist);
  console.log(`✅ Alerts Updated:`, backendAlerts);
  res.json({ status: 'ok' });
});

// Endpoint to view the current backend watchlist (for debugging)
app.get('/watchlist.json', (req, res) => {
  res.json({ watchlist: backendWatchlist, alerts: backendAlerts });
});

// Start server
app.listen(3000, () => console.log(`🚀 Server running at http://localhost:3000`));


// ===== DEBUG-ENABLED API FETCH FUNCTION =====
async function fetchStockPrice(symbol) {
  // Adjust this logic for more markets later if needed
  const region = symbol.endsWith(".NS") ? "IN" : "US";
  const url = `https://yh-finance.p.rapidapi.com/stock/v2/get-summary?symbol=${symbol}&region=${region}`;

  console.log(`🔍 [Backend] Fetching price for ${symbol} | Region: ${region}`);
  console.log(`[Backend] API URL: ${url}`);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': API_KEY, // Key for Yahoo Finance RapidAPI
        'X-RapidAPI-Host': 'yh-finance.p.rapidapi.com'
      }
    });

    console.log(`[Backend] HTTP Status: ${res.status}`);
    const data = await res.json();
    console.log(`[Backend] API Response for ${symbol}:`, JSON.stringify(data, null, 2));

    return data?.price?.regularMarketPrice?.raw ?? "N/A";
  } catch (err) {
    console.error(`[Backend] ERROR fetching ${symbol}:`, err);
    return "Error";
  }
}


// ===== CSV GENERATION =====
async function generateCSV() {
  let csv = `Exported At,${new Date().toLocaleString()}\n`;
  csv += "Symbol,Price,Alert\n";

  for (let symbol of backendWatchlist) {
    const price = await fetchStockPrice(symbol);
    const alertVal = backendAlerts[symbol] || "";
    csv += `${symbol},${price},${alertVal}\n`;
  }
  return csv;
}


// ===== GOOGLE DRIVE UPLOAD =====
async function uploadToDrive(fileName, content) {
  const fileMetadata = { name: fileName, mimeType: 'text/csv' };
  const media = { mimeType: 'text/csv', body: Buffer.from(content, 'utf-8') };

  try {
    const res = await driveService.files.create({
      resource: fileMetadata,
      media,
      fields: 'id'
    });
    console.log(`☁ Uploaded to Google Drive: ${fileName} (ID: ${res.data.id})`);
  } catch (err) {
    console.error("❌ Error uploading to Google Drive:", err);
  }
}


// ===== NIGHTLY EXPORT JOB =====
async function job() {
  if (backendWatchlist.length === 0) {
    console.log("⚠ No watchlist data yet — skipping nightly export.");
    return;
  }

  console.log("⌛ Generating nightly CSV for:", backendWatchlist);
  const csvContent = await generateCSV();
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `stocks_${dateStr}.csv`;

  // Save locally
  fs.writeFileSync(fileName, csvContent);
  console.log(`💾 Saved locally: ${fileName}`);

  // Upload to Google Drive
  await uploadToDrive(fileName, csvContent);
}

// Schedule for 5 minutes after midnight every day
cron.schedule('5 0 * * *', job);

