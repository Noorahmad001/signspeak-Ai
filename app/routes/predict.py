"""
Phase 6/10: /predict API route with defensive error handling.
"""

from flask import Blueprint, request, jsonify
from app.ai.inference import predict, is_model_loaded
from app.schemas.prediction import validate_landmarks_payload

predict_bp = Blueprint("predict", __name__)


@predict_bp.route("/predict", methods=["POST"])
def predict_gesture():
    if not is_model_loaded():
        return jsonify({"error": "Model is not loaded on the server. Please try again shortly."}), 503

    data = request.get_json(silent=True)

    if data is None:
        return jsonify({"error": "Request body must be valid JSON."}), 400

    is_valid, error_message = validate_landmarks_payload(data)
    if not is_valid:
        return jsonify({"error": error_message}), 400

    landmarks = data["landmarks"]

    try:
        label, confidence = predict(landmarks)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": "Internal prediction error. Please try again."}), 500

    return jsonify({
        "gesture": label,
        "confidence": round(confidence, 4)
    })