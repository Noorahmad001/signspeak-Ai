const videoElement = document.getElementById("webcam");
const canvasElement = document.getElementById("overlay");
const canvasCtx = canvasElement.getContext("2d");

// ---------- MediaPipe Setup ----------
const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
});

hands.onResults(onResults);

// ---------- Dataset Collection State ----------
let isCapturing = false;
let currentLabel = "";
let collectedSamples = [];
let lastLandmarksHand1 = null;

const labelInput = document.getElementById("labelInput");
const sampleCountEl = document.getElementById("sampleCount");
const saveCsvBtn = document.getElementById("saveCsvBtn");

document.addEventListener("keydown", (e) => {
    if (document.activeElement === labelInput) return;
    if (e.code === "Space" && !isCapturing) {
        e.preventDefault();
        currentLabel = labelInput.value.trim();
        if (!currentLabel) {
            alert("Please enter a gesture label before capturing.");
            return;
        }
        isCapturing = true;
    }
});

document.addEventListener("keyup", (e) => {
    if (document.activeElement === labelInput) return;
    if (e.code === "Space") {
        e.preventDefault();
        isCapturing = false;
    }
});

document.getElementById("overlay").addEventListener("click", () => {
    labelInput.blur();
});

function maybeCaptureSample() {
    if (isCapturing && lastLandmarksHand1) {
        const row = [currentLabel, ...lastLandmarksHand1];
        collectedSamples.push(row);
        sampleCountEl.textContent = collectedSamples.length;
    }
}

saveCsvBtn.addEventListener("click", () => {
    if (collectedSamples.length === 0) {
        alert("No samples collected yet.");
        return;
    }
    const header = ["label", ...Array.from({ length: 21 }, (_, i) =>
        [`x${i}`, `y${i}`, `z${i}`]).flat()];
    const csvRows = [header.join(","), ...collectedSamples.map(row => row.join(","))];
    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gesture_data_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
});

// ---------- Live Prediction (per hand) ----------
const hand1Icon = document.getElementById("hand1Icon");
const hand1Text = document.getElementById("hand1Text");
const hand1ConfBar = document.getElementById("hand1ConfBar");
const hand2Icon = document.getElementById("hand2Icon");
const hand2Text = document.getElementById("hand2Text");
const hand2ConfBar = document.getElementById("hand2ConfBar");

let lastPredictionTime = 0;
const PREDICTION_INTERVAL_MS = 300;
let landmarksAtLastHand1Prediction = null;

function setHandIcon(iconEl, rawLabel) {
    const iconClass = window.SignSpeakShared.getIconClass(rawLabel);
    iconEl.className = "ti " + iconClass + " hud-icon";
}

async function requestPrediction(landmarks) {
    try {
        const response = await fetch("/predict", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ landmarks })
        });
        return await response.json();
    } catch (err) {
        console.error("Failed to reach /predict:", err);
        return null;
    }
}

function updateConfidenceBar(barEl, confidence) {
    const pct = Math.round(confidence * 100);
    barEl.style.width = `${pct}%`;
    if (pct >= 85) barEl.style.backgroundColor = "var(--accent-confirm)";
    else if (pct >= 60) barEl.style.backgroundColor = "var(--accent-amber)";
    else barEl.style.backgroundColor = "var(--accent-red)";
}

