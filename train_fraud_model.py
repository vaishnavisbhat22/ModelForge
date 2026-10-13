import os
import joblib
import numpy as np
import pandas as pd

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split


# --------------------------------------------------
# Paths
# --------------------------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DATA_DIR = os.path.join(BASE_DIR, "data")
MODEL_DIR = os.path.join(BASE_DIR, "models")

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(MODEL_DIR, exist_ok=True)


# --------------------------------------------------
# Generate reproducible fraud dataset
# --------------------------------------------------

np.random.seed(42)

n_samples = 2000

df = pd.DataFrame({
    "transaction_amount": np.random.exponential(150, n_samples),
    "transaction_count": np.random.poisson(5, n_samples),
    "account_age_days": np.random.randint(10, 2500, n_samples),
    "device_risk": np.random.uniform(0, 1, n_samples),
    "international": np.random.randint(0, 2, n_samples),
    "hour": np.random.randint(0, 24, n_samples),
})


# --------------------------------------------------
# Generate realistic fraud signal
# --------------------------------------------------

fraud_score = (
    (df["transaction_amount"] > 500).astype(int) * 2
    + (df["device_risk"] > 0.7).astype(int) * 2
    + (df["international"] == 1).astype(int)
    + (df["transaction_count"] > 10).astype(int)
    + (df["hour"].isin([0, 1, 2, 3, 4])).astype(int)
)

probability = 1 / (1 + np.exp(-(fraud_score - 3)))

df["target"] = (
    np.random.random(n_samples) < probability
).astype(int)


# --------------------------------------------------
# Save dataset
# --------------------------------------------------

data_path = os.path.join(
    DATA_DIR,
    "fraud_data.csv"
)

df.to_csv(data_path, index=False)


# --------------------------------------------------
# Train model
# --------------------------------------------------

features = [
    "transaction_amount",
    "transaction_count",
    "account_age_days",
    "device_risk",
    "international",
    "hour",
]

X = df[features]
y = df["target"]


X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y,
)


model = RandomForestClassifier(
    n_estimators=150,
    max_depth=8,
    random_state=42,
    class_weight="balanced",
)

model.fit(X_train, y_train)


# --------------------------------------------------
# Save model
# --------------------------------------------------

model_path = os.path.join(
    MODEL_DIR,
    "fraud_detector.pkl"
)

joblib.dump(model, model_path)


print("====================================")
print("Fraud model created successfully")
print("====================================")
print(f"Dataset : {data_path}")
print(f"Model   : {model_path}")
print(f"Samples : {len(df)}")
print(f"Features: {len(features)}")
print(f"Fraud cases: {df['target'].sum()}")