from fastapi import APIRouter, HTTPException, Query
from sqlalchemy.orm import Session

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