async function predictForHands(handLandmarksArray) {
    if (handLandmarksArray[0]) {
        const result = await requestPrediction(handLandmarksArray[0]);
        if (result && !result.error) {
            const displayText = window.SignSpeakShared.getDisplayText(result.gesture);
            setHandIcon(hand1Icon, result.gesture);
            hand1Text.textContent = displayText || "-";
            updateConfidenceBar(hand1ConfBar, result.confidence);

            landmarksAtLastHand1Prediction = handLandmarksArray[0];
            handleSentenceLogic(result.gesture, result.confidence);
            window.SignSpeakShared.notifyHand1Prediction(result.gesture, result.confidence);
        }
    } else {
        hand1Icon.className = "ti ti-hand-off hud-icon";
        hand1Text.textContent = "-";
        hand1ConfBar.style.width = "0%";
        resetStreak();
    }

    if (handLandmarksArray[1]) {
        const result = await requestPrediction(handLandmarksArray[1]);
        if (result && !result.error) {
            const displayText = window.SignSpeakShared.getDisplayText(result.gesture);
            setHandIcon(hand2Icon, result.gesture);
            hand2Text.textContent = displayText || "-";
            updateConfidenceBar(hand2ConfBar, result.confidence);
        }
    } else {
        hand2Icon.className = "ti ti-hand-off hud-icon";
        hand2Text.textContent = "-";
        hand2ConfBar.style.width = "0%";
    }
}

let pendingHandLandmarks = [];

function maybePredict() {
    const now = Date.now();
    if (now - lastPredictionTime > PREDICTION_INTERVAL_MS) {
        lastPredictionTime = now;
        predictForHands(pendingHandLandmarks);
    }
}

// ---------- Sentence Builder + Auto-Speak + Auto-Space + Macros ----------
const sentenceTextEl = document.getElementById("sentenceText");
const clearBtn = document.getElementById("clearBtn");
const speakBtn = document.getElementById("speakBtn");
const exportTranscriptBtn = document.getElementById("exportTranscriptBtn");

let sentence = "";
let streakLabel = null;
let streakCount = 0;
let alreadyCommittedThisHold = false;
let commitStack = [];

const CONFIDENCE_THRESHOLD = 0.85;
const STREAK_REQUIRED = 3;

function resetStreak() {
    streakLabel = null;
    streakCount = 0;
    alreadyCommittedThisHold = false;
}

function flashConfirmed() {
    sentenceTextEl.classList.add("confirmed-flash");
    setTimeout(() => sentenceTextEl.classList.remove("confirmed-flash"), 500);
}

function checkAndApplyMacro() {
    const match = window.SignSpeakMacros.findMatch(commitStack);
    if (!match) return;

    let removeLen = 0;
    for (let i = 0; i < match.n; i++) {
        removeLen += commitStack[commitStack.length - 1 - i].contributedText.length;
    }
    sentence = sentence.slice(0, sentence.length - removeLen);
    commitStack.splice(commitStack.length - match.n, match.n);

    const prefix = (sentence.length > 0 && !sentence.endsWith(" ")) ? " " : "";
    const macroText = prefix + match.macro.phrase;
    sentence += macroText;
    commitStack.push({ rawLabel: "__macro__", contributedText: macroText });

    sentenceTextEl.textContent = sentence;
    flashConfirmed();
    window.SignSpeakShared.speakText(match.macro.phrase);
}

function handleSentenceLogic(rawGesture, confidence) {
    cancelAutoSpaceTimer();

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
        alreadyCommittedThisHold = false;
    }

    if (streakCount >= STREAK_REQUIRED && !alreadyCommittedThisHold) {
        const displayText = window.SignSpeakShared.getDisplayText(rawGesture);

        if (!displayText) {
            alreadyCommittedThisHold = true;
            return;
        }

        let addedText = "";
        let contributedText = "";
        if (window.SignSpeakShared.isSingleLetter(rawGesture)) {
            sentence += displayText;
            addedText = displayText;
            contributedText = displayText;
        } else {
            const prefix = (sentence.length > 0 && !sentence.endsWith(" ")) ? " " : "";
            sentence += prefix + displayText;
            addedText = displayText;
            contributedText = prefix + displayText;
        }

        sentenceTextEl.textContent = sentence;
        alreadyCommittedThisHold = true;

        commitStack.push({ rawLabel: rawGesture, contributedText });
        if (commitStack.length > 10) commitStack.shift();

        flashConfirmed();
        window.SignSpeakShared.speakText(addedText);
        window.SignSpeakShared.recordHistory(rawGesture, displayText, confidence);

        if (window.SignSpeakCorrections && landmarksAtLastHand1Prediction) {
            window.SignSpeakCorrections.updateLastCommit(rawGesture, landmarksAtLastHand1Prediction);
        }

        checkAndApplyMacro();
    }
}

