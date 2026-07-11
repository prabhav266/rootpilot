from pydantic import BaseModel


class RepositoryCreate(BaseModel):
    owner_github_id: str
    owner_login: str | None = None
    repo_name: str
    github_repo_id: str
    repo_url: str
