from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix
)


def calculate_performance(
    y_true,
    y_pred
):
    """
    Calculate classification performance metrics.
    """

    if len(y_true) != len(y_pred):
        raise ValueError(
            "y_true and y_pred must have the same length"
        )

    if len(y_true) == 0:
        raise ValueError(
            "Prediction data cannot be empty"
        )

    accuracy = accuracy_score(
        y_true,
        y_pred
    )

    precision = precision_score(
        y_true,
        y_pred,
        average="weighted",
        zero_division=0
    )

    recall = recall_score(
        y_true,
        y_pred,
        average="weighted",
        zero_division=0
    )

    f1 = f1_score(
        y_true,
        y_pred,
        average="weighted",
        zero_division=0
    )

    matrix = confusion_matrix(
        y_true,
        y_pred
    )

    return {
        "accuracy": round(float(accuracy), 4),
        "precision": round(float(precision), 4),
        "recall": round(float(recall), 4),
        "f1_score": round(float(f1), 4),
        "confusion_matrix": matrix.tolist()
    }