// Active learning: lets the user flag the last recognized gesture as wrong
// and record the correct label, alongside the exact raw landmarks used for
// that prediction. Corrections export as a CSV in the same format as the
// training data, ready to merge into data/raw/ and retrain.
window.SignSpeakCorrections = (function () {

    let lastRawLabel = null;
    let lastLandmarks = null;
    const corrections = []; // { label, landmarks: [63 numbers] }

    function updateLastCommit(rawLabel, landmarks) {
        lastRawLabel = rawLabel;
        lastLandmarks = landmarks;
        notifyListeners();
    }

    function submitCorrection(correctLabel) {
        if (!lastLandmarks) return false;
        corrections.push({ label: correctLabel, landmarks: [...lastLandmarks] });
        notifyListeners();
        return true;
    }

    function getCorrectionCount() {
        return corrections.length;
    }

    function getLastRawLabel() {
        return lastRawLabel;
    }

    function downloadCorrectionsCSV() {
        if (corrections.length === 0) return false;

        const header = ["label", ...Array.from({ length: 21 }, (_, i) =>
            [`x${i}`, `y${i}`, `z${i}`]).flat()];

        const rows = corrections.map(c => [c.label, ...c.landmarks].join(","));
        const csvContent = [header.join(","), ...rows].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `corrections_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        return true;
    }

    const listeners = [];
    function onUpdate(fn) { listeners.push(fn); }
    function notifyListeners() { listeners.forEach(fn => fn()); }

    return {
        updateLastCommit,
        submitCorrection,
        getCorrectionCount,
        getLastRawLabel,
        downloadCorrectionsCSV,
        onUpdate
    };
})();

// ---------- Correction panel UI ----------
(function () {
    document.addEventListener("DOMContentLoaded", () => {
        const lastLabelEl = document.getElementById("correctionLastLabel");
        const correctSelect = document.getElementById("correctionSelect");
        const submitBtn = document.getElementById("correctionSubmitBtn");
        const countEl = document.getElementById("correctionCount");
        const downloadBtn = document.getElementById("correctionDownloadBtn");

        function populateOptions() {
            const labels = window.SignSpeakShared.getAllRawLabels();
            correctSelect.innerHTML = labels.map(label => {
                const display = window.SignSpeakShared.getDisplayText(label) || label;
                return `<option value="${label}">${display}</option>`;
            }).join("");
        }

        function refresh() {
            const last = window.SignSpeakCorrections.getLastRawLabel();
            lastLabelEl.textContent = last
                ? (window.SignSpeakShared.getDisplayText(last) || last)
                : "No gesture recognized yet this session.";
            countEl.textContent = window.SignSpeakCorrections.getCorrectionCount();
        }

        submitBtn.addEventListener("click", () => {
            const chosen = correctSelect.value;
            const ok = window.SignSpeakCorrections.submitCorrection(chosen);
            if (!ok) {
                alert("No recognized gesture available to correct yet — use the app for a moment first.");
                return;
            }
        });

        downloadBtn.addEventListener("click", () => {
            const ok = window.SignSpeakCorrections.downloadCorrectionsCSV();
            if (!ok) alert("No corrections recorded yet.");
        });

        window.SignSpeakCorrections.onUpdate(refresh);

        populateOptions();
        refresh();
    });
})();