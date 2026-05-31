from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import Session

from database import SessionLocal
from models.repository import Repository
from schemas.repo import RepositoryCreate

router = APIRouter()


@router.post("/repositories/connect")
def connect_repository(repo: RepositoryCreate):
    db: Session = SessionLocal()
    try:
        # Check if already connected
        existing = (
            db.query(Repository)
            .filter(Repository.github_repo_id == repo.github_repo_id)
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=409,
                detail="Repository already connected",
            )

        new_repo = Repository(
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
def list_repositories():
    db: Session = SessionLocal()
    try:
        repos = db.query(Repository).all()
        return [
            {
                "id": r.id,
                "repo_name": r.repo_name,
                "github_repo_id": r.github_repo_id,
                "repo_url": r.repo_url,
            }
            for r in repos
        ]
    finally:
        db.close()


@router.delete("/repositories/{repo_id}")
def delete_repository(repo_id: int):
    db: Session = SessionLocal()
    try:
        repo = db.query(Repository).filter(Repository.id == repo_id).first()
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
