(function () {
    document.addEventListener("DOMContentLoaded", () => {
        const historyListEl = document.getElementById("historyList");
        const analyticsTableEl = document.getElementById("analyticsTable");

        function renderHistory() {
            const history = window.SignSpeakShared.getHistory();
            if (history.length === 0) {
                historyListEl.innerHTML = '<p class="empty-note">Nothing recognized yet this session.</p>';
                return;
            }

            historyListEl.innerHTML = history
                .slice()
                .reverse()
                .map(h => `
                    <div class="history-item">
                        <span>${h.displayText} (${(h.confidence * 100).toFixed(0)}%)</span>
                        <span class="timestamp">${h.timestamp.toLocaleTimeString()}</span>
                    </div>
                `).join("");
        }

        function renderAnalytics() {
            const stats = window.SignSpeakShared.getConfidenceStats();
            const keys = Object.keys(stats);

            if (keys.length === 0) {
                analyticsTableEl.innerHTML = '<p class="empty-note">No data yet this session.</p>';
                return;
            }

            const rows = keys
                .sort((a, b) => stats[b].count - stats[a].count)
                .map(key => {
                    const s = stats[key];
                    const avg = (s.totalConfidence / s.count) * 100;
                    const displayName = window.SignSpeakShared.getDisplayText(key) || key;
                    return `<tr><td>${displayName}</td><td>${s.count}</td><td>${avg.toFixed(1)}%</td></tr>`;
                }).join("");

            analyticsTableEl.innerHTML = `
                <table>
                    <thead><tr><th>Gesture</th><th>Count</th><th>Avg Confidence</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            `;
        }

        window.SignSpeakShared.onHistoryUpdate(() => {
            renderHistory();
            renderAnalytics();
        });

        renderHistory();
        renderAnalytics();
    });
})();