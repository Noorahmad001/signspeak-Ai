"""
Converts HaGRID landmark-annotation JSON files into the same CSV format
used by our own collected gesture data (label + 63 landmark values).
Excludes offensive gestures.
"""

import os
import json
import csv

HAGRID_RAW_DIR = "data/hagrid_raw"
OUTPUT_CSV = "data/raw/hagrid_converted.csv"

ALLOWED_CLASSES = {
    "like": "thumbs_up",
    "dislike": "thumbs_down",
    "ok": "ok",
    "palm": "stop",
    "fist": "fist",
    "peace": "peace",
    "peace_inverted": "peace_inverted",
    "rock": "rock_on",
    "call": "call_me",
    "one": "one",
    "two_up": "two",
    "two_up_inverted": "two_inverted",
    "three": "three",
    "three2": "three_alt",
    "three3": "three_alt2",
    "three_gun": "three_gun",
    "four": "four",
    "mute": "mute",
    "stop": "stop_sign",
    "stop_inverted": "stop_inverted",
    "grabbing": "grabbing",
    "grip": "grip",
    "hand_heart": "hand_heart",
    "hand_heart2": "hand_heart2",
    "holy": "holy",
    "little_finger": "little_finger",
    "point": "point",
    "take_picture": "take_picture",
    "thumb_index": "thumb_index",
    "thumb_index2": "thumb_index2",
    "timeout": "timeout",
    "xsign": "xsign",
    "no_gesture": "no_gesture",
}

MAX_SAMPLES_PER_CLASS = 400


def flatten_landmarks(landmark_pairs):
    flat = []
    for x, y in landmark_pairs:
        flat.extend([x, y, 0.0])
    return flat


def main():
    os.makedirs("data/raw", exist_ok=True)
    rows = []

    for filename in os.listdir(HAGRID_RAW_DIR):
        if not filename.endswith(".json"):
            continue

        gesture_key = filename.replace(".json", "")
        if gesture_key not in ALLOWED_CLASSES:
            print(f"Skipping {filename} (not in allowed list)")
            continue

        label = ALLOWED_CLASSES[gesture_key]
        filepath = os.path.join(HAGRID_RAW_DIR, filename)

        with open(filepath, "r") as f:
            data = json.load(f)

        count_for_this_class = 0
        for image_id, annotation in data.items():
            if count_for_this_class >= MAX_SAMPLES_PER_CLASS:
                break

            hand_landmarks_list = annotation.get("hand_landmarks", [])
            labels_list = annotation.get("labels", [])

            for hand_landmarks, hand_label in zip(hand_landmarks_list, labels_list):
                if hand_label != gesture_key:
                    continue
                if len(hand_landmarks) != 21:
                    continue

                flat = flatten_landmarks(hand_landmarks)
                rows.append([label] + flat)
                count_for_this_class += 1
                break

        print(f"{gesture_key} -> {label}: {count_for_this_class} samples")

    header = ["label"] + [f"{axis}{i}" for i in range(21) for axis in ("x", "y", "z")]

    with open(OUTPUT_CSV, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(header)
        writer.writerows(rows)

    print(f"\nSaved {len(rows)} total samples to {OUTPUT_CSV}")


if __name__ == "__main__":
    main()