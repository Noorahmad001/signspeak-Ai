// Handles switching between top-level tabs (Live Translate, Video Upload,
// Practice Mode, History, Data Tools) and the light/dark theme toggle.
(function () {
    document.addEventListener("DOMContentLoaded", () => {
        const tabButtons = document.querySelectorAll(".tab-btn");
        const tabPanels = document.querySelectorAll(".tab-panel");

        tabButtons.forEach(btn => {
            btn.addEventListener("click", () => {
                tabButtons.forEach(b => b.classList.remove("active"));
                tabPanels.forEach(p => p.classList.remove("active"));

                btn.classList.add("active");
                document.getElementById(btn.dataset.tab).classList.add("active");
            });
        });

        // ---------- Theme toggle ----------
        const themeBtn = document.getElementById("themeToggleBtn");
        const body = document.body;

        const savedTheme = localStorage.getItem("signspeak_theme") || "dark";
        body.setAttribute("data-theme", savedTheme);
        themeBtn.textContent = savedTheme === "dark" ? "🌙" : "☀️";

        themeBtn.addEventListener("click", () => {
            const current = body.getAttribute("data-theme");
            const next = current === "dark" ? "light" : "dark";
            body.setAttribute("data-theme", next);
            localStorage.setItem("signspeak_theme", next);
            themeBtn.textContent = next === "dark" ? "🌙" : "☀️";
        });
    });
})();