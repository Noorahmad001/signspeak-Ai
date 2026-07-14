"""
Phase 5: Train the gesture classification model.
Loads processed train/test CSVs (42 x,y features), trains GestureNet,
evaluates, and saves the model.
"""

import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import json
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader

from app.ai.model import GestureNet

TRAIN_PATH = "data/processed/train.csv"
TEST_PATH = "data/processed/test.csv"
LABELS_PATH = "data/labels.json"
MODEL_SAVE_PATH = "models/final/gesture_model.pth"

BATCH_SIZE = 32
EPOCHS = 150
LEARNING_RATE = 0.001


class GestureDataset(Dataset):
    def __init__(self, csv_path):
        df = pd.read_csv(csv_path)
        self.X = torch.tensor(df.drop(columns=["label_encoded"]).values, dtype=torch.float32)
        self.y = torch.tensor(df["label_encoded"].values, dtype=torch.long)

    def __len__(self):
        return len(self.y)

    def __getitem__(self, idx):
        return self.X[idx], self.y[idx]


def evaluate(model, loader, device):
    model.eval()
    correct = 0
    total = 0
    with torch.no_grad():
        for X_batch, y_batch in loader:
            X_batch, y_batch = X_batch.to(device), y_batch.to(device)
            outputs = model(X_batch)
            predictions = torch.argmax(outputs, dim=1)
            correct += (predictions == y_batch).sum().item()
            total += y_batch.size(0)
    return correct / total


def main():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    with open(LABELS_PATH) as f:
        label_map = json.load(f)
    num_classes = len(label_map)
    print(f"Classes ({num_classes}): {label_map}")

    train_dataset = GestureDataset(TRAIN_PATH)
    test_dataset = GestureDataset(TEST_PATH)

    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True)
    test_loader = DataLoader(test_dataset, batch_size=BATCH_SIZE, shuffle=False)

    model = GestureNet(input_size=42, hidden_size=128, num_classes=num_classes).to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=LEARNING_RATE)

    best_test_acc = 0.0

    for epoch in range(1, EPOCHS + 1):
        model.train()
        running_loss = 0.0

        for X_batch, y_batch in train_loader:
            X_batch, y_batch = X_batch.to(device), y_batch.to(device)

            optimizer.zero_grad()
            outputs = model(X_batch)
            loss = criterion(outputs, y_batch)
            loss.backward()
            optimizer.step()

            running_loss += loss.item()

        if epoch % 10 == 0 or epoch == 1:
            avg_loss = running_loss / len(train_loader)
            train_acc = evaluate(model, train_loader, device)
            test_acc = evaluate(model, test_loader, device)
            best_test_acc = max(best_test_acc, test_acc)
            print(f"Epoch {epoch:3d}/{EPOCHS} | Loss: {avg_loss:.4f} | "
                  f"Train Acc: {train_acc:.4f} | Test Acc: {test_acc:.4f}")

    final_test_acc = evaluate(model, test_loader, device)
    print(f"\nFinal Test Accuracy: {final_test_acc:.4f}")
    print(f"Best Test Accuracy seen during training: {max(best_test_acc, final_test_acc):.4f}")

    torch.save({
        "model_state_dict": model.state_dict(),
        "input_size": 42,
        "hidden_size": 128,
        "num_classes": num_classes,
        "label_map": label_map
    }, MODEL_SAVE_PATH)

    print(f"Model saved to {MODEL_SAVE_PATH}")


if __name__ == "__main__":
    main()