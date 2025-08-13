// === IMPORTANT: Insert your Yahoo Finance RapidAPI key here ===
const API_KEY = "30cbe4bc30msh5fdcf92c4fd37b1p1c022fjsncc0f1842bb0a";
const API_HOST = "yh-finance.p.rapidapi.com";

let watchlist = [];  // Stock symbols you want

// DOM elements
const stockInput = document.getElementById("stockInput");
const addStockBtn = document.getElementById("addStockBtn");
const stocksTableBody = document.querySelector("#stocksTable tbody");

// Add stock to watchlist
addStockBtn.addEventListener("click", () => {
  const symbol = stockInput.value.trim().toUpperCase();
  if (symbol && !watchlist.includes(symbol)) {
    watchlist.push(symbol);
    stockInput.value = "";
    updateStocks();
  }
});

// Remove stock from watchlist
function removeStock(symbol) {
  watchlist = watchlist.filter(s => s !== symbol);
  updateStocks();
}

// Fetch price for a given symbol using Yahoo Finance API via RapidAPI
async function fetchStockPrice(symbol) {
    const region = getRegion(symbol);
    const url = `https://yh-finance.p.rapidapi.com/stock/v2/get-summary?symbol=${symbol}&region=${region}`;

    console.log(`🔍 [Frontend] Fetching price for ${symbol} | Region: ${region}`);
    console.log(`[Frontend] API URL: ${url}`);

    try {
        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'X-RapidAPI-Key': 30cbe4bc30msh5fdcf92c4fd37b1p1c022fjsncc0f1842bb0a, // Must match your key at top of file
                'X-RapidAPI-Host': 'yh-finance.p.rapidapi.com'
            }
        });

        console.log(`[Frontend] HTTP Status: ${res.status}`);

        const data = await res.json();
        console.log(`[Frontend] API Response for ${symbol}:`, data);

        return data?.price?.regularMarketPrice?.raw ?? null;
    } catch (err) {
        console.error(`[Frontend] ERROR fetching ${symbol}:`, err);
        return null;
    }
}


// Update the stocks table with the live prices
async function updateStocks() {
  stocksTableBody.innerHTML = "";  // Clear table body
  for (const symbol of watchlist) {
    const price = await fetchPrice(symbol);
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${symbol}</td>
      <td>${price !== null ? price.toFixed(2) : "N/A"}</td>
      <td><button onclick="removeStock('${symbol}')">Remove</button></td>
    `;

    stocksTableBody.appendChild(row);
  }
}

// Initial update call (if you want to preload some stocks, initialize watchlist)
updateStocks();
