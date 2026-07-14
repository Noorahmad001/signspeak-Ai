"""
Phase 6: Simple validation helper for incoming prediction requests.
"""


def validate_landmarks_payload(data):
    """
    Validates that incoming JSON has a 'landmarks' key with exactly 63 numbers.
    Returns (is_valid: bool, error_message: str or None)
    """
    if not data or "landmarks" not in data:
        return False, "Missing 'landmarks' field in request."

    landmarks = data["landmarks"]

    if not isinstance(landmarks, list):
        return False, "'landmarks' must be a list."

    if len(landmarks) != 63:
        return False, f"Expected 63 landmark values, got {len(landmarks)}."

    if not all(isinstance(v, (int, float)) for v in landmarks):
        return False, "All landmark values must be numbers."

    return True, None