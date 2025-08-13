function syncWatchlistToBackend() {
    fetch('/update-watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ watchlist, alerts })
    }).catch(err => console.error('Sync failed:', err));
}

// Call sync after add/remove
function manualAddStock() {
    const symbol = searchInput.value.trim().toUpperCase();
    if (symbol && !watchlist.includes(symbol)) {
        watchlist.push(symbol);
        localStorage.setItem("watchlist", JSON.stringify(watchlist));
        updateStocksTable();
        syncWatchlistToBackend();
    }
    searchInput.value = "";
    resultsBox.innerHTML = "";
}

function removeStock(symbol) {
    watchlist = watchlist.filter(s => s !== symbol);
    delete alerts[symbol];
    localStorage.setItem("watchlist", JSON.stringify(watchlist));
    localStorage.setItem("stockAlerts", JSON.stringify(alerts));
    updateStocksTable();
    syncWatchlistToBackend();
}

// Sync immediately when page loads
syncWatchlistToBackend();
