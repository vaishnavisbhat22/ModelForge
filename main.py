from datetime import datetime
from pathlib import Path
import os
import joblib
import pandas as pd
from app.recommendations.recommend import generate_recommendations
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker

from app.performance.metrics import calculate_performance
from app.drift.drift import calculate_psi, classify_drift
from app.explainability.explain import explain_model


# =========================================================
# PATH CONFIGURATION
# =========================================================

# backend/
BASE_DIR = Path(__file__).resolve().parent.parent


def resolve_path(file_path: str) -> Path:
    """
    Resolve a file path safely.

    If an absolute path is supplied, use it directly.
    If a relative path is supplied, resolve it relative to
    the backend directory.
    """
    path = Path(file_path)

    if path.is_absolute():
        return path

    return BASE_DIR / path


# =========================================================
# DATABASE CONFIGURATION
# =========================================================

DATABASE_URL = "postgresql://postgres:Vaish@localhost:5432/modelforge"

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


# =========================================================
# DATABASE MODEL
# =========================================================

class Model(Base):
    __tablename__ = "models"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String,
        nullable=False
    )

    version = Column(
        String,
        nullable=False
    )

    framework = Column(
        String,
        nullable=False
    )

    status = Column(
        String,
        nullable=False,
        default="staging"
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )


# Create table if it does not already exist
Base.metadata.create_all(bind=engine)


# =========================================================
# REQUEST SCHEMAS
# =========================================================

class ModelSchema(BaseModel):
    name: str
    version: str
    framework: str
    status: str = "staging"


class PerformanceRequest(BaseModel):
    model_path: str
    data_path: str
    target_column: str = "target"


class ExplainRequest(BaseModel):
    model_path: str
    data_path: str
    max_features: int = 10


# =========================================================
# FASTAPI APP
# =========================================================

app = FastAPI(
    title="ModelForge API",
    description="ML model monitoring and observability platform",
    version="1.0.0"
)


# =========================================================
# CORS CONFIGURATION
# =========================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# =========================================================
# ROOT ENDPOINT
# =========================================================

@app.get("/")
def root():
    return {
        "message": "ModelForge API is running"
    }


# =========================================================
# CREATE MODEL
# =========================================================

@app.post("/models")
def register_model(model: ModelSchema):

    db = SessionLocal()

    try:
        new_model = Model(
            name=model.name,
            version=model.version,
            framework=model.framework,
            status=model.status
        )

        db.add(new_model)
        db.commit()
        db.refresh(new_model)

        return {
            "message": "Model registered successfully",
            "model": {
                "id": new_model.id,
                "name": new_model.name,
                "version": new_model.version,
                "framework": new_model.framework,
                "status": new_model.status,
                "created_at": new_model.created_at
            }
        }

    finally:
        db.close()


# =========================================================
# GET ALL MODELS
# =========================================================

@app.get("/models")
def get_models():

    db = SessionLocal()

    try:
        models = db.query(Model).all()

        return [
            {
                "id": model.id,
                "name": model.name,
                "version": model.version,
                "framework": model.framework,
                "status": model.status,
                "created_at": model.created_at
            }
            for model in models
        ]

    finally:
        db.close()


# =========================================================
# GET MODEL BY ID
# =========================================================

@app.get("/models/{model_id}")
def get_model(model_id: int):

    db = SessionLocal()

    try:
        model = (
            db.query(Model)
            .filter(Model.id == model_id)
            .first()
        )

        if model is None:
            raise HTTPException(
                status_code=404,
                detail="Model not found"
            )

        return {
            "id": model.id,
            "name": model.name,
            "version": model.version,
            "framework": model.framework,
            "status": model.status,
            "created_at": model.created_at
        }

    finally:
        db.close()


# =========================================================
# UPDATE MODEL
# =========================================================

@app.put("/models/{model_id}")
def update_model(
    model_id: int,
    model_data: ModelSchema
):

    db = SessionLocal()

    try:
        model = (
            db.query(Model)
            .filter(Model.id == model_id)
            .first()
        )

        if model is None:
            raise HTTPException(
                status_code=404,
                detail="Model not found"
            )

        model.name = model_data.name
        model.version = model_data.version
        model.framework = model_data.framework
        model.status = model_data.status

        db.commit()
        db.refresh(model)

        return {
            "message": "Model updated successfully",
            "model": {
                "id": model.id,
                "name": model.name,
                "version": model.version,
                "framework": model.framework,
                "status": model.status,
                "created_at": model.created_at
            }
        }

    finally:
        db.close()


