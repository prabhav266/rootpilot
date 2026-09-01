from fastapi import APIRouter, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
import requests
import os

from database import SessionLocal
from models.repository import Repository
from schemas.repo import RepositoryCreate


router = APIRouter()


@router.post("/repositories/connect")
def connect_repository(repo: RepositoryCreate):
    owner_github_id = repo.owner_github_id.strip()
    if not owner_github_id:
        raise HTTPException(status_code=400, detail="owner_github_id is required")

    db: Session = SessionLocal()
    try:
        # Check if already connected
        existing = (
            db.query(Repository)
            .filter(
                Repository.owner_github_id == owner_github_id,
                Repository.github_repo_id == repo.github_repo_id,
            )
            .first()
        )
        if existing:
            return {
                "message": "Repository already connected",
                "id": existing.id,
                "repo_name": existing.repo_name,
            }

        new_repo = Repository(
            owner_github_id=owner_github_id,
            owner_login=repo.owner_login,
            repo_name=repo.repo_name,
            github_repo_id=repo.github_repo_id,
            repo_url=repo.repo_url,
        )
        db.add(new_repo)
        db.commit()
        db.refresh(new_repo)

        return {
            "message": "Repository connected successfully",
            "id": new_repo.id,
            "repo_name": new_repo.repo_name,
        }

    except HTTPException:
        raise

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        db.close()


@router.get("/repositories")
def list_repositories(owner_github_id: str = Query(..., min_length=1)):
    db: Session = SessionLocal()
    try:
        repos = (
            db.query(Repository)
            .filter(Repository.owner_github_id == owner_github_id)
            .order_by(Repository.repo_name.asc())
            .all()
        )
        return [
            {
                "id": r.id,
                "owner_github_id": r.owner_github_id,
                "owner_login": r.owner_login,
                "repo_name": r.repo_name,
                "github_repo_id": r.github_repo_id,
                "repo_url": r.repo_url,
            }
            for r in repos
        ]
    finally:
        db.close()


@router.delete("/repositories/{repo_id}")
def delete_repository(repo_id: int, owner_github_id: str = Query(..., min_length=1)):
    db: Session = SessionLocal()
    try:
        repo = (
            db.query(Repository)
            .filter(
                Repository.id == repo_id,
                Repository.owner_github_id == owner_github_id,
            )
            .first()
        )
        if not repo:
            raise HTTPException(status_code=404, detail="Repository not found")
        db.delete(repo)
        db.commit()
        return {"message": "Repository disconnected"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


class WebhookInstallRequest(BaseModel):
    repo_name: str
    github_token: str
    webhook_url: str | None = None


@router.post("/repositories/install-webhook")
def install_github_webhook(data: WebhookInstallRequest):
    repo_name = data.repo_name.strip()
    github_token = data.github_token.strip()

    if not repo_name or not github_token:
        raise HTTPException(
            status_code=400,
            detail="repo_name and github_token are required",
        )

    # Use default webhook URL if not passed
    webhook_url = (data.webhook_url or "").strip()
    if not webhook_url:
        webhook_url = "https://rootpilot.onrender.com/webhooks/github/"

    headers = {
        "Authorization": f"Bearer {github_token}",
        "Accept": "application/vnd.github.v3+json",
    }

    # 1. Check existing webhooks to avoid duplicates
    try:
        get_res = requests.get(
            f"https://api.github.com/repos/{repo_name}/hooks",
            headers=headers,
            timeout=10,
        )
        if get_res.status_code == 200:
            existing_hooks = get_res.json()
            for h in existing_hooks:
                hook_url = h.get("config", {}).get("url", "")
                if "/webhooks/github" in hook_url:
                    return {
                        "message": "Webhook is already active on this repository",
                        "webhook_id": h.get("id"),
                        "already_installed": True,
                    }
    except Exception:
        pass

    # 2. Create the webhook
    config = {
        "url": webhook_url,
        "content_type": "json",
        "insecure_ssl": "0",
    }
    secret = os.getenv("GITHUB_WEBHOOK_SECRET")
    if secret:
        config["secret"] = secret

    hook_payload = {
        "name": "web",
        "active": True,
        "events": [
            "push",
            "workflow_run",
            "workflow_job",
            "pull_request",
            "check_run",
            "check_suite",
            "ping",
        ],
        "config": config,
    }

    try:
        post_res = requests.post(
            f"https://api.github.com/repos/{repo_name}/hooks",
            headers=headers,
            json=hook_payload,
            timeout=10,
        )

        if post_res.status_code in [200, 201]:
            hook_data = post_res.json()
            return {
                "message": "Webhook automatically installed in GitHub repository!",
                "webhook_id": hook_data.get("id"),
                "already_installed": False,
            }
        else:
            err_msg = "Failed to install webhook."
            try:
                err_json = post_res.json()
                err_msg = err_json.get("message", err_msg)
            except Exception:
                pass
            raise HTTPException(
                status_code=post_res.status_code,
                detail=f"GitHub API Error: {err_msg}",
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to communicate with GitHub API: {str(e)}",
        )

