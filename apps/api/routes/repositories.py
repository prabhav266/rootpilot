from fastapi import APIRouter
from sqlalchemy.orm import Session

from database import SessionLocal
from models.repository import Repository
from schemas.repo import RepositoryCreate

router = APIRouter()

@router.post("/repositories/connect")
def connect_repository(repo: RepositoryCreate):

    db: Session = SessionLocal()

    try:

        new_repo = Repository(
            repo_name=repo.repo_name,
            github_repo_id=repo.github_repo_id,
            repo_url=repo.repo_url
        )

        db.add(new_repo)
        db.commit()
        db.refresh(new_repo)

        return {
            "message": "Repository connected successfully"
        }

    finally:
        db.close()