# =========================================================
# DELETE MODEL
# =========================================================

@app.delete("/models/{model_id}")
def delete_model(model_id: int):

    db = SessionLocal()

    try:
        model = (
            db.query(Model)
            .filter(Model.id == model_id)
            .first()
        )

        if model is None:
            raise HTTPException(
                status_code=404,
                detail="Model not found"
            )

        db.delete(model)
        db.commit()

        return {
            "message": "Model deleted successfully",
            "model_id": model_id
        }

    finally:
        db.close()


# =========================================================
# MODEL DRIFT DETECTION
# =========================================================

@app.post("/models/{model_id}/drift")
def check_model_drift(model_id: int):

    db = SessionLocal()

    try:
        model = (
            db.query(Model)
            .filter(Model.id == model_id)
            .first()
        )

        if model is None:
            raise HTTPException(
                status_code=404,
                detail="Model not found"
            )

        # Demo reference data
        reference_data = [
            10, 12, 11, 13, 12,
            14, 11, 10, 13, 12
        ]

        # Demo production data
        production_data = [
            20, 22, 21, 19, 23,
            21, 20, 24, 22, 21
        ]

        # Calculate PSI
        psi = calculate_psi(
            reference_data,
            production_data
        )

        # Classify drift
        drift_status = classify_drift(psi)

        return {
            "model_id": model.id,
            "model_name": model.name,
            "psi": round(psi, 4),
            "drift_status": drift_status
        }

    finally:
        db.close()


# =========================================================
# MODEL EXPLAINABILITY
# =========================================================

@app.post("/models/{model_id}/explain")
def explain_model_endpoint(
    model_id: int,
    request: ExplainRequest
):

    db = SessionLocal()

    try:

        # -----------------------------------------------------
        # Find model
        # -----------------------------------------------------

        model = (
            db.query(Model)
            .filter(Model.id == model_id)
            .first()
        )

        if model is None:
            raise HTTPException(
                status_code=404,
                detail="Model not found"
            )

        # -----------------------------------------------------
        # Validate max features
        # -----------------------------------------------------

        if request.max_features < 1:
            raise HTTPException(
                status_code=400,
                detail="max_features must be at least 1"
            )

        # -----------------------------------------------------
        # Resolve paths
        # -----------------------------------------------------

        model_path = resolve_path(request.model_path)
        data_path = resolve_path(request.data_path)

        if not model_path.exists():
            raise HTTPException(
                status_code=404,
                detail=f"Model file not found: {model_path}"
            )

        if not data_path.exists():
            raise HTTPException(
                status_code=404,
                detail=f"Dataset not found: {data_path}"
            )

        # -----------------------------------------------------
        # Run SHAP explanation
        # -----------------------------------------------------

        try:

            result = explain_model(
                model_path=str(model_path),
                data_path=str(data_path),
                max_features=request.max_features
            )

        except FileNotFoundError as error:

            raise HTTPException(
                status_code=404,
                detail=str(error)
            )

        except ImportError as error:

            raise HTTPException(
                status_code=500,
                detail=str(error)
            )

        except ValueError as error:

            raise HTTPException(
                status_code=400,
                detail=str(error)
            )

        except Exception as error:

            raise HTTPException(
                status_code=500,
                detail=f"Explainability failed: {str(error)}"
            )

        # -----------------------------------------------------
        # Return explanation
        # -----------------------------------------------------

        return {
            "model_id": model.id,
            "model_name": model.name,
            "version": model.version,
            "framework": model.framework,
            "explanation": result
        }

    finally:
        db.close()


# =========================================================
# DASHBOARD SUMMARY
# =========================================================

@app.get("/dashboard/summary")
def dashboard_summary():

    db = SessionLocal()

    try:

        models = db.query(Model).all()

        total_models = len(models)

        production_models = sum(
            1
            for model in models
            if model.status.lower() == "production"
        )

        return {
            "total_models": total_models,
            "production_models": production_models,
            "drift_checks": 0,
            "high_drift": 0
        }

    finally:
        db.close()


# =========================================================
# MODEL PERFORMANCE MONITORING
# =========================================================

