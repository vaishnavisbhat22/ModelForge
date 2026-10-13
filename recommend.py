from typing import Any


def generate_recommendations(
    drift_result: dict[str, Any] | None = None,
    performance_result: dict[str, Any] | None = None,
    explanation_result: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    """
    Generate actionable ML engineering recommendations
    from ModelForge monitoring results.
    """

    recommendations: list[dict[str, Any]] = []

    # =====================================================
    # DRIFT ANALYSIS
    # =====================================================

    if drift_result:

        psi = float(drift_result.get("psi", 0))

        drift_status = str(
            drift_result.get("drift_status", "")
        ).lower()

        if drift_status == "high" or psi >= 0.25:

            recommendations.append({
                "category": "Drift",
                "severity": "high",
                "title": "High feature drift detected",
                "message": (
                    f"The model is experiencing significant "
                    f"distribution shift (PSI: {psi:.4f}). "
                    "Investigate changes in production feature "
                    "distributions and compare them with the "
                    "training baseline."
                ),
                "action": (
                    "Investigate production data quality and "
                    "consider retraining the model with recent "
                    "representative data."
                ),
            })

        elif drift_status == "medium" or psi >= 0.10:

            recommendations.append({
                "category": "Drift",
                "severity": "medium",
                "title": "Moderate feature drift detected",
                "message": (
                    f"Moderate distribution shift has been "
                    f"detected (PSI: {psi:.4f}). "
                    "The model should be monitored closely "
                    "for further degradation."
                ),
                "action": (
                    "Continue monitoring the affected features "
                    "and investigate whether the shift is persistent."
                ),
            })

        else:

            recommendations.append({
                "category": "Drift",
                "severity": "low",
                "title": "No significant drift detected",
                "message": (
                    f"Feature distributions remain relatively "
                    f"stable (PSI: {psi:.4f})."
                ),
                "action": (
                    "Continue regular drift monitoring."
                ),
            })

    # =====================================================
    # PERFORMANCE ANALYSIS
    # =====================================================

    if performance_result:

        performance = performance_result.get(
            "performance",
            performance_result
        )

        accuracy = float(
            performance.get("accuracy", 0)
        )

        precision = float(
            performance.get("precision", 0)
        )

        recall = float(
            performance.get("recall", 0)
        )

        f1 = float(
            performance.get("f1", 0)
        )

        # -------------------------------------------------
        # LOW RECALL
        # -------------------------------------------------

        if recall < 0.70:

            recommendations.append({
                "category": "Performance",
                "severity": "high",
                "title": "Low recall detected",
                "message": (
                    f"Model recall is {recall:.2%}. "
                    "A significant number of positive cases "
                    "may be missed."
                ),
                "action": (
                    "Investigate false negatives, evaluate the "
                    "classification threshold, and consider "
                    "retraining with more representative "
                    "positive samples."
                ),
            })

        # -------------------------------------------------
        # LOW PRECISION
        # -------------------------------------------------

        if precision < 0.70:

            recommendations.append({
                "category": "Performance",
                "severity": "medium",
                "title": "Low precision detected",
                "message": (
                    f"Model precision is {precision:.2%}. "
                    "The model may be generating too many "
                    "false positive predictions."
                ),
                "action": (
                    "Analyze false positives and evaluate "
                    "whether classification threshold "
                    "optimization can improve precision."
                ),
            })

        # -------------------------------------------------
        # LOW F1
        # -------------------------------------------------

        if f1 < 0.70:

            recommendations.append({
                "category": "Performance",
                "severity": "high",
                "title": "Low F1 score",
                "message": (
                    f"The model's F1 score is {f1:.2%}, "
                    "indicating a weak balance between "
                    "precision and recall."
                ),
                "action": (
                    "Review the training data, feature quality, "
                    "class distribution, and model hyperparameters."
                ),
            })

        # -------------------------------------------------
        # HEALTHY PERFORMANCE
        # -------------------------------------------------

        if (
            accuracy >= 0.80
            and precision >= 0.80
            and recall >= 0.80
            and f1 >= 0.80
        ):

            recommendations.append({
                "category": "Performance",
                "severity": "low",
                "title": "Model performance is healthy",
                "message": (
                    f"The model currently demonstrates strong "
                    f"performance with an accuracy of "
                    f"{accuracy:.2%} and F1 score of {f1:.2%}."
                ),
                "action": (
                    "Continue monitoring performance against "
                    "production data."
                ),
            })

    # =====================================================
    # EXPLAINABILITY ANALYSIS
    # =====================================================

    if explanation_result:

        explanation = explanation_result.get(
            "explanation",
            explanation_result
        )

        top_features = explanation.get(
            "top_features",
            []
        )

        if top_features:

            strongest_feature = top_features[0]

            feature_name = strongest_feature.get(
                "feature",
                "unknown"
            )

            importance = float(
                strongest_feature.get(
                    "importance_percentage",
                    0
                )
            )

            if importance >= 30:

                recommendations.append({
                    "category": "Explainability",
                    "severity": "medium",
                    "title": "Strong feature dependency detected",
                    "message": (
                        f"'{feature_name}' contributes approximately "
                        f"{importance:.2f}% of the model's feature "
                        "importance."
                    ),
                    "action": (
                        "Validate this feature for data leakage, "
                        "stability, and production availability."
                    ),
                })

    # =====================================================
    # CROSS-SIGNAL ANALYSIS
    # =====================================================

    if drift_result and performance_result:

        drift_status = str(
            drift_result.get(
                "drift_status",
                ""
            )
        ).lower()

        performance = performance_result.get(
            "performance",
            performance_result
        )

        f1 = float(
            performance.get("f1", 0)
        )

        if drift_status == "high" and f1 < 0.70:

            recommendations.insert(
                0,
                {
                    "category": "Model Health",
                    "severity": "critical",
                    "title": "Drift and performance degradation detected",
                    "message": (
                        "The model is experiencing significant "
                        "distribution shift while also showing "
                        "weak predictive performance."
                    ),
                    "action": (
                        "Prioritize investigation of production "
                        "data quality and evaluate model retraining "
                        "using recent representative data."
                    ),
                },
            )

    # =====================================================
    # FALLBACK
    # =====================================================

    if not recommendations:

        recommendations.append({
            "category": "Model Health",
            "severity": "low",
            "title": "Insufficient monitoring data",
            "message": (
                "Run drift detection, performance analysis, "
                "or explainability analysis to generate "
                "model-specific recommendations."
            ),
            "action": (
                "Run the available ModelForge monitoring checks."
            ),
        })

    return recommendations