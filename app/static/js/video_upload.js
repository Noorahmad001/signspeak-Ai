(function () {
    document.addEventListener("DOMContentLoaded", () => {
        const fileInput = document.getElementById("videoFileInput");
        const processBtn = document.getElementById("processVideoBtn");
        const videoEl = document.getElementById("uploadedVideo");
        const progressFill = document.getElementById("videoProgressBarFill");
        const resultText = document.getElementById("videoResultText");
        const speakResultBtn = document.getElementById("speakVideoResultBtn");
        const statusText = document.getElementById("videoStatusText");

        let videoHands = null;
        let processing = false;

        let videoSentence = "";
        let streakLabel = null;
        let streakCount = 0;
        let alreadyCommitted = false;

        const CONFIDENCE_THRESHOLD = 0.85;
        const STREAK_REQUIRED = 2;
        const SEND_INTERVAL_MS = 250;
        let lastSendTime = 0;

        function initHandsIfNeeded() {
            if (videoHands) return;
            videoHands = new Hands({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
            });
            videoHands.setOptions({
                maxNumHands: 1,
                modelComplexity: 1,
                minDetectionConfidence: 0.6,
                minTrackingConfidence: 0.6
            });
            videoHands.onResults(onVideoResults);
        }

        fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
        statusText.textContent = "Please select a valid video file (mp4, mov, webm, etc.).";
        processBtn.disabled = true;
        return;
    }

    const url = URL.createObjectURL(file);
            videoEl.src = url;
            videoEl.load();
            processBtn.disabled = false;
            resultText.textContent = "\u00A0";
            videoSentence = "";
            statusText.textContent = "Video loaded. Click 'Process Video' to begin.";
        });

        async function onVideoResults(results) {
            if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                const landmarks = results.multiHandLandmarks[0];
                const flat = landmarks.flatMap(p => [p.x, p.y, p.z]);

                try {
                    const response = await fetch("/predict", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ landmarks: flat })
                    });
                    const result = await response.json();
                    if (result && !result.error) {
                        handleVideoStreak(result.gesture, result.confidence);
                    }
                } catch (err) {
                    console.error("Video prediction error:", err);
                }
            }
        }

        function handleVideoStreak(rawGesture, confidence) {
            if (confidence < CONFIDENCE_THRESHOLD) {
                streakLabel = null;
                streakCount = 0;
                return;
            }

            if (rawGesture === streakLabel) {
                streakCount += 1;
            } else {
                streakLabel = rawGesture;
                streakCount = 1;
                alreadyCommitted = false;
            }

            if (streakCount >= STREAK_REQUIRED && !alreadyCommitted) {
                const displayText = window.SignSpeakShared.getDisplayText(rawGesture);
                if (displayText) {
                    if (window.SignSpeakShared.isSingleLetter(rawGesture)) {
                        videoSentence += displayText;
                    } else {
                        const prefix = (videoSentence.length > 0 && !videoSentence.endsWith(" ")) ? " " : "";
                        videoSentence += prefix + displayText;
                    }
                    resultText.textContent = videoSentence;
                }
                alreadyCommitted = true;
            }
        }

        processBtn.addEventListener("click", () => {
            if (processing) return;
            initHandsIfNeeded();

            processing = true;
            videoSentence = "";
            streakLabel = null;
            streakCount = 0;
            alreadyCommitted = false;
            resultText.textContent = "\u00A0";
            statusText.textContent = "Processing...";
            processBtn.disabled = true;
            progressFill.style.width = "0%";

            videoEl.currentTime = 0;
            videoEl.muted = true;
            videoEl.play();

            const step = async () => {
                if (videoEl.paused || videoEl.ended) {
                    finishProcessing();
                    return;
                }

                const now = Date.now();
                if (now - lastSendTime > SEND_INTERVAL_MS) {
                    lastSendTime = now;
                    await videoHands.send({ image: videoEl });
                }

                if (videoEl.duration) {
                    const pct = Math.min(100, Math.round((videoEl.currentTime / videoEl.duration) * 100));
                    progressFill.style.width = pct + "%";
                }

                requestAnimationFrame(step);
            };

            requestAnimationFrame(step);
        });

        videoEl.addEventListener("ended", finishProcessing);

        function finishProcessing() {
            if (!processing) return;
            processing = false;
            processBtn.disabled = false;
            progressFill.style.width = "100%";
            statusText.textContent = "Done. Detected sentence shown below.";
            if (!videoSentence.trim()) {
                resultText.textContent = "No confident gestures detected in this video.";
            }
        }

        speakResultBtn.addEventListener("click", () => {
            window.SignSpeakShared.speakText(videoSentence);
        });
    });
})();