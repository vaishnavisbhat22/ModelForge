import { useEffect, useState } from "react";
import { getModels, checkDrift, type Model, type DriftResult } from "../api";

function Dashboard() {
  const [models, setModels] = useState<Model[]>([]);
  const [driftResults, setDriftResults] = useState<
    Record<number, DriftResult>
  >({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const data = await getModels();
        setModels(data);

        // Run drift checks for all registered models
        const results: Record<number, DriftResult> = {};

        await Promise.all(
          data.map(async (model) => {
            try {
              const result = await checkDrift(model.id);
              results[model.id] = result;
            } catch {
              // Ignore models for which drift cannot be calculated
            }
          })
        );

        setDriftResults(results);
      } catch (error) {
        console.error("Failed to load dashboard:", error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const totalModels = models.length;

  const productionModels = models.filter(
    (model) => model.status === "production"
  ).length;

  const driftChecks = Object.keys(driftResults).length;

  const highDrift = Object.values(driftResults).filter(
    (result) => result.drift_status === "high"
  ).length;

  if (loading) {
    return <div className="dashboard-page">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>
            Monitor model health, drift, and production status
          </p>
        </div>
      </div>

      {/* Statistics */}
      <div className="stats-grid">

        <div className="stat-card">
          <span>Total Models</span>
          <strong>{totalModels}</strong>
          <small>Registered in ModelForge</small>
        </div>

        <div className="stat-card">
          <span>Production</span>
          <strong>{productionModels}</strong>
          <small>Models currently deployed</small>
        </div>

        <div className="stat-card">
          <span>Drift Checks</span>
          <strong>{driftChecks}</strong>
          <small>Models analyzed</small>
        </div>

        <div className="stat-card">
          <span>High Drift</span>
          <strong>{highDrift}</strong>
          <small>Requires attention</small>
        </div>

      </div>

      {/* Recent Models */}
      <div className="dashboard-section">
        <div className="section-header">
          <h3>Recent models</h3>
        </div>

        {models.length === 0 ? (
          <p>No models registered.</p>
        ) : (
          <div className="model-list">

            {models.map((model) => {
              const drift = driftResults[model.id];

              return (
                <div className="dashboard-model" key={model.id}>

                  <div>
                    <h3>{model.name}</h3>

                    <p>
                      v{model.version} · {model.framework}
                    </p>
                  </div>

                  <div>
                    <span className="model-status">
                      {model.status}
                    </span>

                    {drift && (
                      <span
                        className={
                          drift.drift_status === "high"
                            ? "drift-high"
                            : drift.drift_status === "moderate"
                            ? "drift-moderate"
                            : "drift-none"
                        }
                      >
                        {drift.drift_status}
                      </span>
                    )}
                  </div>

                </div>
              );
            })}

          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;