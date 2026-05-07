from sqlalchemy import Column,Integer,String
from database import Base

class Repository(Base):
    __tablename__ = "repositories"
    
    id = Column(Integer, primary_key=True, index=True)
    repo_name = Column(String, nullable=False)
    github_repo_id = Column(String,unique=True)
    repo_url = Column(String)