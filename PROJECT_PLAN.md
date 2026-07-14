# SignSpeak AI — Development Roadmap & Project Log

An AI-powered real-time Sign Language Gesture-to-Text Translator, built as an
Advanced AI Summer Internship project for Medi-Caps University in collaboration
with IBM ICE.

---

## Original 10-Phase Roadmap (Foundation)

- [x] **Phase 1: Project Planning & Environment Setup**
  Git, virtual environment, dependency installation, folder structure.

- [x] **Phase 2: Real-Time Hand Detection**
  MediaPipe.js integrated client-side; live webcam feed with 21-landmark
  detection rendered on a canvas overlay.

- [x] **Phase 3: Dataset Collection**
  Browser-based collection tool — hold spacebar to capture labeled landmark
  samples, exported as CSV. Self-collected 5 gesture classes (A–E).

- [x] **Phase 4: Data Preprocessing**
  Merges raw CSVs, encodes labels, validates data, splits into train/test sets.
  Later extended with wrist-centered, scale-invariant normalization (see
  Architecture Decisions below).

- [x] **Phase 5: Model Training (PyTorch)**
  `GestureNet` — a 3-layer MLP with Dropout regularization, trained using
  CrossEntropyLoss + Adam optimizer.

- [x] **Phase 6: Real-Time Inference**
  Flask `/predict` endpoint serving the trained PyTorch model; live predictions
  streamed from the browser during webcam use.

- [x] **Phase 7: Sentence Builder + Text-to-Speech**
  Prediction smoothing (streak + confidence thresholding), sentence
  construction, and browser-native Text-to-Speech.

- [x] **Phases 8–9: Backend + Frontend Integration**
  *Architecturally merged into a single Flask app* — see Architecture
  Decisions below for why this deviated from the original separate
  FastAPI + React plan.

- [ ] **Phase 10: Testing, Documentation, Deployment**
  In progress — see Remaining Work below.

---

## Extended Feature Set (Beyond Original Scope)

Built after the core pipeline was validated end-to-end:

- [x] **Expanded gesture vocabulary via HaGRID dataset** — merged 33 public
  gesture classes (thumbs up/down, OK, peace, stop, rock-on, counting
  gestures, etc.) with the 5 self-collected letters, for 38 total classes.
  Offensive gesture classes were deliberately excluded.
- [x] **Two-hand detection** — both hands tracked and classified
  independently; Hand 1 commits to the sentence, Hand 2 displays for
  reference (avoids ambiguous double-commits).
- [x] **Emoji reactions** — each recognized gesture shows a corresponding
  emoji live on screen.
- [x] **Color-coded confidence bar** — visual (not just numeric) confidence
  feedback per hand.
- [x] **Auto-space** — a pause in hand detection automatically inserts a
  space in the sentence.
- [x] **Dual voice Text-to-Speech** — male/female voice selection using the
  Web Speech API's available system voices.
- [x] **Auto-speak** — each newly committed gesture is spoken immediately;
  manual Speak button remains for replaying the full sentence.
- [x] **On-camera overlay UI** — predictions, confidence, and the sentence
  box are all rendered directly on the camera view, so nothing requires
  scrolling during live use.
- [x] **Gesture reference guide** — an in-app modal listing every
  supported gesture with its emoji, so users know the model's vocabulary.
- [x] **Video upload translation** — users can upload a pre-recorded video;
  it's processed client-side (MediaPipe.js + the same `/predict` pipeline)
  and translated into a sentence, reusing the existing smoothing logic.

---

## Key Architecture Decisions

**1. Client-side MediaPipe instead of server-side (Flask + JS, not FastAPI +
React + server-side OpenCV/MediaPipe).**
Originally planned as separate FastAPI backend + React frontend, with
MediaPipe/OpenCV processing video server-side. Pivoted early because the
deployment target (Render free tier, 512MB RAM) could not reliably support
PyTorch + MediaPipe + OpenCV running simultaneously server-side. Moving hand
detection into the browser (MediaPipe.js) meant the server only ever handles
small landmark arrays and a lightweight PyTorch model — reducing server RAM
usage dramatically and eliminating the two-service deployment split
entirely. This is why Phases 8–9 (originally "FastAPI backend" and "React
frontend" as separate efforts) collapsed into a single Flask app serving
both.

**2. Dropped Z-depth entirely; standardized on 2D (x, y) landmarks.**
Discovered during testing: HaGRID's published landmark annotations only
include x, y (no z), while our own MediaPipe.js-collected data included real
z values. Training on a mixed dataset where z was real for some classes and
fabricated (zero) for others taught the model a spurious shortcut — it
learned to associate "z ≈ 0" with HaGRID-derived classes rather than
learning genuine gesture shape, causing live misclassification of every
HaGRID-sourced gesture. Fixed by dropping z entirely and standardizing on
42 normalized (x, y) features for all data sources, applied identically in
both training (`preprocess_data.py`) and inference (`inference.py`) via a
shared `app/ai/normalize.py` module.

**3. Wrist-centered, scale-invariant normalization.**
Landmarks are translated so the wrist is the origin, then scaled by the
distance from wrist to middle-finger MCP joint. This makes the model
invariant to the hand's position in frame and distance from the camera —
necessary once combining our own close-up webcam captures with HaGRID's
far-away photos, which otherwise produced very different raw coordinate
magnitudes for the same physical gesture.

**4. Exclusion of offensive gesture classes.**
The HaGRID dataset includes one gesture class considered obscene/offensive.
This class is explicitly excluded in `scripts/convert_hagrid.py`'s
allow-list, and any attempt to introduce such labels into self-collected
data has been treated as a data-quality issue to be removed before training,
not a feature to support.

---

## Known Limitations (documented deliberately, not hidden)

- **Isolated gesture recognition, not continuous sign language.** The
  system recognizes one static, held hand shape at a time and composes
  recognized gestures into a sentence. It does not model motion between
  signs, non-manual grammatical markers (facial expression, head tilt), or
  natural sign-language grammar/word order — this is the difference between
  isolated gesture classification (what this project does) and Continuous
  Sign Language Recognition / CSLR (an open research problem requiring
  sequence models and large annotated video corpora, out of scope for this
  project's timeline).
- **Live accuracy is sensitive to camera distance/angle variation not well
  represented in training data.** Self-collected data came from a single
  recording session/setup; broader accuracy would benefit from additional
  collection sessions across varied lighting, angles, and distances.
- **HaGRID-derived samples lack true depth (z) information**, addressed by
  dropping z entirely (see Architecture Decisions), which is a reasonable
  tradeoff but means the model cannot use depth as a discriminating feature
  even where it might help distinguish visually similar gestures.

---

## Remaining Work (Phase 10)

- [ ] Error handling pass (malformed uploads, camera permission denial,
      empty video processing, network failures)
- [ ] Final README with setup instructions, screenshots, and architecture
      diagram
- [ ] Deployment to Render (free tier)
- [ ] Final accuracy/robustness pass — optionally collect additional
      self-recorded samples across varied conditions
- [ ] Licensing note for HaGRID dataset usage (CC BY-SA 4.0) in documentation