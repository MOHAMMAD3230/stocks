const API_KEY = "30cbe4bc30msh5fdcf92c4fd37b1p1c022fjsncc0f1842bb0a";  // Replace with your RapidAPI key
const API_HOST = "yh-finance.p.rapidapi.com";

let watchlist = [];  // Your stock symbols here

// Elements
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

// Remove stock
function removeStock(symbol) {
  watchlist = watchlist.filter(s => s !== symbol);
  updateStocks();
}

// Fetch price for a symbol from Yahoo Finance RapidAPI
async function fetchPrice(symbol) {
  const region = "US";  // For simplicity; can improve for markets
  const url = `https://${API_HOST}/stock/v2/get-summary?symbol=${symbol}&region=${region}`;
  
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": API_KEY,
        "X-RapidAPI-Host": API_HOST
      }
    });
    if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
    const data = await res.json();
    return data.price?.regularMarketPrice?.raw ?? null;
  } catch (error) {
    console.error("Error fetching price for", symbol, error);
    return null;
  }
}

// Update the stocks table with live prices
async function updateStocks() {
  stocksTableBody.innerHTML = "";
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

// Initial call
updateStocks();
