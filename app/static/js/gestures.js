window.SignSpeakShared = (function () {

    const DISPLAY_NAMES = {
        "call_me": "Call Me",
        "fist": "Fist Bump",
        "four": "Four",
        "grabbing": "Grabbing",
        "grip": "Grip",
        "hand_heart": "Love You",
        "hand_heart2": "Love You",
        "holy": "Amen",
        "little_finger": "Pinky Promise",
        "mute": "Shh",
        "no_gesture": "",
        "ok": "All Good",
        "one": "One",
        "peace": "Peace Out",
        "peace_inverted": "Peace Out",
        "point": "Point",
        "rock_on": "Rock On",
        "stop": "Stop Right There",
        "stop_inverted": "Stop Right There",
        "stop_sign": "Stop Right There",
        "take_picture": "Say Cheese",
        "three": "Three",
        "three_alt": "Three",
        "three_alt2": "Three",
        "three_gun": "Three",
        "thumb_index": "Small",
        "thumb_index2": "Small",
        "thumbs_down": "Not Good",
        "thumbs_up": "Keep It Up",
        "timeout": "Time Out",
        "two": "Two",
        "two_inverted": "Two",
        "xsign": "No"
    };

    // Maps each gesture to a Tabler outline icon class (professional symbols, no emoji)
    const ICON_MAP = {
        "thumbs_up": "ti-thumb-up",
        "thumbs_down": "ti-thumb-down",
        "ok": "ti-circle-check",
        "peace": "ti-peace",
        "peace_inverted": "ti-peace",
        "fist": "ti-hand-stop",
        "rock_on": "ti-hand-love-you",
        "call_me": "ti-phone",
        "stop": "ti-hand-stop",
        "stop_inverted": "ti-hand-stop",
        "stop_sign": "ti-hand-stop",
        "point": "ti-hand-click",
        "one": "ti-hand-click",
        "two": "ti-peace",
        "two_inverted": "ti-peace",
        "three": "ti-hand-three-fingers",
        "three_alt": "ti-hand-three-fingers",
        "three_alt2": "ti-hand-three-fingers",
        "three_gun": "ti-hand-three-fingers",
        "four": "ti-hand-stop",
        "hand_heart": "ti-heart-handshake",
        "hand_heart2": "ti-heart-handshake",
        "holy": "ti-hand-sanitizer",
        "mute": "ti-volume-off",
        "take_picture": "ti-camera",
        "little_finger": "ti-hand-finger",
        "thumb_index": "ti-hand-two-fingers",
        "thumb_index2": "ti-hand-two-fingers",
        "timeout": "ti-clock-pause",
        "xsign": "ti-x",
        "grabbing": "ti-hand-grab",
        "grip": "ti-hand-grab",
        "no_gesture": "ti-hand-off"
    };

    function getDisplayText(rawLabel) {
        if (rawLabel in DISPLAY_NAMES) return DISPLAY_NAMES[rawLabel];
        return rawLabel;
    }

    function getIconClass(rawLabel) {
        if (rawLabel in ICON_MAP) return ICON_MAP[rawLabel];
        if (isSingleLetter(rawLabel)) return "ti-abc";
        return "ti-hand-stop";
    }

    function isSingleLetter(rawLabel) {
        return rawLabel.length === 1 && /^[A-Za-z]$/.test(rawLabel);
    }

    function getAllRawLabels() {
        const letters = ["A", "B", "C", "D", "E"];
        const words = Object.keys(DISPLAY_NAMES).filter(k => DISPLAY_NAMES[k]);
        return [...letters, ...words];
    }

    // ---------- Voice selection ----------
    let availableVoices = [];
    let selectedVoice = null;

    function loadVoices() {
        availableVoices = speechSynthesis.getVoices();
    }
    speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();

    function pickVoiceByGenderGuess(preferMale) {
        if (availableVoices.length === 0) return null;
        const maleHints = ["male", "david", "mark", "guy", "daniel"];
        const femaleHints = ["female", "zira", "susan", "samantha", "victoria", "linda"];
        const hints = preferMale ? maleHints : femaleHints;
        const match = availableVoices.find(v => hints.some(h => v.name.toLowerCase().includes(h)));
        if (match) return match;
        return preferMale ? availableVoices[0] : (availableVoices[1] || availableVoices[0]);
    }

    function setSelectedVoice(voice) {
        selectedVoice = voice;
    }

    function speakText(text) {
        if (!text || !text.trim()) return;
        const utterance = new SpeechSynthesisUtterance(text);
        if (selectedVoice) utterance.voice = selectedVoice;
        speechSynthesis.speak(utterance);
    }

    function speakSentenceWithPauses(sentence, gapMs = 260) {
        if (!sentence || !sentence.trim()) return;
        const words = sentence.trim().split(/\s+/);
        let i = 0;
        function speakNext() {
            if (i >= words.length) return;
            const utterance = new SpeechSynthesisUtterance(words[i]);
            if (selectedVoice) utterance.voice = selectedVoice;
            utterance.onend = () => {
                i += 1;
                setTimeout(speakNext, gapMs);
            };
            speechSynthesis.speak(utterance);
        }
        speakNext();
    }

    document.addEventListener("DOMContentLoaded", () => {
        const maleBtn = document.getElementById("maleVoiceBtn");
        const femaleBtn = document.getElementById("femaleVoiceBtn");

        if (maleBtn && femaleBtn) {
            maleBtn.addEventListener("click", () => {
                setSelectedVoice(pickVoiceByGenderGuess(true));
                maleBtn.classList.add("active-voice");
                femaleBtn.classList.remove("active-voice");
            });
            femaleBtn.addEventListener("click", () => {
                setSelectedVoice(pickVoiceByGenderGuess(false));
                femaleBtn.classList.add("active-voice");
                maleBtn.classList.remove("active-voice");
            });
        }
    });

    // ---------- Session history + confidence analytics ----------
    const historyLog = [];
    const confidenceStats = {};
    const historyListeners = [];

    function recordHistory(rawLabel, displayText, confidence) {
        const entry = { label: rawLabel, displayText, confidence, timestamp: new Date() };
        historyLog.push(entry);

        if (!confidenceStats[rawLabel]) {
            confidenceStats[rawLabel] = { count: 0, totalConfidence: 0 };
        }
        confidenceStats[rawLabel].count += 1;
        confidenceStats[rawLabel].totalConfidence += confidence;

        historyListeners.forEach(fn => fn(entry));
    }

    function onHistoryUpdate(fn) { historyListeners.push(fn); }
    function getHistory() { return historyLog; }
    function getConfidenceStats() { return confidenceStats; }

    // ---------- Hook for Practice Mode / other listeners ----------
    const hand1PredictionListeners = [];
    function onHand1Prediction(fn) { hand1PredictionListeners.push(fn); }
    function notifyHand1Prediction(rawGesture, confidence) {
        hand1PredictionListeners.forEach(fn => fn(rawGesture, confidence));
    }

    return {
        DISPLAY_NAMES,
        ICON_MAP,
        getDisplayText,
        getIconClass,
        isSingleLetter,
        getAllRawLabels,
        speakText,
        speakSentenceWithPauses,
        setSelectedVoice,
        pickVoiceByGenderGuess,
        recordHistory,
        onHistoryUpdate,
        getHistory,
        getConfidenceStats,
        onHand1Prediction,
        notifyHand1Prediction
    };
})();