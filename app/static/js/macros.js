window.SignSpeakMacros = (function () {

    function load() {
        try {
            return JSON.parse(localStorage.getItem("signspeak_macros") || "[]");
        } catch (e) {
            return [];
        }
    }

    let macros = load();

    function save() {
        localStorage.setItem("signspeak_macros", JSON.stringify(macros));
    }

    function getMacros() {
        return macros;
    }

    function addMacro(trigger, phrase) {
        macros.push({ trigger, phrase });
        save();
    }

    function removeMacro(index) {
        macros.splice(index, 1);
        save();
    }

    function findMatch(commitStack) {
        for (const macro of macros) {
            const n = macro.trigger.length;
            if (commitStack.length < n) continue;
            const tail = commitStack.slice(-n).map(c => c.rawLabel);
            if (JSON.stringify(tail) === JSON.stringify(macro.trigger)) {
                return { macro, n };
            }
        }
        return null;
    }

    return { getMacros, addMacro, removeMacro, findMatch };
})();

(function () {
    document.addEventListener("DOMContentLoaded", () => {
        const sequenceSelect = document.getElementById("macroGestureSelect");
        const addToSeqBtn = document.getElementById("macroAddToSeqBtn");
        const clearSeqBtn = document.getElementById("macroClearSeqBtn");
        const seqDisplay = document.getElementById("macroSequenceDisplay");
        const phraseInput = document.getElementById("macroPhraseInput");
        const saveMacroBtn = document.getElementById("macroSaveBtn");
        const macroListEl = document.getElementById("macroList");

        let currentSequence = [];

        function populateGestureOptions() {
            const labels = window.SignSpeakShared.getAllRawLabels();
            sequenceSelect.innerHTML = labels.map(label => {
                const display = window.SignSpeakShared.getDisplayText(label) || label;
                return `<option value="${label}">${display}</option>`;
            }).join("");
        }

        function renderSequence() {
            if (currentSequence.length === 0) {
                seqDisplay.innerHTML = '<span class="empty-note">No gestures added yet.</span>';
                return;
            }
            seqDisplay.innerHTML = currentSequence.map(label => {
                const iconClass = window.SignSpeakShared.getIconClass(label);
                const display = window.SignSpeakShared.getDisplayText(label) || label;
                return `<span class="macro-chip"><i class="ti ${iconClass}"></i> ${display}</span>`;
            }).join(" <i class=\"ti ti-arrow-right\"></i> ");
        }

        function renderMacroList() {
            const macros = window.SignSpeakMacros.getMacros();
            if (macros.length === 0) {
                macroListEl.innerHTML = '<p class="empty-note">No macros saved yet.</p>';
                return;
            }
            macroListEl.innerHTML = macros.map((m, idx) => {
                const seqText = m.trigger.map(label => window.SignSpeakShared.getDisplayText(label) || label).join(" → ");
                return `
                    <div class="macro-item">
                        <div>
                            <strong>${seqText}</strong>
                            <i class="ti ti-arrow-right macro-arrow"></i> "${m.phrase}"
                        </div>
                        <button class="macro-delete-btn" data-idx="${idx}"><i class="ti ti-trash"></i></button>
                    </div>
                `;
            }).join("");

            macroListEl.querySelectorAll(".macro-delete-btn").forEach(btn => {
                btn.addEventListener("click", () => {
                    window.SignSpeakMacros.removeMacro(parseInt(btn.dataset.idx, 10));
                    renderMacroList();
                });
            });
        }

        addToSeqBtn.addEventListener("click", () => {
            currentSequence.push(sequenceSelect.value);
            renderSequence();
        });

        clearSeqBtn.addEventListener("click", () => {
            currentSequence = [];
            renderSequence();
        });

        saveMacroBtn.addEventListener("click", () => {
            const phrase = phraseInput.value.trim();
            if (currentSequence.length < 2) {
                alert("Add at least 2 gestures to the sequence.");
                return;
            }
            if (!phrase) {
                alert("Enter a phrase for this macro.");
                return;
            }
            window.SignSpeakMacros.addMacro([...currentSequence], phrase);
            currentSequence = [];
            phraseInput.value = "";
            renderSequence();
            renderMacroList();
        });

        populateGestureOptions();
        renderSequence();
        renderMacroList();
    });
})();