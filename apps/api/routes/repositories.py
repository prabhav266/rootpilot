from fastapi import APIRouter
from sqlalchemy.orm import Session

from database import SessionLocal
from models.repository import Repository

router = APIRouter()

@router.post("/repositories/connect")
def connect_repository(repo: dict):

    db: Session = SessionLocal()

    existing_repo = db.query(Repository).filter(
        Repository.github_repo_id == str(repo["github_repo_id"])
    ).first()

    if existing_repo:
        return {
            "message": "Repository already connected"
        }

    new_repo = Repository(
        repo_name=repo["repo_name"],
        github_repo_id=str(repo["github_repo_id"]),
        repo_url=repo["repo_url"]
    )

    db.add(new_repo)
    db.commit()
    db.refresh(new_repo)

    return {
        "message": "Repository connected successfully",
        "repository_id": new_repo.id
    }