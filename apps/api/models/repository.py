from sqlalchemy import Column, Integer, String, UniqueConstraint
from database import Base


class Repository(Base):
    __tablename__ = "repositories"
    __table_args__ = (
        UniqueConstraint(
            "owner_github_id",
            "github_repo_id",
            name="uq_owner_github_repo",
        ),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    owner_github_id = Column(String, nullable=False, index=True)
    owner_login = Column(String, nullable=True)
    repo_name = Column(String, nullable=False)
    github_repo_id = Column(String, nullable=False, index=True)
    repo_url = Column(String)
