(function () {
    document.addEventListener("DOMContentLoaded", () => {
        const guideBtn = document.getElementById("gestureGuideBtn");
        const modal = document.getElementById("gestureGuideModal");
        const closeBtn = document.getElementById("closeGuideBtn");

        guideBtn.addEventListener("click", () => {
            modal.style.display = "flex";
        });

        closeBtn.addEventListener("click", () => {
            modal.style.display = "none";
        });

        modal.addEventListener("click", (e) => {
            if (e.target === modal) {
                modal.style.display = "none";
            }
        });
    });
})();