@app.post("/models/{model_id}/performance")
def check_model_performance(
    model_id: int,
    request: PerformanceRequest
):

    db = SessionLocal()

    try:

        # -----------------------------------------------------
        # Check model exists
        # -----------------------------------------------------

        model = (
            db.query(Model)
            .filter(Model.id == model_id)
            .first()
        )

        if model is None:
            raise HTTPException(
                status_code=404,
                detail="Model not found"
            )

        # -----------------------------------------------------
        # Resolve paths
        # -----------------------------------------------------

        model_path = resolve_path(request.model_path)
        data_path = resolve_path(request.data_path)

        # -----------------------------------------------------
        # Check model file
        # -----------------------------------------------------

        if not model_path.exists():

            raise HTTPException(
                status_code=404,
                detail=(
                    f"Model file not found: "
                    f"{model_path}"
                )
            )

        # -----------------------------------------------------
        # Check dataset
        # -----------------------------------------------------

        if not data_path.exists():

            raise HTTPException(
                status_code=404,
                detail=(
                    f"Dataset not found: "
                    f"{data_path}"
                )
            )

        # -----------------------------------------------------
        # Load trained model
        # -----------------------------------------------------

        try:

            trained_model = joblib.load(
                model_path
            )

        except Exception as error:

            raise HTTPException(
                status_code=500,
                detail=(
                    "Could not load trained model. "
                    f"Error: {error}"
                )
            )

        # -----------------------------------------------------
        # Load dataset
        # -----------------------------------------------------

        try:

            df = pd.read_csv(
                data_path
            )

        except Exception as error:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Could not read dataset. "
                    f"Error: {error}"
                )
            )

        # -----------------------------------------------------
        # Validate dataset
        # -----------------------------------------------------

        if df.empty:

            raise HTTPException(
                status_code=400,
                detail="Dataset is empty"
            )

        # -----------------------------------------------------
        # Check target column
        # -----------------------------------------------------

        if request.target_column not in df.columns:

            raise HTTPException(
                status_code=400,
                detail=(
                    f"Target column "
                    f"'{request.target_column}' "
                    f"not found in dataset"
                )
            )

        # -----------------------------------------------------
        # Separate features and labels
        # -----------------------------------------------------

        X = df.drop(
            columns=[request.target_column]
        )

        y_true = df[
            request.target_column
        ]

        # -----------------------------------------------------
        # Encode categorical columns
        # -----------------------------------------------------

        X = pd.get_dummies(
            X,
            drop_first=False
        )

        # -----------------------------------------------------
        # Clean invalid values
        # -----------------------------------------------------

        X = X.replace(
            [
                float("inf"),
                float("-inf")
            ],
            0
        )

        X = X.fillna(0)

        # -----------------------------------------------------
        # Generate predictions
        # -----------------------------------------------------

        try:

            y_pred = trained_model.predict(X)

        except Exception as error:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Model could not generate predictions. "
                    "Check that the dataset features match "
                    "the trained model. "
                    f"Error: {error}"
                )
            )

        # -----------------------------------------------------
        # Calculate performance metrics
        # -----------------------------------------------------

        try:

            metrics = calculate_performance(
                y_true,
                y_pred
            )
        except Exception as error:
            raise HTTPException(
                status_code=500,
                detail=(
                    "Performance metric calculation failed. "
                    f"Error: {error}"
                )
            )
        # -----------------------------------------------------
        # Return results
        # -----------------------------------------------------
        return {
            "model_id": model.id,
            "model_name": model.name,
            "version": model.version,
            "framework": model.framework,
            "samples_analyzed": len(df),
            "target_column": request.target_column,
            "performance": metrics
        }
    finally:
        db.close()
        # =========================================================
# AI RECOMMENDATIONS
# =========================================================

@app.post("/models/{model_id}/recommendations")
def get_model_recommendations(
    model_id: int,
    drift_result: dict | None = None,
    performance_result: dict | None = None,
    explanation_result: dict | None = None
):
    db = SessionLocal()

    try:
        model = (
            db.query(Model)
            .filter(Model.id == model_id)
            .first()
        )

        if model is None:
            raise HTTPException(
                status_code=404,
                detail="Model not found"
            )

        recommendations = generate_recommendations(
            drift_result=drift_result,
            performance_result=performance_result,
            explanation_result=explanation_result
        )

        return {
            "model_id": model.id,
            "model_name": model.name,
            "version": model.version,
            "recommendations": recommendations
        }

    finally:
        db.close()