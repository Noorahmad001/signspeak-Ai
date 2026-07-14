(function () {
    document.addEventListener("DOMContentLoaded", () => {
        const startBtn = document.getElementById("practiceStartBtn");
        const nextBtn = document.getElementById("practiceNextBtn");
        const iconEl = document.getElementById("practiceIcon");
        const nameEl = document.getElementById("practiceGestureText");
        const feedbackEl = document.getElementById("practiceFeedbackText");
        const scoreEl = document.getElementById("practiceScoreText");
        const targetEl = document.getElementById("practiceTarget");

        let active = false;
        let targetLabel = null;
        let score = 0;
        let lastCheckTime = 0;
        const CHECK_COOLDOWN_MS = 1000;

        function getPracticePool() {
            const wordLabels = Object.keys(window.SignSpeakShared.DISPLAY_NAMES)
                .filter(k => window.SignSpeakShared.DISPLAY_NAMES[k]);
            const letterLabels = ["A", "B", "C", "D", "E"];
            return [...wordLabels, ...letterLabels];
        }

        function pickNewTarget() {
            const pool = getPracticePool();
            targetLabel = pool[Math.floor(Math.random() * pool.length)];
            const display = window.SignSpeakShared.getDisplayText(targetLabel);
            const iconClass = window.SignSpeakShared.getIconClass(targetLabel);
            iconEl.className = "ti " + iconClass + " practice-icon";
            nameEl.textContent = display || targetLabel;
            feedbackEl.textContent = "\u00A0";
        }

        startBtn.addEventListener("click", () => {
            active = true;
            score = 0;
            scoreEl.textContent = score;
            nextBtn.disabled = false;
            pickNewTarget();
        });

        nextBtn.addEventListener("click", () => {
            if (!active) return;
            pickNewTarget();
        });

        window.SignSpeakShared.onHand1Prediction((rawGesture, confidence) => {
            if (!active || !targetLabel) return;

            const now = Date.now();
            if (now - lastCheckTime < CHECK_COOLDOWN_MS) return;
            if (confidence < 0.85) return;

            if (rawGesture === targetLabel) {
                score += 1;
                scoreEl.textContent = score;
                feedbackEl.textContent = "Correct!";
                feedbackEl.style.color = "var(--accent-confirm)";

                targetEl.classList.add("correct-pulse");
                setTimeout(() => targetEl.classList.remove("correct-pulse"), 500);

                lastCheckTime = now;
                setTimeout(pickNewTarget, 900);
            }
        });
    });
})();