from pydantic import BaseModel

class RepositoryCreate(BaseModel):
    repo_name: str
    github_repo_id: str
    repo_url: str