"""
Normalizes hand landmarks to be invariant to hand position in frame
and distance from camera. Uses only x, y (no z) since one of our data
sources (HaGRID) never provides reliable depth information — mixing
real z values with fabricated zeros created a misleading shortcut
for the model to exploit.
"""

import math


def normalize_landmarks_xy(flat_xy):
    """
    flat_xy: list of 42 floats [x0,y0, x1,y1, ..., x20,y20]
    Returns: normalized list of 42 floats
    """
    points = [(flat_xy[i], flat_xy[i + 1]) for i in range(0, 42, 2)]

    wrist = points[0]
    translated = [(p[0] - wrist[0], p[1] - wrist[1]) for p in points]

    mcp = translated[9]  # middle finger MCP — stable hand-size reference
    scale = math.sqrt(mcp[0] ** 2 + mcp[1] ** 2)
    if scale < 1e-6:
        scale = 1e-6

    normalized = [(p[0] / scale, p[1] / scale) for p in translated]

    flat_result = []
    for p in normalized:
        flat_result.extend(p)
    return flat_result


def extract_xy_from_xyz(flat_xyz):
    """Given 63 numbers [x0,y0,z0, x1,y1,z1, ...], returns just the 42 x,y values."""
    xy = []
    for i in range(0, 63, 3):
        xy.append(flat_xyz[i])
        xy.append(flat_xyz[i + 1])
    return xy