import { useEffect, useState, type FormEvent } from "react";

import {
  getModels,
  createModel,
  updateModel,
  deleteModel,
  checkDrift,
  explainModel,
  getPerformance,
  getRecommendations,
  type Model,
  type ModelInput,
  type DriftResult,
  type ExplanationResult,
  type PerformanceResult,
  type RecommendationResult,
} from "./api";

import "./App.css";

/* =========================================================
   PAGE TYPES
   ========================================================= */

type Page =
  | "dashboard"
  | "models"
  | "drift"
  | "performance"
  | "explainability"
  | "recommendations"
  | "details";

/* =========================================================
   DEFAULT FORM
   ========================================================= */

const emptyForm: ModelInput = {
  name: "",
  version: "1.0",
  framework: "scikit-learn",
  status: "staging",
};

/* =========================================================
   APP
   ========================================================= */

function App() {
  /* =======================================================
     MODEL STATE
     ======================================================= */

  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* =======================================================
     NAVIGATION
     ======================================================= */

  const [page, setPage] = useState<Page>("dashboard");

  const [selectedModel, setSelectedModel] =
    useState<Model | null>(null);

  /* =======================================================
     MODEL FORM
     ======================================================= */

  const [showForm, setShowForm] = useState(false);

  const [editingId, setEditingId] =
    useState<number | null>(null);

  const [form, setForm] =
    useState<ModelInput>(emptyForm);

  const [saving, setSaving] = useState(false);

  /* =======================================================
     SEARCH
     ======================================================= */

  const [search, setSearch] = useState("");

  /* =======================================================
     DRIFT
     ======================================================= */

  const [driftResults, setDriftResults] =
    useState<Record<number, DriftResult>>({});

  const [driftLoading, setDriftLoading] =
    useState<number | null>(null);

  /* =======================================================
     EXPLAINABILITY
     ======================================================= */

  const [explanation, setExplanation] =
    useState<ExplanationResult | null>(null);

  const [explainLoading, setExplainLoading] =
    useState(false);

  /* =======================================================
     PERFORMANCE
     ======================================================= */

  const [performance, setPerformance] =
    useState<PerformanceResult | null>(null);

  const [performanceLoading, setPerformanceLoading] =
    useState(false);

  /* =======================================================
     RECOMMENDATIONS
     ======================================================= */

  const [recommendations, setRecommendations] =
    useState<RecommendationResult | null>(null);

  const [recommendationLoading, setRecommendationLoading] =
    useState(false);

  /* =======================================================
     MODEL / DATA PATHS
     ======================================================= */

  const [modelPath, setModelPath] =
    useState("models/fraud_detector.pkl");

  const [dataPath, setDataPath] =
    useState("data/fraud_data.csv");

  /* =======================================================
     LOAD MODELS
     ======================================================= */

  async function loadModels() {
    try {
      setError("");

      const data = await getModels();

      setModels(data);
    } catch {
      setError(
        "Could not connect to ModelForge API."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadModels();
  }, []);

  /* =======================================================
     NAVIGATION
     ======================================================= */

  function navigate(nextPage: Page) {
    setPage(nextPage);
  }

  /* =======================================================
     OPEN MODEL
     ======================================================= */

  function openModel(model: Model) {
    setSelectedModel(model);

    setPage("details");

    setExplanation(null);
    setPerformance(null);
    setRecommendations(null);
  }

  /* =======================================================
     SELECT MODEL
     ======================================================= */

  function selectModel(model: Model) {
    setSelectedModel(model);

    setExplanation(null);
    setPerformance(null);
    setRecommendations(null);
  }

  /* =======================================================
     CREATE MODEL
     ======================================================= */

  function openCreateForm() {
    setEditingId(null);

    setForm(emptyForm);

    setShowForm(true);
  }

  /* =======================================================
     EDIT MODEL
     ======================================================= */

  function openEditForm(model: Model) {
    setEditingId(model.id);

    setForm({
      name: model.name,
      version: model.version,
      framework: model.framework,
      status: model.status,
    });

    setShowForm(true);
  }

  /* =======================================================
     CLOSE FORM
     ======================================================= */

  function closeForm() {
    setShowForm(false);

    setEditingId(null);

    setForm(emptyForm);
  }

  /* =======================================================
     CREATE / UPDATE MODEL
     ======================================================= */

  async function handleSubmit(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!form.name.trim()) {
      return;
    }

    try {
      setSaving(true);
      setError("");

      if (editingId === null) {
        await createModel(form);
      } else {
        await updateModel(editingId, form);
      }

      closeForm();

      await loadModels();
    } catch {
      setError(
        "Could not save model. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =======================================================
     DELETE MODEL
     ======================================================= */

  async function handleDelete(id: number) {
    const confirmed = window.confirm(
      "Delete this model from ModelForge?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      await deleteModel(id);

      if (selectedModel?.id === id) {
        setSelectedModel(null);
        setExplanation(null);
        setPerformance(null);
        setRecommendations(null);
        setPage("models");
      }

      setDriftResults((previous) => {
        const next = { ...previous };
        delete next[id];
        return next;
      });

      await loadModels();
    } catch {
      setError("Could not delete model.");
    }
  }

  /* =======================================================
     DRIFT ANALYSIS
     ======================================================= */

  async function runDrift(model: Model) {
    try {
      setDriftLoading(model.id);
      setError("");

      const result = await checkDrift(model.id);

      setDriftResults((previous) => ({
        ...previous,
        [model.id]: result,
      }));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Could not calculate drift for ${model.name}.`
      );
    } finally {
      setDriftLoading(null);
    }
  }

  /* =======================================================
     SHAP EXPLANATION
     ======================================================= */

  async function runExplanation() {
    if (!selectedModel) {
      return;
    }

    try {
      setExplainLoading(true);
      setError("");

      const result = await explainModel(
        selectedModel.id,
        modelPath,
        dataPath,
        10
      );

      setExplanation(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not generate explanation."
      );
    } finally {
      setExplainLoading(false);
    }
  }

  /* =======================================================
     PERFORMANCE ANALYSIS
     ======================================================= */

  async function runPerformance() {
    if (!selectedModel) {
      return;
    }

    try {
      setPerformanceLoading(true);
      setError("");

      const result = await getPerformance(
        selectedModel.id,
        modelPath,
        dataPath,
        "target"
      );

      setPerformance(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not calculate model performance."
      );
    } finally {
      setPerformanceLoading(false);
    }
  }

  /* =======================================================
     RECOMMENDATIONS
     ======================================================= */

  async function runRecommendations() {
    if (!selectedModel) {
      return;
    }

    try {
      setRecommendationLoading(true);
      setError("");

      const result = await getRecommendations(
  selectedModel.id,
  driftResults[selectedModel.id] ?? null,
  performance ?? undefined,
  explanation ?? undefined
);

      setRecommendations(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not generate recommendations."
      );
    } finally {
      setRecommendationLoading(false);
    }
  }

  /* =======================================================
     FILTERED MODELS
     ======================================================= */

  const filteredModels = models.filter((model) => {
    const query = search.toLowerCase();

    return (
      model.name.toLowerCase().includes(query) ||
      model.framework.toLowerCase().includes(query) ||
      model.status.toLowerCase().includes(query)
    );
  });

  /* =======================================================
     DASHBOARD METRICS
     ======================================================= */

  const productionModels = models.filter(
    (model) => model.status === "production"
  );

  const highDriftModels = Object.values(
    driftResults
  ).filter(
    (result) => result.drift_status === "high"
  );

  /* =======================================================
     STATUS CLASS
     ======================================================= */

  function getDriftClass(status?: string) {
    if (!status) {
      return "neutral";
    }

    if (status === "high") {
      return "danger";
    }

    if (
      status === "medium" ||
      status === "moderate"
    ) {
      return "warning";
    }

    return "success";
  }

  /* =======================================================
     RECOMMENDATION SEVERITY CLASS
     ======================================================= */

  function getRecommendationClass(
    severity?: string
  ) {
    if (!severity) {
      return "neutral";
    }

    if (severity === "critical" || severity === "high") {
      return "danger";
    }

    if (severity === "medium") {
      return "warning";
    }

    return "success";
  }

  /* =======================================================
     SIDEBAR
     ======================================================= */

  function renderSidebar() {
    return (
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">M</div>

          <div>
            <div className="brand-name">
              ModelForge
            </div>

            <div className="brand-version">
              ML OBSERVABILITY
            </div>
          </div>
        </div>

        <div className="sidebar-label">
          WORKSPACE
        </div>

        <nav className="nav">
          {/* DASHBOARD */}

          <button
            className={`nav-item ${
              page === "dashboard"
                ? "active"
                : ""
            }`}
            onClick={() =>
              navigate("dashboard")
            }
          >
            <span className="nav-icon">
              ⌂
            </span>

            Dashboard
          </button>

          {/* MODELS */}

          <button
            className={`nav-item ${
              page === "models" ||
              page === "details"
                ? "active"
                : ""
            }`}
            onClick={() =>
              navigate("models")
            }
          >
            <span className="nav-icon">
              ◈
            </span>

            Models

            <span className="nav-count">
              {models.length}
            </span>
          </button>

          {/* DRIFT */}

          <button
            className={`nav-item ${
              page === "drift"
                ? "active"
                : ""
            }`}
            onClick={() =>
              navigate("drift")
            }
          >
            <span className="nav-icon">
              ⌁
            </span>

            Drift
          </button>

          {/* PERFORMANCE */}

          <button
            className={`nav-item ${
              page === "performance"
                ? "active"
                : ""
            }`}
            onClick={() =>
              navigate("performance")
            }
          >
            <span className="nav-icon">
              ◒
            </span>

            Performance
          </button>

          {/* EXPLAINABILITY */}

          <button
            className={`nav-item ${
              page === "explainability"
                ? "active"
                : ""
            }`}
            onClick={() =>
              navigate("explainability")
            }
          >
            <span className="nav-icon">
              ✦
            </span>

            Explainability
          </button>

          {/* RECOMMENDATIONS */}

          <button
            className={`nav-item ${
              page === "recommendations"
                ? "active"
                : ""
            }`}
            onClick={() =>
              navigate("recommendations")
            }
          >
            <span className="nav-icon">
              ✧
            </span>

            Recommendations
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="system-status">
            <span className="status-dot" />

            <div>
              <strong>
                API Connected
              </strong>

              <span>
                localhost:8000
              </span>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  /* =======================================================
     DASHBOARD
     ======================================================= */

  function renderDashboard() {
    return (
      <>
        <header className="page-header">
          <div>
            <div className="eyebrow">
              MODEL OBSERVABILITY
            </div>

            <h1>
              Good evening.
            </h1>

            <p>
              Monitor your ML systems before
              they become production problems.
            </p>
          </div>

          <button
            className="primary-btn"
            onClick={openCreateForm}
          >
            <span>+</span>
            Register Model
          </button>
        </header>

        <section className="hero-card">
          <div>
            <span className="hero-label">
              MODELFORGE OVERVIEW
            </span>

            <h2>
              Your models,
              <br />
              under control.
            </h2>

            <p>
              Track model health, detect
              distribution drift and understand
              prediction behavior from one
              workspace.
            </p>
          </div>

          <div className="hero-orbit">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />

            <div className="orbit-core">
              <span>MF</span>
            </div>
          </div>
        </section>

        <section className="stats-grid">
          {/* TOTAL MODELS */}

          <div className="stat-card">
            <div className="stat-top">
              <span>
                Total Models
              </span>

              <span className="stat-icon">
                ◈
              </span>
            </div>

            <strong>
              {models.length}
            </strong>

            <small>
              Registered in ModelForge
            </small>
          </div>

          {/* PRODUCTION */}

          <div className="stat-card">
            <div className="stat-top">
              <span>
                Production
              </span>

              <span className="stat-icon">
                ●
              </span>
            </div>

            <strong>
              {productionModels.length}
            </strong>

            <small>
              Models currently deployed
            </small>
          </div>

          {/* DRIFT */}

          <div className="stat-card">
            <div className="stat-top">
              <span>
                Drift Checks
              </span>

              <span className="stat-icon">
                ⌁
              </span>
            </div>

            <strong>
              {Object.keys(
                driftResults
              ).length}
            </strong>

            <small>
              Models analyzed
            </small>
          </div>

          {/* HIGH DRIFT */}

          <div className="stat-card">
            <div className="stat-top">
              <span>
                High Drift
              </span>

              <span className="stat-icon danger-text">
                !
              </span>
            </div>

            <strong className="danger-text">
              {highDriftModels.length}
            </strong>

            <small>
              Requires attention
            </small>
          </div>
        </section>

        <section className="content-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">
                REGISTRY
              </span>

              <h2>
                Recent models
              </h2>
            </div>

            <button
              className="text-btn"
              onClick={() =>
                navigate("models")
              }
            >
              View all →
            </button>
          </div>

          {models.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                ◈
              </div>

              <h3>
                No models yet
              </h3>

              <p>
                Register your first model to
                start monitoring it.
              </p>

              <button
                className="primary-btn"
                onClick={openCreateForm}
              >
                Register Model
              </button>
            </div>
          ) : (
            <div className="model-list">
              {models
                .slice(0, 4)
                .map((model) => (
                  <ModelRow
                    key={model.id}
                    model={model}
                    drift={
                      driftResults[
                        model.id
                      ]
                    }
                    onOpen={openModel}
                    onEdit={openEditForm}
                    onDelete={handleDelete}
                    onDrift={runDrift}
                    driftLoading={
                      driftLoading ===
                      model.id
                    }
                  />
                ))}
            </div>
          )}
        </section>
      </>
    );
  }

  /* =======================================================
     MODELS
     ======================================================= */

  function renderModels() {
    return (
      <>
        <header className="page-header">
          <div>
            <div className="eyebrow">
              MODEL REGISTRY
            </div>

            <h1>
              Models
            </h1>

            <p>
              Manage every model registered
              with ModelForge.
            </p>
          </div>

          <button
            className="primary-btn"
            onClick={openCreateForm}
          >
            <span>+</span>
            Register Model
          </button>
        </header>

        <div className="toolbar">
          <div className="search-box">
            <span>⌕</span>

            <input
              placeholder="Search models, frameworks..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />
          </div>

          <div className="toolbar-count">
            {filteredModels.length} models
          </div>
        </div>

        {filteredModels.length === 0 ? (
          <div className="empty-state large">
            <div className="empty-icon">
              ⌕
            </div>

            <h3>
              No matching models
            </h3>

            <p>
              Try another search or register
              a new model.
            </p>
          </div>
        ) : (
          <div className="models-grid">
            {filteredModels.map(
              (model) => (
                <div
                  className="model-tile"
                  key={model.id}
                  onClick={() =>
                    openModel(model)
                  }
                >
                  <div className="tile-top">
                    <div className="model-avatar">
                      {model.name
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <span
                      className={`status-pill ${model.status}`}
                    >
                      {model.status}
                    </span>
                  </div>

                  <h3>
                    {model.name}
                  </h3>

                  <p>
                    v{model.version} ·{" "}
                    {model.framework}
                  </p>

                  <div className="tile-divider" />

                  <div className="tile-bottom">
                    <span>
                      ID #{model.id}
                    </span>

                    <span>
                      →
                    </span>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </>
    );
  }

  /* =======================================================
     MODEL DETAILS
     ======================================================= */

  function renderDetails() {
    if (!selectedModel) {
      navigate("models");
      return null;
    }

    const drift =
      driftResults[
        selectedModel.id
      ];

    return (
      <>
        <button
          className="back-btn"
          onClick={() =>
            navigate("models")
          }
        >
          ← Back to Models
        </button>

        <header className="detail-header">
          <div className="detail-title">
            <div className="large-avatar">
              {selectedModel.name
                .charAt(0)
                .toUpperCase()}
            </div>

            <div>
              <div className="eyebrow">
                MODEL #{selectedModel.id}
              </div>

              <h1>
                {selectedModel.name}
              </h1>

              <p>
                v{selectedModel.version} ·{" "}
                {selectedModel.framework}
              </p>
            </div>
          </div>

          <span
            className={`status-pill ${selectedModel.status}`}
          >
            {selectedModel.status}
          </span>
        </header>

        <section className="detail-grid">
          {/* MODEL METADATA */}

          <div className="content-card">
            <div className="section-heading">
              <div>
                <span className="eyebrow">
                  OVERVIEW
                </span>

                <h2>
                  Model metadata
                </h2>
              </div>
            </div>

            <div className="metadata-grid">
              <MetaItem
                label="Model name"
                value={
                  selectedModel.name
                }
              />

              <MetaItem
                label="Version"
                value={
                  selectedModel.version
                }
              />

              <MetaItem
                label="Framework"
                value={
                  selectedModel.framework
                }
              />

              <MetaItem
                label="Environment"
                value={
                  selectedModel.status
                }
              />

              <MetaItem
                label="Created"
                value={new Date(
                  selectedModel.created_at
                ).toLocaleDateString()}
              />

              <MetaItem
                label="Registry ID"
                value={`#${selectedModel.id}`}
              />
            </div>
          </div>

          {/* DRIFT */}

          <div className="content-card">
            <div className="section-heading">
              <div>
                <span className="eyebrow">
                  DRIFT
                </span>

                <h2>
                  Health check
                </h2>
              </div>

              {drift && (
                <span
                  className={`status-pill ${getDriftClass(
                    drift.drift_status
                  )}`}
                >
                  {drift.drift_status}
                </span>
              )}
            </div>

            {!drift ? (
              <div className="action-panel">
                <div className="big-action-icon">
                  ⌁
                </div>

                <p>
                  Run a PSI analysis against
                  the reference and production
                  distributions.
                </p>

                <button
                  className="primary-btn"
                  onClick={() =>
                    runDrift(
                      selectedModel
                    )
                  }
                  disabled={
                    driftLoading ===
                    selectedModel.id
                  }
                >
                  {driftLoading ===
                  selectedModel.id
                    ? "Analyzing..."
                    : "Run Drift Check"}
                </button>
              </div>
            ) : (
              <div className="drift-result">
                <div className="psi-number">
                  {drift.psi.toFixed(4)}
                </div>

                <span className="psi-label">
                  Population Stability Index
                </span>

                <div className="psi-meter">
                  <div
                    className={`psi-fill ${getDriftClass(
                      drift.drift_status
                    )}`}
                    style={{
                      width: `${Math.min(
                        drift.psi * 5,
                        100
                      )}%`,
                    }}
                  />
                </div>

                <div className="psi-scale">
                  <span>
                    0 · Stable
                  </span>

                  <span>
                    0.2 · Warning
                  </span>

                  <span>
                    0.5+ · High
                  </span>
                </div>

                <button
                  className="secondary-btn"
                  onClick={() =>
                    runDrift(
                      selectedModel
                    )
                  }
                >
                  Run again
                </button>
              </div>
            )}
          </div>
        </section>

        {/* MONITORING ACTIONS */}

        <section className="content-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">
                MONITORING
              </span>

              <h2>
                Analyze this model
              </h2>
            </div>
          </div>

          <div className="detail-actions">
            <button
              className="secondary-btn"
              onClick={() =>
                navigate("performance")
              }
            >
              Performance →
            </button>

            <button
              className="secondary-btn"
              onClick={() =>
                navigate("explainability")
              }
            >
              Explainability →
            </button>

            <button
              className="secondary-btn"
              onClick={() =>
                navigate("recommendations")
              }
            >
              Recommendations →
            </button>
          </div>
        </section>

        {/* EXPLAINABILITY PREVIEW */}

        <section className="content-card explain-preview">
          <div className="section-heading">
            <div>
              <span className="eyebrow">
                EXPLAINABILITY
              </span>

              <h2>
                Understand model behavior
              </h2>
            </div>

            <button
              className="secondary-btn"
              onClick={() =>
                navigate(
                  "explainability"
                )
              }
            >
              Open Explainability →
            </button>
          </div>

          <p className="section-description">
            Use SHAP-based feature attribution
            to identify which features contribute
            most to your model's predictions.
          </p>
        </section>

        {/* ACTIONS */}

        <div className="detail-actions">
          <button
            className="secondary-btn"
            onClick={() =>
              openEditForm(
                selectedModel
              )
            }
          >
            Edit Model
          </button>

          <button
            className="danger-btn"
            onClick={() =>
              handleDelete(
                selectedModel.id
              )
            }
          >
            Delete Model
          </button>
        </div>
      </>
    );
  }

  /* =======================================================
     DRIFT PAGE
     ======================================================= */

  function renderDrift() {
    return (
      <>
        <header className="page-header">
          <div>
            <div className="eyebrow">
              DISTRIBUTION MONITORING
            </div>

            <h1>
              Drift monitoring
            </h1>

            <p>
              Detect changes in model input
              distributions using PSI.
            </p>
          </div>
        </header>

        <div className="info-banner">
          <span className="info-icon">
            i
          </span>

          <div>
            <strong>
              Population Stability Index
            </strong>

            <p>
              PSI measures how significantly
              the production distribution differs
              from a reference distribution.
            </p>
          </div>
        </div>

        {models.length === 0 ? (
          <div className="empty-state large">
            <div className="empty-icon">
              ⌁
            </div>

            <h3>
              No models registered
            </h3>

            <p>
              Register a model before running
              drift analysis.
            </p>

            <button
              className="primary-btn"
              onClick={openCreateForm}
            >
              Register Model
            </button>
          </div>
        ) : (
          <div className="drift-grid">
            {models.map((model) => {
              const result =
                driftResults[
                  model.id
                ];

              return (
                <div
                  className="drift-card"
                  key={model.id}
                >
                  <div className="drift-card-top">
                    <div>
                      <span className="eyebrow">
                        MODEL #{model.id}
                      </span>

                      <h3>
                        {model.name}
                      </h3>

                      <p>
                        v{model.version} ·{" "}
                        {model.framework}
                      </p>
                    </div>

                    {result && (
                      <span
                        className={`status-pill ${getDriftClass(
                          result.drift_status
                        )}`}
                      >
                        {result.drift_status}
                      </span>
                    )}
                  </div>

                  {result ? (
                    <div className="drift-score">
                      <div>
                        <span className="score-label">
                          PSI SCORE
                        </span>

                        <strong>
                          {result.psi.toFixed(
                            4
                          )}
                        </strong>
                      </div>

                      <div className="mini-meter">
                        <div
                          className={`mini-fill ${getDriftClass(
                            result.drift_status
                          )}`}
                          style={{
                            width: `${Math.min(
                              result.psi * 5,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="not-analyzed">
                      <span>
                        Not analyzed yet
                      </span>
                    </div>
                  )}

                  <div className="drift-card-actions">
                    <button
                      className="secondary-btn"
                      onClick={() =>
                        runDrift(model)
                      }
                      disabled={
                        driftLoading ===
                        model.id
                      }
                    >
                      {driftLoading ===
                      model.id
                        ? "Analyzing..."
                        : result
                        ? "Recheck"
                        : "Analyze drift"}
                    </button>

                    <button
                      className="ghost-btn"
                      onClick={() =>
                        openModel(model)
                      }
                    >
                      Details →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </>
    );
  }

  /* =======================================================
     PERFORMANCE PAGE
     ======================================================= */

  function renderPerformance() {
    return (
      <>
        <header className="page-header">
          <div>
            <div className="eyebrow">
              MODEL PERFORMANCE
            </div>

            <h1>
              Performance
            </h1>

            <p>
              Evaluate model predictions using
              standard classification metrics.
            </p>
          </div>
        </header>

        {!selectedModel ? (
          <div className="content-card">
            <div className="section-heading">
              <div>
                <span className="eyebrow">
                  SELECT MODEL
                </span>

                <h2>
                  Choose a model to evaluate
                </h2>
              </div>
            </div>

            {models.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  ◈
                </div>

                <h3>
                  No models registered
                </h3>

                <p>
                  Register a model before
                  running performance analysis.
                </p>

                <button
                  className="primary-btn"
                  onClick={
                    openCreateForm
                  }
                >
                  Register Model
                </button>
              </div>
            ) : (
              <div className="models-grid">
                {models.map(
                  (model) => (
                    <button
                      className="select-model-card"
                      key={model.id}
                      onClick={() =>
                        selectModel(model)
                      }
                    >
                      <div className="model-avatar">
                        {model.name
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div>
                        <strong>
                          {model.name}
                        </strong>

                        <span>
                          v{model.version} ·{" "}
                          {model.framework}
                        </span>
                      </div>

                      <span>
                        →
                      </span>
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* SELECTED MODEL */}

            <div className="content-card">
              <div className="selected-model-banner">
                <div className="model-avatar">
                  {selectedModel.name
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div>
                  <span className="eyebrow">
                    EVALUATING
                  </span>

                  <h3>
                    {selectedModel.name}
                  </h3>
                </div>

                <button
                  className="ghost-btn"
                  onClick={() => {
                    setSelectedModel(null);
                    setPerformance(null);
                    setRecommendations(null);
                  }}
                >
                  Change model
                </button>
              </div>

              <div className="path-grid">
                <label>
                  <span>
                    Model file
                  </span>

                  <input
                    value={modelPath}
                    onChange={(e) =>
                      setModelPath(
                        e.target.value
                      )
                    }
                    placeholder="models/fraud_detector.pkl"
                  />
                </label>

                <label>
                  <span>
                    Dataset
                  </span>

                  <input
                    value={dataPath}
                    onChange={(e) =>
                      setDataPath(
                        e.target.value
                      )
                    }
                    placeholder="data/fraud_data.csv"
                  />
                </label>
              </div>

              <button
                className="primary-btn"
                onClick={
                  runPerformance
                }
                disabled={
                  performanceLoading
                }
              >
                {performanceLoading
                  ? "Calculating performance..."
                  : "Run Performance Analysis"}
              </button>
            </div>

            {/* PERFORMANCE RESULTS */}

            {performance && (
              <>
                <section className="stats-grid">
                  {/* ACCURACY */}

                  <div className="stat-card">
                    <div className="stat-top">
                      <span>
                        Accuracy
                      </span>

                      <span className="stat-icon">
                        ◉
                      </span>
                    </div>

                    <strong>
                      {(
                        performance.performance
                          .accuracy * 100
                      ).toFixed(2)}
                      %
                    </strong>

                    <small>
                      Overall prediction
                      accuracy
                    </small>
                  </div>

                  {/* PRECISION */}

                  <div className="stat-card">
                    <div className="stat-top">
                      <span>
                        Precision
                      </span>

                      <span className="stat-icon">
                        +
                      </span>
                    </div>

                    <strong>
                      {(
                        performance.performance
                          .precision * 100
                      ).toFixed(2)}
                      %
                    </strong>

                    <small>
                      Prediction precision
                    </small>
                  </div>

                  {/* RECALL */}

                  <div className="stat-card">
                    <div className="stat-top">
                      <span>
                        Recall
                      </span>

                      <span className="stat-icon">
                        ↗
                      </span>
                    </div>

                    <strong>
                      {(
                        performance.performance
                          .recall * 100
                      ).toFixed(2)}
                      %
                    </strong>

                    <small>
                      Detection sensitivity
                    </small>
                  </div>

                  {/* F1 */}

                  <div className="stat-card">
                    <div className="stat-top">
                      <span>
                        F1 Score
                      </span>

                      <span className="stat-icon">
                        F
                      </span>
                    </div>

                    <strong>
                      {(() => {
                        const matrix =
                          performance.performance
                            .confusion_matrix;

                        const tp = matrix?.[1]?.[1] ?? 0;
                        const fp = matrix?.[0]?.[1] ?? 0;
                        const fn = matrix?.[1]?.[0] ?? 0;

                        const denominator =
                          2 * tp + fp + fn;

                        const f1 =
                          denominator > 0
                            ? (2 * tp) / denominator
                            : 0;

                        return `${(f1 * 100).toFixed(2)}%`;
                      })()}
                    </strong>

                    <small>
                      Precision-recall balance
                    </small>
                  </div>
                </section>

                {/* CONFUSION MATRIX */}

                <section className="content-card">
                  <div className="section-heading">
                    <div>
                      <span className="eyebrow">
                        CONFUSION MATRIX
                      </span>

                      <h2>
                        Prediction breakdown
                      </h2>
                    </div>
                  </div>

                  <div className="confusion-matrix">
                    {performance.performance.confusion_matrix.map(
                      (
                        row,
                        rowIndex
                      ) =>
                        row.map(
                          (
                            value,
                            columnIndex
                          ) => (
                            <div
                              className="matrix-cell"
                              key={`${rowIndex}-${columnIndex}`}
                            >
                              <span>
                                {rowIndex ===
                                  0 &&
                                columnIndex ===
                                  0
                                  ? "True Negative"
                                  : rowIndex ===
                                      0 &&
                                    columnIndex ===
                                      1
                                  ? "False Positive"
                                  : rowIndex ===
                                      1 &&
                                    columnIndex ===
                                      0
                                  ? "False Negative"
                                  : "True Positive"}
                              </span>

                              <strong>
                                {value}
                              </strong>
                            </div>
                          )
                        )
                    )}
                  </div>

                  {/* FIXED SAMPLE COUNT */}

                  <p className="section-description">
                    Evaluated on{" "}
                    {(
                     performance.performance.samples_analyzed ?? 0).toLocaleString()}{" "}
                    samples.
                  </p>
                </section>

                {/* PERFORMANCE ACTIONS */}

                <div className="detail-actions">
                  <button
                    className="secondary-btn"
                    onClick={
                      runPerformance
                    }
                    disabled={
                      performanceLoading
                    }
                  >
                    {performanceLoading
                      ? "Running..."
                      : "Run Again"}
                  </button>

                  <button
                    className="secondary-btn"
                    onClick={() =>
                      navigate(
                        "recommendations"
                      )
                    }
                  >
                    Generate Recommendations →
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </>
    );
  }

  /* =======================================================
     EXPLAINABILITY PAGE
     ======================================================= */

  function renderExplainability() {
    return (
      <>
        <header className="page-header">
          <div>
            <div className="eyebrow">
              MODEL INTERPRETABILITY
            </div>

            <h1>
              Explainability
            </h1>

            <p>
              Understand which features drive
              model behavior using SHAP.
            </p>
          </div>
        </header>

        {!selectedModel ? (
          <div className="content-card">
            <div className="section-heading">
              <div>
                <span className="eyebrow">
                  SELECT MODEL
                </span>

                <h2>
                  Choose a model to explain
                </h2>
              </div>
            </div>

            {models.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  ✦
                </div>

                <h3>
                  No models registered
                </h3>

                <p>
                  Register a model before
                  generating explanations.
                </p>

                <button
                  className="primary-btn"
                  onClick={
                    openCreateForm
                  }
                >
                  Register Model
                </button>
              </div>
            ) : (
              <div className="models-grid">
                {models.map(
                  (model) => (
                    <button
                      className="select-model-card"
                      key={model.id}
                      onClick={() =>
                        selectModel(model)
                      }
                    >
                      <div className="model-avatar">
                        {model.name
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div>
                        <strong>
                          {model.name}
                        </strong>

                        <span>
                          v{model.version} ·{" "}
                          {model.framework}
                        </span>
                      </div>

                      <span>
                        →
                      </span>
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="content-card">
              <div className="selected-model-banner">
                <div className="model-avatar">
                  {selectedModel.name
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div>
                  <span className="eyebrow">
                    EXPLAINING
                  </span>

                  <h3>
                    {selectedModel.name}
                  </h3>
                </div>

                <button
                  className="ghost-btn"
                  onClick={() => {
                    setSelectedModel(null);
                    setExplanation(null);
                    setRecommendations(null);
                  }}
                >
                  Change model
                </button>
              </div>

              <div className="path-grid">
                <label>
                  <span>
                    Model file
                  </span>

                  <input
                    value={modelPath}
                    onChange={(e) =>
                      setModelPath(
                        e.target.value
                      )
                    }
                    placeholder="models/fraud_detector.pkl"
                  />
                </label>

                <label>
                  <span>
                    Dataset
                  </span>

                  <input
                    value={dataPath}
                    onChange={(e) =>
                      setDataPath(
                        e.target.value
                      )
                    }
                    placeholder="data/fraud_data.csv"
                  />
                </label>
              </div>

              <button
                className="primary-btn"
                onClick={
                  runExplanation
                }
                disabled={
                  explainLoading
                }
              >
                {explainLoading
                  ? "Generating SHAP explanation..."
                  : "Generate Explanation"}
              </button>
            </div>

            {explanation && (
              <section className="content-card">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">
                      SHAP ANALYSIS
                    </span>

                    <h2>
                      Feature importance
                    </h2>
                  </div>
                </div>

                <div className="explanation-stats">
                  <div>
                    <strong>
                      {
                        explanation
                          .explanation
                          .samples_analyzed
                      }
                    </strong>

                    <span>
                      Samples analyzed
                    </span>
                  </div>

                  <div>
                    <strong>
                      {
                        explanation
                          .explanation
                          .features_analyzed
                      }
                    </strong>

                    <span>
                      Features analyzed
                    </span>
                  </div>
                </div>

                <div className="feature-list">
                  {explanation.explanation.top_features.map(
                    (
                      feature,
                      index
                    ) => (
                      <div
                        className="feature-row"
                        key={
                          feature.feature
                        }
                      >
                        <div className="feature-rank">
                          {String(
                            index + 1
                          ).padStart(
                            2,
                            "0"
                          )}
                        </div>

                        <div className="feature-name">
                          <strong>
                            {
                              feature.feature
                            }
                          </strong>

                          <div className="feature-bar">
                            <div
                              className="feature-fill"
                              style={{
                                width: `${Math.min(
                                  feature.importance_percentage,
                                  100
                                )}%`,
                              }}
                            />
                          </div>
                        </div>

                        <div className="feature-value">
                          {feature.importance_percentage.toFixed(
                            2
                          )}
                          %
                        </div>
                      </div>
                    )
                  )}
                </div>

                <div className="detail-actions">
                  <button
                    className="secondary-btn"
                    onClick={() =>
                      navigate(
                        "recommendations"
                      )
                    }
                  >
                    Generate Recommendations →
                  </button>
                </div>
              </section>
            )}
          </>
        )}
      </>
    );
  }

  /* =======================================================
     RECOMMENDATIONS PAGE
     ======================================================= */

  function renderRecommendations() {
    return (
      <>
        <header className="page-header">
          <div>
            <div className="eyebrow">
              AI-ASSISTED MODEL HEALTH
            </div>

            <h1>
              Recommendations
            </h1>

            <p>
              Convert ModelForge monitoring
              results into actionable model
              improvement recommendations.
            </p>
          </div>
        </header>

        {!selectedModel ? (
          <div className="content-card">
            <div className="section-heading">
              <div>
                <span className="eyebrow">
                  SELECT MODEL
                </span>

                <h2>
                  Choose a model
                </h2>
              </div>
            </div>

            {models.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  ✧
                </div>

                <h3>
                  No models registered
                </h3>

                <p>
                  Register a model before
                  generating recommendations.
                </p>

                <button
                  className="primary-btn"
                  onClick={
                    openCreateForm
                  }
                >
                  Register Model
                </button>
              </div>
            ) : (
              <div className="models-grid">
                {models.map(
                  (model) => (
                    <button
                      className="select-model-card"
                      key={model.id}
                      onClick={() =>
                        selectModel(model)
                      }
                    >
                      <div className="model-avatar">
                        {model.name
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div>
                        <strong>
                          {model.name}
                        </strong>

                        <span>
                          v{model.version} ·{" "}
                          {model.framework}
                        </span>
                      </div>

                      <span>
                        →
                      </span>
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* SELECTED MODEL */}

            <section className="content-card">
              <div className="selected-model-banner">
                <div className="model-avatar">
                  {selectedModel.name
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div>
                  <span className="eyebrow">
                    MODEL #{selectedModel.id}
                  </span>

                  <h3>
                    {selectedModel.name}
                  </h3>

                  <span>
                    v{selectedModel.version} ·{" "}
                    {selectedModel.framework}
                  </span>
                </div>

                <button
                  className="ghost-btn"
                  onClick={() => {
                    setSelectedModel(null);
                    setRecommendations(null);
                  }}
                >
                  Change model
                </button>
              </div>
            </section>

            {/* MONITORING INPUTS */}

            <section className="stats-grid">
              <div className="stat-card">
                <div className="stat-top">
                  <span>
                    Drift
                  </span>

                  <span className="stat-icon">
                    ⌁
                  </span>
                </div>

                <strong>
                  {driftResults[
                    selectedModel.id
                  ]
                    ? driftResults[
                        selectedModel.id
                      ].psi.toFixed(4)
                    : "—"}
                </strong>

                <small>
                  {driftResults[
                    selectedModel.id
                  ]
                    ? driftResults[
                        selectedModel.id
                      ].drift_status
                    : "Run drift analysis"}
                </small>
              </div>

              <div className="stat-card">
                <div className="stat-top">
                  <span>
                    F1 Score
                  </span>

                  <span className="stat-icon">
                    F
                  </span>
                </div>

                <strong>
                  {performance
                    ? (() => {
                        const matrix =
                          performance.performance
                            .confusion_matrix;

                        const tp = matrix?.[1]?.[1] ?? 0;
                        const fp = matrix?.[0]?.[1] ?? 0;
                        const fn = matrix?.[1]?.[0] ?? 0;

                        const denominator =
                          2 * tp + fp + fn;

                        const f1 =
                          denominator > 0
                            ? (2 * tp) / denominator
                            : 0;

                        return `${(f1 * 100).toFixed(2)}%`;
                      })()
                    : "—"}
                </strong>

                <small>
                  {performance
                    ? "Current performance"
                    : "Run performance analysis"}
                </small>
              </div>

              <div className="stat-card">
                <div className="stat-top">
                  <span>
                    Top Feature
                  </span>

                  <span className="stat-icon">
                    ✦
                  </span>
                </div>

                <strong>
                  {explanation
                    ? explanation
                        .explanation
                        .top_features[0]
                        ?.feature ?? "—"
                    : "—"}
                </strong>

                <small>
                  {explanation
                    ? "SHAP importance"
                    : "Run explainability"}
                </small>
              </div>

              <div className="stat-card">
                <div className="stat-top">
                  <span>
                    Signals
                  </span>

                  <span className="stat-icon">
                    !
                  </span>
                </div>

                <strong>
                  {recommendations
                    ? recommendations
                        .recommendations
                        .length
                    : "—"}
                </strong>

                <small>
                  Recommendations generated
                </small>
              </div>
            </section>

            {/* QUICK ANALYSIS */}

            <section className="content-card">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">
                    ANALYSIS PIPELINE
                  </span>

                  <h2>
                    Prepare monitoring results
                  </h2>
                </div>
              </div>

              <p className="section-description">
                Recommendations are generated
                from the drift, performance and
                explainability results currently
                available for this model.
              </p>

              <div className="detail-actions">
                <button
                  className="secondary-btn"
                  onClick={() =>
                    runDrift(
                      selectedModel
                    )
                  }
                  disabled={
                    driftLoading ===
                    selectedModel.id
                  }
                >
                  {driftLoading ===
                  selectedModel.id
                    ? "Analyzing..."
                    : driftResults[
                        selectedModel.id
                      ]
                    ? "Recheck Drift"
                    : "Run Drift"}
                </button>

                <button
                  className="secondary-btn"
                  onClick={
                    runPerformance
                  }
                  disabled={
                    performanceLoading
                  }
                >
                  {performanceLoading
                    ? "Calculating..."
                    : performance
                    ? "Recheck Performance"
                    : "Run Performance"}
                </button>

                <button
                  className="secondary-btn"
                  onClick={
                    runExplanation
                  }
                  disabled={
                    explainLoading
                  }
                >
                  {explainLoading
                    ? "Analyzing..."
                    : explanation
                    ? "Recheck SHAP"
                    : "Run SHAP"}
                </button>
              </div>

              <div className="detail-actions">
                <button
                  className="primary-btn"
                  onClick={
                    runRecommendations
                  }
                  disabled={
                    recommendationLoading
                  }
                >
                  {recommendationLoading
                    ? "Generating recommendations..."
                    : "Generate Recommendations"}
                </button>
              </div>
            </section>

            {/* RECOMMENDATION RESULTS */}

            {recommendations && (
              <section className="content-card">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">
                      MODEL HEALTH INSIGHTS
                    </span>

                    <h2>
                      Recommended actions
                    </h2>
                  </div>

                  <span className="toolbar-count">
                    {
                      recommendations
                        .recommendations
                        .length
                    }{" "}
                    insights
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: "16px",
                  }}
                >
                  {recommendations.recommendations.map(
                    (
                      recommendation,
                      index
                    ) => (
                      <div
                        className="content-card"
                        key={`${recommendation.title}-${index}`}
                        style={{
                          margin: 0,
                        }}
                      >
                        <div
                          className="section-heading"
                          style={{
                            marginBottom:
                              "12px",
                          }}
                        >
                          <div>
                            <span className="eyebrow">
                              {
                                recommendation.category
                              }
                            </span>

                            <h2>
                              {
                                recommendation.title
                              }
                            </h2>
                          </div>

                          <span
                            className={`status-pill ${getRecommendationClass(
                              recommendation.severity
                            )}`}
                          >
                            {
                              recommendation.severity
                            }
                          </span>
                        </div>

                        <p className="section-description">
                          {
                            recommendation.message
                          }
                        </p>

                        <div className="info-banner">
                          <span className="info-icon">
                            →
                          </span>

                          <div>
                            <strong>
                              Recommended action
                            </strong>

                            <p>
                              {
                                recommendation.action
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </section>
            )}

            {!recommendations && (
              <div className="info-banner">
                <span className="info-icon">
                  i
                </span>

                <div>
                  <strong>
                    No recommendations generated yet
                  </strong>

                  <p>
                    Run the available monitoring
                    checks and then select
                    "Generate Recommendations".
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </>
    );
  }

  /* =======================================================
     PAGE ROUTER
     ======================================================= */

  function renderPage() {
    switch (page) {
      case "models":
        return renderModels();

      case "details":
        return renderDetails();

      case "drift":
        return renderDrift();

      case "performance":
        return renderPerformance();

      case "explainability":
        return renderExplainability();

      case "recommendations":
        return renderRecommendations();

      default:
        return renderDashboard();
    }
  }

  /* =======================================================
     MAIN UI
     ======================================================= */

  return (
    <div className="app">
      {renderSidebar()}

      <main className="main">
        {error && (
          <div className="error-banner">
            <span>!</span>

            <span>
              {error}
            </span>

            <button
              onClick={() =>
                setError("")
              }
            >
              ×
            </button>
          </div>
        )}

        {loading ? (
          <div className="loading-screen">
            <div className="loading-spinner" />

            <span>
              Loading ModelForge...
            </span>
          </div>
        ) : (
          renderPage()
        )}
      </main>

      {/* =================================================
          MODEL FORM MODAL
          ================================================= */}

      {showForm && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (
              e.target ===
              e.currentTarget
            ) {
              closeForm();
            }
          }}
        >
          <div className="modal">
            <div className="modal-header">
              <div>
                <span className="eyebrow">
                  MODEL REGISTRY
                </span>

                <h2>
                  {editingId === null
                    ? "Register model"
                    : "Edit model"}
                </h2>
              </div>

              <button
                className="close-btn"
                onClick={closeForm}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={
                handleSubmit
              }
            >
              {/* MODEL NAME */}

              <label>
                Model name

                <input
                  value={
                    form.name
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target
                        .value,
                    })
                  }
                  placeholder="fraud-detector"
                  required
                />
              </label>

              {/* VERSION */}

              <label>
                Version

                <input
                  value={
                    form.version
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      version:
                        e.target
                          .value,
                    })
                  }
                  placeholder="1.0"
                  required
                />
              </label>

              {/* FRAMEWORK */}

              <label>
                Framework

                <select
                  value={
                    form.framework
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      framework:
                        e.target
                          .value,
                    })
                  }
                >
                  <option value="scikit-learn">
                    scikit-learn
                  </option>

                  <option value="Python">
                    Python
                  </option>

                  <option value="PyTorch">
                    PyTorch
                  </option>

                  <option value="TensorFlow">
                    TensorFlow
                  </option>

                  <option value="XGBoost">
                    XGBoost
                  </option>
                </select>
              </label>

              {/* ENVIRONMENT */}

              <label>
                Environment

                <select
                  value={
                    form.status
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      status:
                        e.target
                          .value,
                    })
                  }
                >
                  <option value="staging">
                    Staging
                  </option>

                  <option value="production">
                    Production
                  </option>

                  <option value="archived">
                    Archived
                  </option>
                </select>
              </label>

              {/* FORM ACTIONS */}

              <div className="form-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={
                    closeForm
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-btn"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingId ===
                      null
                    ? "Register Model"
                    : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   MODEL ROW
   ========================================================= */

function ModelRow({
  model,
  drift,
  onOpen,
  onEdit,
  onDelete,
  onDrift,
  driftLoading,
}: {
  model: Model;
  drift?: DriftResult;
  onOpen: (model: Model) => void;
  onEdit: (model: Model) => void;
  onDelete: (id: number) => void;
  onDrift: (model: Model) => void;
  driftLoading: boolean;
}) {
  return (
    <div className="model-row">
      <div
        className="model-row-main"
        onClick={() =>
          onOpen(model)
        }
      >
        <div className="model-avatar small">
          {model.name
            .charAt(0)
            .toUpperCase()}
        </div>

        <div className="model-row-info">
          <strong>
            {model.name}
          </strong>

          <span>
            v{model.version} ·{" "}
            {model.framework}
          </span>
        </div>
      </div>

      <span
        className={`status-pill ${model.status}`}
      >
        {model.status}
      </span>

      {drift ? (
        <span
          className={`drift-mini ${drift.drift_status}`}
        >
          PSI{" "}
          {drift.psi.toFixed(3)}
        </span>
      ) : (
        <button
          className="ghost-btn"
          onClick={() =>
            onDrift(model)
          }
          disabled={driftLoading}
        >
          {driftLoading
            ? "..."
            : "Check drift"}
        </button>
      )}

      <div className="row-actions">
        <button
          className="ghost-btn"
          onClick={() =>
            onEdit(model)
          }
        >
          Edit
        </button>

        <button
          className="ghost-btn danger-hover"
          onClick={() =>
            onDelete(model.id)
          }
        >
          Delete
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   META ITEM
   ========================================================= */

function MetaItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="meta-item">
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}

/* =========================================================
   EXPORT
   ========================================================= */

export default App;
