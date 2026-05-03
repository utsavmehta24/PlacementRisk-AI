"""MLflow proxy router — exposes MLflow experiment/run data via the backend API"""
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from app.auth.rbac import require_admin
from app.config import get_settings
from app.models.schemas import User

router = APIRouter()
settings = get_settings()

MLFLOW_BASE = settings.mlflow_tracking_uri.rstrip("/")
MLFLOW_API = f"{MLFLOW_BASE}/api/2.0/mlflow"


async def _mlflow_get(path: str, params: dict = None):
    """Make a GET request to the MLflow REST API."""
    url = f"{MLFLOW_API}{path}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            return resp.json()
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="MLflow server is not reachable. Make sure it is running.")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"MLflow error: {e.response.text}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error contacting MLflow: {str(e)}")


@router.get("/status")
async def mlflow_status(current_user: User = Depends(require_admin)):
    """Check if MLflow server is reachable and return its version."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{MLFLOW_BASE}/health")
            is_up = resp.status_code == 200
    except Exception:
        is_up = False

    return {
        "reachable": is_up,
        "url": MLFLOW_BASE,
    }


@router.get("/experiments")
async def list_experiments(current_user: User = Depends(require_admin)):
    """List all MLflow experiments."""
    data = await _mlflow_get("/experiments/search", {"max_results": 100})
    experiments = data.get("experiments", [])
    return [
        {
            "experiment_id": e["experiment_id"],
            "name": e["name"],
            "lifecycle_stage": e.get("lifecycle_stage", "active"),
            "artifact_location": e.get("artifact_location", ""),
            "creation_time": e.get("creation_time"),
            "last_update_time": e.get("last_update_time"),
        }
        for e in experiments
        if e.get("lifecycle_stage") != "deleted"
    ]


@router.get("/experiments/{experiment_id}/runs")
async def list_runs(
    experiment_id: str,
    max_results: int = Query(50, le=200),
    current_user: User = Depends(require_admin),
):
    """List runs for a given experiment, newest first."""
    data = await _mlflow_get(
        "/runs/search",
        {
            "experiment_ids": [experiment_id],
            "max_results": max_results,
            "order_by": ["attributes.start_time DESC"],
        },
    )
    runs = data.get("runs", [])
    result = []
    for r in runs:
        info = r.get("info", {})
        data_block = r.get("data", {})
        metrics = {m["key"]: m["value"] for m in data_block.get("metrics", [])}
        params = {p["key"]: p["value"] for p in data_block.get("params", [])}
        result.append(
            {
                "run_id": info.get("run_id"),
                "run_name": info.get("run_name"),
                "status": info.get("status"),
                "start_time": info.get("start_time"),
                "end_time": info.get("end_time"),
                "metrics": metrics,
                "params": params,
            }
        )
    return result


@router.get("/runs/{run_id}")
async def get_run(run_id: str, current_user: User = Depends(require_admin)):
    """Get full details for a single MLflow run."""
    data = await _mlflow_get("/runs/get", {"run_id": run_id})
    run = data.get("run", {})
    info = run.get("info", {})
    data_block = run.get("data", {})
    metrics = {m["key"]: m["value"] for m in data_block.get("metrics", [])}
    params = {p["key"]: p["value"] for p in data_block.get("params", [])}
    tags = {t["key"]: t["value"] for t in data_block.get("tags", [])}
    return {
        "run_id": info.get("run_id"),
        "run_name": info.get("run_name"),
        "experiment_id": info.get("experiment_id"),
        "status": info.get("status"),
        "start_time": info.get("start_time"),
        "end_time": info.get("end_time"),
        "artifact_uri": info.get("artifact_uri"),
        "metrics": metrics,
        "params": params,
        "tags": tags,
    }


@router.get("/summary")
async def mlflow_summary(current_user: User = Depends(require_admin)):
    """
    Return a high-level summary of all experiments and their latest runs.
    Used by the AdminDashboard MLflow panel.
    """
    try:
        experiments_data = await _mlflow_get("/experiments/search", {"max_results": 100})
    except HTTPException:
        return {"reachable": False, "experiments": []}

    experiments = [
        e for e in experiments_data.get("experiments", [])
        if e.get("lifecycle_stage") != "deleted"
    ]

    summary = []
    for exp in experiments:
        exp_id = exp["experiment_id"]
        try:
            runs_data = await _mlflow_get(
                "/runs/search",
                {
                    "experiment_ids": [exp_id],
                    "max_results": 10,
                    "order_by": ["attributes.start_time DESC"],
                },
            )
            runs = runs_data.get("runs", [])
        except Exception:
            runs = []

        latest_run = None
        if runs:
            r = runs[0]
            info = r.get("info", {})
            data_block = r.get("data", {})
            metrics = {m["key"]: m["value"] for m in data_block.get("metrics", [])}
            params = {p["key"]: p["value"] for p in data_block.get("params", [])}
            latest_run = {
                "run_id": info.get("run_id"),
                "run_name": info.get("run_name"),
                "status": info.get("status"),
                "start_time": info.get("start_time"),
                "metrics": metrics,
                "params": params,
            }

        summary.append(
            {
                "experiment_id": exp_id,
                "name": exp["name"],
                "total_runs": len(runs),
                "latest_run": latest_run,
            }
        )

    return {"reachable": True, "experiments": summary}
