// On-demand sentence translation using MyMemory's free translation API
// (no API key required). Triggered only by explicit user action — never
// runs automatically. Note: free tier, rate-limited, fine for demo use.
(function () {
    document.addEventListener("DOMContentLoaded", () => {
        const langSelect = document.getElementById("translateLangSelect");
        const translateBtn = document.getElementById("translateSpeakBtn");
        const resultEl = document.getElementById("translatedResultText");

        translateBtn.addEventListener("click", async () => {
            const sentenceEl = document.getElementById("sentenceText");
            const text = sentenceEl.textContent.trim();

            if (!text || text === "") {
                resultEl.textContent = "Build a sentence first.";
                return;
            }

            const targetLang = langSelect.value;
            resultEl.textContent = "Translating...";

            try {
                const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`;
                const response = await fetch(url);
                const data = await response.json();

                const translated = data && data.responseData && data.responseData.translatedText;

                if (!translated) {
                    resultEl.textContent = "Translation failed. Try again.";
                    return;
                }

                resultEl.textContent = translated;

                const utterance = new SpeechSynthesisUtterance(translated);
                utterance.lang = targetLang;
                speechSynthesis.speak(utterance);

            } catch (err) {
                console.error("Translation error:", err);
                resultEl.textContent = "Translation service unavailable right now.";
            }
        });
    });
})();