let autoSpaceTimer = null;
const AUTO_SPACE_DELAY_MS = 1500;

function cancelAutoSpaceTimer() {
    if (autoSpaceTimer) {
        clearTimeout(autoSpaceTimer);
        autoSpaceTimer = null;
    }
}

function scheduleAutoSpace() {
    cancelAutoSpaceTimer();
    autoSpaceTimer = setTimeout(() => {
        if (sentence.length > 0 && !sentence.endsWith(" ")) {
            sentence += " ";
            sentenceTextEl.textContent = sentence;
        }
    }, AUTO_SPACE_DELAY_MS);
}

clearBtn.addEventListener("click", () => {
    sentence = "";
    sentenceTextEl.textContent = "\u00A0";
    resetStreak();
    cancelAutoSpaceTimer();
    commitStack = [];
});

speakBtn.addEventListener("click", () => {
    window.SignSpeakShared.speakSentenceWithPauses(sentence);
});

exportTranscriptBtn.addEventListener("click", () => {
    const history = window.SignSpeakShared.getHistory();
    const lines = [
        "SignSpeak Session Transcript",
        `Generated: ${new Date().toLocaleString()}`,
        "",
        `Full sentence: ${sentence || "(empty)"}`,
        "",
        "Detailed log:",
        ...history.map(h => `[${h.timestamp.toLocaleTimeString()}] ${h.displayText} (${(h.confidence * 100).toFixed(1)}%)`)
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcript_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
});

// ---------- Frame Processing ----------
function onResults(results) {
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    pendingHandLandmarks = [];

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        results.multiHandLandmarks.forEach((landmarks) => {
            drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { color: "#29b6f6", lineWidth: 2 });
            drawLandmarks(canvasCtx, landmarks, { color: "#35d07f", lineWidth: 1, radius: 3 });

            const flatLandmarks = landmarks.flatMap(point => [point.x, point.y, point.z]);
            pendingHandLandmarks.push(flatLandmarks);
        });

        lastLandmarksHand1 = pendingHandLandmarks[0] || null;
        maybeCaptureSample();
    } else {
        lastLandmarksHand1 = null;
        scheduleAutoSpace();
    }

    maybePredict();

    canvasCtx.restore();
}

// ---------- Start/Stop Camera Controls ----------
const startCameraBtn = document.getElementById("startCameraBtn");
const stopCameraBtn = document.getElementById("stopCameraBtn");

const camera = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({ image: videoElement });
    },
    width: 640,
    height: 480
});

let cameraRunning = false;

startCameraBtn.addEventListener("click", () => {
    if (!cameraRunning) {
        camera.start().catch((err) => {
            console.error("Camera start failed:", err);
            alert("Could not access your camera. Please allow camera permission in your browser and try again.");
            cameraRunning = false;
        });
        cameraRunning = true;
    }
});

stopCameraBtn.addEventListener("click", () => {
    if (cameraRunning) {
        camera.stop();
        cameraRunning = false;
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        lastLandmarksHand1 = null;
        hand1Text.textContent = "-";
        hand2Text.textContent = "-";
        hand1Icon.className = "ti ti-hand-off hud-icon";
        hand2Icon.className = "ti ti-hand-off hud-icon";
        hand1ConfBar.style.width = "0%";
        hand2ConfBar.style.width = "0%";
        resetStreak();
        cancelAutoSpaceTimer();
    }
});

camera.start().catch((err) => {
    console.error("Camera auto-start failed:", err);
    cameraRunning = false;
    hand1Text.textContent = "Camera unavailable";
});