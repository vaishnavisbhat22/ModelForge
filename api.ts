const API_URL = "http://127.0.0.1:8000";

/* =========================================================
   TYPES
   ========================================================= */

export interface Model {
  id: number;
  name: string;
  version: string;
  framework: string;
  status: string;
  created_at: string;
}

export interface ModelInput {
  name: string;
  version: string;
  framework: string;
  status: string;
}

export interface DriftResult {
  model_id: number;
  model_name: string;
  psi: number;
  drift_status: string;
}

export interface ExplanationFeature {
  feature: string;
  importance: number;
  importance_percentage: number;
}

export interface ExplanationResult {
  model_id: number;
  model_name: string;
  version: string;
  framework: string;
  explanation: {
    model_path: string;
    data_path: string;
    samples_analyzed: number;
    features_analyzed: number;
    top_features: ExplanationFeature[];
  };
}

export interface PerformanceResult {
  model_id: number;
  model_name: string;
  version: string;
  framework: string;
  performance: {
    accuracy: number;
    precision: number;
    recall: number;
    f1: number;
    samples_analyzed: number;
    confusion_matrix: number[][];
  };
}

/* =========================================================
   RECOMMENDATIONS
   ========================================================= */

export interface Recommendation {
  category: string;
  severity: string;
  title: string;
  message: string;
  action: string;
}

export interface RecommendationResult {
  model_id: number;
  model_name: string;
  version: string;
  recommendations: Recommendation[];
}

/* =========================================================
   GET MODELS
   ========================================================= */

export async function getModels(): Promise<Model[]> {
  const response = await fetch(`${API_URL}/models`);

  if (!response.ok) {
    throw new Error("Failed to fetch models");
  }

  return response.json();
}

/* =========================================================
   CREATE MODEL
   ========================================================= */

export async function createModel(
  model: ModelInput
): Promise<Model> {
  const response = await fetch(`${API_URL}/models`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(model),
  });

  if (!response.ok) {
    let message = "Failed to create model";

    try {
      const error = await response.json();

      if (error.detail) {
        message = error.detail;
      }
    } catch {
      // Keep default error
    }

    throw new Error(message);
  }

  const data = await response.json();

  return data.model;
}

/* =========================================================
   UPDATE MODEL
   ========================================================= */

export async function updateModel(
  id: number,
  model: ModelInput
): Promise<Model> {
  const response = await fetch(
    `${API_URL}/models/${id}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(model),
    }
  );

  if (!response.ok) {
    let message = "Failed to update model";

    try {
      const error = await response.json();

      if (error.detail) {
        message = error.detail;
      }
    } catch {
      // Keep default error
    }

    throw new Error(message);
  }

  const data = await response.json();

  return data.model;
}

/* =========================================================
   DELETE MODEL
   ========================================================= */

export async function deleteModel(
  id: number
): Promise<void> {
  const response = await fetch(
    `${API_URL}/models/${id}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    let message = "Failed to delete model";

    try {
      const error = await response.json();

      if (error.detail) {
        message = error.detail;
      }
    } catch {
      // Keep default error
    }

    throw new Error(message);
  }
}

/* =========================================================
   DRIFT CHECK
   ========================================================= */

export async function checkDrift(
  id: number
): Promise<DriftResult> {
  const response = await fetch(
    `${API_URL}/models/${id}/drift`,
    {
      method: "POST",
    }
  );

  if (!response.ok) {
    let message = "Failed to check drift";

    try {
      const error = await response.json();

      if (error.detail) {
        message = error.detail;
      }
    } catch {
      // Keep default error
    }

    throw new Error(message);
  }

  return response.json();
}

/* =========================================================
   PERFORMANCE
   ========================================================= */

export async function getPerformance(
  id: number,
  modelPath: string,
  dataPath: string,
  targetColumn: string = "target"
): Promise<PerformanceResult> {
  const response = await fetch(
    `${API_URL}/models/${id}/performance`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model_path: modelPath,
        data_path: dataPath,
        target_column: targetColumn,
      }),
    }
  );

  if (!response.ok) {
    let message = "Failed to calculate performance";

    try {
      const error = await response.json();

      if (error.detail) {
        message = error.detail;
      }
    } catch {
      // Keep default error
    }

    throw new Error(message);
  }

  return response.json();
}

/* =========================================================
   EXPLAINABILITY / SHAP
   ========================================================= */

export async function explainModel(
  id: number,
  modelPath: string,
  dataPath: string,
  maxFeatures: number = 10
): Promise<ExplanationResult> {
  const response = await fetch(
    `${API_URL}/models/${id}/explain`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model_path: modelPath,
        data_path: dataPath,
        max_features: maxFeatures,
      }),
    }
  );

  if (!response.ok) {
    let message = "Failed to generate explanation";

    try {
      const error = await response.json();

      if (error.detail) {
        message = error.detail;
      }
    } catch {
      // Keep default error
    }

    throw new Error(message);
  }

  return response.json();
}

/* =========================================================
   AI RECOMMENDATIONS
   ========================================================= */

export async function getRecommendations(
  id: number,
  driftResult?: object,
  performanceResult?: object,
  explanationResult?: object
): Promise<RecommendationResult> {
  const response = await fetch(
    `${API_URL}/models/${id}/recommendations`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        drift_result: driftResult ?? null,
        performance_result:
          performanceResult ?? null,
        explanation_result:
          explanationResult ?? null,
      }),
    }
  );

  if (!response.ok) {
    let message =
      "Failed to generate recommendations";

    try {
      const error = await response.json();

      if (error.detail) {
        message = error.detail;
      }
    } catch {
      // Keep default error
    }

    throw new Error(message);
  }

  return response.json();
}