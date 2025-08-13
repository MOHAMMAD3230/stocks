const express = require('express');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const cron = require('node-cron');
const { google } = require('googleapis');

// ===== CONFIG =====
const API_KEY = "YOUR_RAPIDAPI_KEY";
let backendWatchlist = [];
let backendAlerts = {};

// Google Drive Auth
const auth = new google.auth.GoogleAuth({
    keyFile: 'service_account.json',
    scopes: ['https://www.googleapis.com/auth/drive.file']
});
const driveService = google.drive({ version: 'v3', auth });

// ===== FRONT-END SERVER =====
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/update-watchlist', (req, res) => {
    backendWatchlist = req.body.watchlist || [];
    backendAlerts = req.body.alerts || {};
    res.json({ status: 'ok' });
});

app.get('/watchlist.json', (req, res) => {
    res.json({ watchlist: backendWatchlist, alerts: backendAlerts });
});

app.listen(3000, () => console.log(`✅ Server running at http://localhost:3000`));

// ===== STOCK PRICE FETCH =====
async function fetchStockPrice(symbol) {
    const region = symbol.endsWith(".NS") ? "IN" : "US";
    const url = `https://yh-finance.p.rapidapi.com/stock/v2/get-summary?symbol=${symbol}&region=${region}`;
    try {
        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'X-RapidAPI-Key': API_KEY,
                'X-RapidAPI-Host': 'yh-finance.p.rapidapi.com'
            }
        });
        const data = await res.json();
        return data.price?.regularMarketPrice?.raw ?? "N/A";
    } catch {
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
    const res = await driveService.files.create({
        resource: fileMetadata,
        media,
        fields: 'id'
    });
    console.log(`☁ Uploaded to Drive: ${fileName} (ID: ${res.data.id})`);
}

// ===== NIGHTLY JOB =====
async function job() {
    if (backendWatchlist.length === 0) {
        console.log("⚠ No watchlist set yet — skipping export");
        return;
    }
    console.log("⌛ Generating nightly CSV for watchlist:", backendWatchlist);
    const csvContent = await generateCSV();
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `stocks_${dateStr}.csv`;
    fs.writeFileSync(fileName, csvContent);
    console.log(`💾 Saved locally: ${fileName}`);
    await uploadToDrive(fileName, csvContent);
}

// Schedule every day at 00:05
cron.schedule('5 0 * * *', job);
