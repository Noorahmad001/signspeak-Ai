"""
Phase 6/10: Load the trained model once and provide a predict() function.
Handles missing model file gracefully instead of crashing the whole app.
"""

import os
import torch
import torch.nn.functional as F
from app.ai.model import GestureNet
from app.ai.normalize import normalize_landmarks_xy, extract_xy_from_xyz

MODEL_PATH = "models/final/gesture_model.pth"

_model = None
_label_map = None
_index_to_label = None
_device = torch.device("cpu")
_load_error = None


def load_model():
    global _model, _label_map, _index_to_label, _load_error

    if not os.path.exists(MODEL_PATH):
        _load_error = f"Model file not found at {MODEL_PATH}. Run scripts/train_model.py first."
        print(f"WARNING: {_load_error}")
        return

    try:
        checkpoint = torch.load(MODEL_PATH, map_location=_device)

        _model = GestureNet(
            input_size=checkpoint["input_size"],
            hidden_size=checkpoint["hidden_size"],
            num_classes=checkpoint["num_classes"]
        )
        _model.load_state_dict(checkpoint["model_state_dict"])
        _model.to(_device)
        _model.eval()

        _label_map = checkpoint["label_map"]
        _index_to_label = {v: k for k, v in _label_map.items()}

        print(f"Model loaded successfully. Classes: {len(_label_map)}")
    except Exception as e:
        _load_error = f"Failed to load model: {e}"
        print(f"ERROR: {_load_error}")


def is_model_loaded():
    return _model is not None


def predict(landmarks):
    if _model is None:
        raise RuntimeError(_load_error or "Model not loaded.")

    if len(landmarks) != 63:
        raise ValueError(f"Expected 63 landmark values, got {len(landmarks)}.")

    if not all(isinstance(v, (int, float)) for v in landmarks):
        raise ValueError("All landmark values must be numbers.")

    xy_only = extract_xy_from_xyz(landmarks)
    normalized = normalize_landmarks_xy(xy_only)

    x = torch.tensor([normalized], dtype=torch.float32).to(_device)

    with torch.no_grad():
        outputs = _model(x)
        probabilities = F.softmax(outputs, dim=1)
        confidence, predicted_idx = torch.max(probabilities, dim=1)

    predicted_label = _index_to_label[predicted_idx.item()]
    return predicted_label, confidence.item()