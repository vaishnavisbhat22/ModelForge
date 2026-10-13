import os
from typing import Dict, Any

import joblib
import numpy as np
import pandas as pd

try:
    import shap
except ImportError:
    shap = None


def explain_model(
    model_path: str,
    data_path: str,
    max_features: int = 10
) -> Dict[str, Any]:
    """
    Generate global feature importance using SHAP.

    Parameters
    ----------
    model_path:
        Path to a saved sklearn/joblib model.

    data_path:
        Path to a CSV dataset.

    max_features:
        Maximum number of features returned.

    Returns
    -------
    Dict containing model explanation and feature importance.
    """

    # ---------------------------------------------------------
    # 1. Validate SHAP
    # ---------------------------------------------------------

    if shap is None:
        raise ImportError(
            "SHAP is not installed. Run: pip install shap"
        )

    # ---------------------------------------------------------
    # 2. Validate files
    # ---------------------------------------------------------

    if not os.path.isfile(model_path):
        raise FileNotFoundError(
            f"Model file not found: {model_path}"
        )

    if not os.path.isfile(data_path):
        raise FileNotFoundError(
            f"Dataset file not found: {data_path}"
        )

    # ---------------------------------------------------------
    # 3. Load model
    # ---------------------------------------------------------

    model = joblib.load(model_path)

    # ---------------------------------------------------------
    # 4. Load dataset
    # ---------------------------------------------------------

    df = pd.read_csv(data_path)

    if df.empty:
        raise ValueError("Dataset is empty.")

    # ---------------------------------------------------------
    # 5. Identify feature columns
    # ---------------------------------------------------------

    target_columns = {
        "target",
        "label",
        "y",
        "prediction",
        "class"
    }

    feature_columns = [
        column
        for column in df.columns
        if column.lower() not in target_columns
    ]

    if not feature_columns:
        raise ValueError(
            "No feature columns found in dataset."
        )

    X = df[feature_columns].copy()

    # ---------------------------------------------------------
    # 6. Encode categorical features
    # ---------------------------------------------------------

    X = pd.get_dummies(
        X,
        drop_first=False
    )

    # Handle infinity / missing values
    X = X.replace(
        [np.inf, -np.inf],
        np.nan
    )

    X = X.fillna(0)

    # Make sure all values are numeric
    X = X.apply(
        pd.to_numeric,
        errors="coerce"
    ).fillna(0)

    # Limit data used for expensive explanation
    X_explain = X.head(200)

    # ---------------------------------------------------------
    # 7. Create SHAP explainer
    # ---------------------------------------------------------

    shap_values = None

    try:
        explainer = shap.Explainer(
            model,
            X_explain
        )

        shap_values = explainer(
            X_explain
        )

    except Exception:
        # -----------------------------------------------------
        # KernelExplainer fallback
        # -----------------------------------------------------

        if not hasattr(model, "predict"):
            raise ValueError(
                "Model does not provide a predict method."
            )

        background = shap.sample(
            X_explain,
            min(50, len(X_explain))
        )

        kernel_explainer = shap.KernelExplainer(
            model.predict,
            background
        )

        shap_values = kernel_explainer.shap_values(
            X_explain.head(50)
        )

    # ---------------------------------------------------------
    # 8. Extract SHAP values
    # ---------------------------------------------------------

    if hasattr(shap_values, "values"):

        values = np.asarray(
            shap_values.values
        )

        # samples × features × classes
        if values.ndim == 3:
            values = np.mean(
                np.abs(values),
                axis=2
            )

        # samples × features
        importance = np.mean(
            np.abs(values),
            axis=0
        )

    elif isinstance(shap_values, list):

        # Multiple output classes
        arrays = [
            np.asarray(value)
            for value in shap_values
        ]

        values = np.stack(arrays)

        importance = np.mean(
            np.abs(values),
            axis=tuple(
                range(values.ndim - 1)
            )
        )

    else:

        values = np.asarray(
            shap_values
        )

        if values.ndim == 3:
            values = np.mean(
                np.abs(values),
                axis=2
            )

        importance = np.mean(
            np.abs(values),
            axis=0
        )

    # ---------------------------------------------------------
    # 9. Validate dimensions
    # ---------------------------------------------------------

    importance = np.asarray(
        importance
    ).flatten()

    feature_names = list(
        X.columns
    )

    if len(importance) != len(feature_names):

        # Keep only the overlapping portion
        size = min(
            len(importance),
            len(feature_names)
        )

        importance = importance[:size]
        feature_names = feature_names[:size]

    # ---------------------------------------------------------
    # 10. Build importance table
    # ---------------------------------------------------------

    importance_table = [
        {
            "feature": feature_names[index],
            "importance": round(
                float(importance[index]),
                6
            )
        }
        for index in range(
            len(feature_names)
        )
    ]

    # Sort highest importance first
    importance_table.sort(
        key=lambda item: item["importance"],
        reverse=True
    )

    # Limit features
    importance_table = importance_table[
        :max_features
    ]

    # ---------------------------------------------------------
    # 11. Normalize importance
    # ---------------------------------------------------------

    total_importance = sum(
        item["importance"]
        for item in importance_table
    )

    if total_importance > 0:

        for item in importance_table:
            item["importance_percentage"] = round(
                (
                    item["importance"]
                    / total_importance
                ) * 100,
                2
            )

    else:

        for item in importance_table:
            item["importance_percentage"] = 0.0

    # ---------------------------------------------------------
    # 12. Return API-friendly response
    # ---------------------------------------------------------

    return {
        "model_path": model_path,
        "data_path": data_path,
        "samples_analyzed": len(X_explain),
        "features_analyzed": len(feature_names),
        "top_features": importance_table
    }