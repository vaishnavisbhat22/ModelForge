import numpy as np
from drift import calculate_psi, classify_drift


# Reference data = data the model was trained/validated on
reference_data = np.array([
    10, 12, 11, 13, 12,
    14, 11, 10, 13, 12
])

# Production data = recent real-world model input
production_data = np.array([
    20, 22, 21, 19, 23,
    21, 20, 24, 22, 21
])


psi = calculate_psi(
    reference_data,
    production_data
)

print("================================")
print("ModelForge Drift Detection")
print("================================")
print(f"PSI Score: {psi:.4f}")
print(f"Drift Status: {classify_drift(psi)}")
print("================================")