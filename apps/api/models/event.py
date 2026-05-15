from sqlalchemy import Column,Integer,String, Text
from database import Base

class Event(Base):
    __tablename__ = "events"
    
    id = Column(Integer,primary_key=True,index=True)
    event_type = Column(String)
    repository_name = Column(String)
    jobs_url = Column(String, nullable=True)
    payload = Column(Text)
    