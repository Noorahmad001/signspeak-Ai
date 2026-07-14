"""
Phase 5: Neural network architecture for gesture classification.
Input: 42 numbers (21 landmarks x, y only — z excluded, see normalize.py).
Output: raw scores (logits), one per gesture class.
"""

import torch.nn as nn


class GestureNet(nn.Module):
    def __init__(self, input_size=42, hidden_size=128, num_classes=5):
        super(GestureNet, self).__init__()

        self.network = nn.Sequential(
            nn.Linear(input_size, hidden_size),
            nn.ReLU(),
            nn.Dropout(0.3),

            nn.Linear(hidden_size, hidden_size),
            nn.ReLU(),
            nn.Dropout(0.3),

            nn.Linear(hidden_size, num_classes)
        )

    def forward(self, x):
        return self.network(x)