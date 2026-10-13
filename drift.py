import numpy as np


def calculate_psi(reference, production, bins=10):
    """
    Calculate Population Stability Index (PSI).

    PSI interpretation:
    < 0.10       -> No significant drift
    0.10 - 0.25  -> Moderate drift
    > 0.25       -> Significant drift
    """

    reference = np.asarray(reference, dtype=float)
    production = np.asarray(production, dtype=float)

    if len(reference) == 0 or len(production) == 0:
        raise ValueError("Input data cannot be empty")

    # Create bins from the reference distribution
    breakpoints = np.percentile(
        reference,
        np.linspace(0, 100, bins + 1)
    )

    # Remove duplicate breakpoints
    breakpoints = np.unique(breakpoints)

    if len(breakpoints) < 2:
        return 0.0

    # Calculate frequency distributions
    reference_counts, _ = np.histogram(
        reference,
        bins=breakpoints
    )

    production_counts, _ = np.histogram(
        production,
        bins=breakpoints
    )

    # Convert counts to proportions
    reference_pct = reference_counts / len(reference)
    production_pct = production_counts / len(production)

    # Prevent division by zero
    epsilon = 1e-6

    reference_pct = np.clip(
        reference_pct,
        epsilon,
        None
    )

    production_pct = np.clip(
        production_pct,
        epsilon,
        None
    )

    # PSI formula
    psi = np.sum(
        (production_pct - reference_pct)
        * np.log(production_pct / reference_pct)
    )

    return float(psi)


def classify_drift(psi):
    """
    Classify drift severity.
    """

    if psi < 0.10:
        return "none"

    elif psi < 0.25:
        return "moderate"

    else:
        return "high"