# SignSpeak AI

A real-time, AI-powered Sign Language Gesture-to-Text Translator, built as an
Advanced AI Summer Internship project for Medi-Caps University in
collaboration with IBM ICE.

---

## What it does

SignSpeak AI watches your hand through a webcam, recognizes the gesture
you're making using a custom-trained PyTorch model, and converts it into
text — building full sentences, speaking them aloud, and offering tools to
practice, translate, and extend the gesture vocabulary itself.

**Core capabilities:**
- Real-time two-hand gesture recognition (38 gesture classes: 5 self-collected
  letters A–E, plus 33 everyday gestures sourced from the HaGRID dataset)
- Sentence building with confidence-based smoothing, auto-space, and
  auto-speak
- Pause-aware text-to-speech with male/female voice selection
- Video upload translation — process pre-recorded sign videos, not just live
- Practice/Learn Mode with live scoring
- Custom gesture macros — chain gesture sequences into personalized phrases
- Active learning correction loop — flag wrong predictions and export
  corrected training data
- On-demand sentence translation into other spoken languages
- Session history and confidence analytics
- A visual gesture reference guide

---

## Why it's architected this way

**Client-side hand detection, not server-side.** MediaPipe runs entirely in
the browser (JavaScript/WASM), extracting 21 hand landmarks per frame. The
server never touches a video frame — it only ever receives small arrays of
numbers. This was a deliberate pivot from an original FastAPI + React +
server-side OpenCV/MediaPipe design, made necessary by free-tier hosting RAM
constraints (512MB). Moving detection to the browser meant the backend only
needs to run a small PyTorch model, dropping server memory usage
dramatically and collapsing what would have been two services (API +
frontend) into a single lightweight Flask app.

**Landmarks, not images, as model input.** The PyTorch model (`GestureNet`)
is a small feedforward network operating on 42 numbers (21 landmarks × x, y)
— not a CNN operating on pixels. This keeps the model tiny, fast, and
explainable, since MediaPipe has already done the heavy lifting of hand
detection.

**Dropped Z-depth entirely.** Early versions used x, y, and z per landmark.
During development, mixing self-collected data (real z values) with the
HaGRID dataset (no z data, fabricated as zero) taught the model a spurious
shortcut: it learned to associate "z ≈ 0" with HaGRID-derived gesture
classes rather than genuine gesture shape, causing live misclassification.
The fix was standardizing on 2D (x, y) landmarks only, applied identically
during training and inference via a shared `app/ai/normalize.py` module.

**Wrist-centered, scale-invariant normalization.** Landmarks are translated
so the wrist is the origin, then scaled by wrist-to-middle-finger-knuckle
distance. This makes the model invariant to hand position in frame and
distance from camera — necessary once combining close-up self-collected
data with HaGRID's far-away source photos.

---

## Tech stack

| Layer | Technology |
|---|---|
| Hand detection | MediaPipe Hands (JavaScript/WASM, client-side) |
| Model | PyTorch (custom feedforward network) |
| Backend | Flask (serves both the API and the frontend) |
| Frontend | Vanilla JavaScript, HTML, CSS (no framework, no build step) |
| Text-to-Speech | Web Speech API (browser-native) |
| Translation | MyMemory Translation API (on-demand only) |

---

## Project structure
SignSpeak-AI/
├── app/
│   ├── main.py                  Flask app factory
│   ├── routes/                  View routes + /predict API
│   ├── ai/                      Model, inference, normalization
│   ├── static/
│   │   ├── css/                 Single stylesheet
│   │   ├── js/                  All frontend logic (modular, no build step)
│   │   └── images/               App icon, gesture reference guide
│   └── templates/               index.html
├── data/
│   ├── raw/                     Collected + converted gesture CSVs
│   ├── processed/               Train/test splits
│   └── labels.json              Label-to-index mapping
├── models/final/                 Trained model weights
├── scripts/                      Data collection, preprocessing, training
└── docs/                         Additional documentation

---

## Setup

**Requirements:** Python 3.10+ (tested on 3.14), a webcam, a modern browser.

```bash
git clone <your-repo-url>
cd SignSpeak-AI
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # macOS/Linux

pip install -r requirements.txt
python run.py
```

Open `http://127.0.0.1:5000` in your browser.

**To retrain the model from scratch:**
```bash
python scripts/preprocess_data.py
python scripts/train_model.py
```

---

## Model performance

Trained on 38 gesture classes (~14,800 samples after merging self-collected
and HaGRID-derived data), achieving **~89% test accuracy** after 150 epochs.
Accuracy is highest on the self-collected letters (A–E) and gestures with
visually distinct hand shapes; some confusion exists between visually
similar classes (e.g. multiple "three-finger" variants).

---

## Known limitations

This system performs **isolated gesture recognition** — it recognizes one
static, held hand shape at a time and composes recognized gestures into
text. It does **not** model:
- Motion between signs (many real sign-language words involve movement, not
  a static pose)
- Non-manual grammatical markers (facial expression, head tilt)
- Natural sign-language grammar or word order

Full **Continuous Sign Language Recognition (CSLR)** — translating fluid,
natural signing the way a human interpreter would — is an open research
problem requiring sequence models and large annotated video corpora, and is
out of scope for this project. This project is best understood as a
gesture-to-text composer, not a full sign-language interpreter.

Letter coverage is currently limited to **A–E** (self-collected) — deliberately
not extended further to avoid visual collisions with the HaGRID gesture
vocabulary already in the model.

---

## Dataset credit

Gesture data combines:
- **Self-collected data** (letters A–E) via this project's own in-browser
  collection tool (`scripts/preprocess_data.py`, Data Tools tab)
- **HaGRID (HAnd Gesture Recognition Image Dataset)** — landmark annotations
  for 33 everyday gesture classes. HaGRID is licensed under Creative Commons
  Attribution-ShareAlike 4.0 International. One gesture class (offensive
  content) was deliberately excluded from this project.

---

## Acknowledgements

Built as part of the Advanced AI Summer Internship program at
**Medi-Caps University**, in collaboration with **IBM ICE**.