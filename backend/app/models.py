from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime

from .database import Base


class College(Base):
    __tablename__ = "colleges"

    id = Column(Integer, primary_key=True)
    college_name = Column(String, unique=True)

    nirf_rank = Column(Integer)

    overall_average_ctc = Column(Float)
    overall_median_ctc = Column(Float)
    overall_placement_percentage = Column(Float)

    branches = relationship(
        "Branch",
        back_populates="college"
    )

class Branch(Base):
    __tablename__ = "branches"
    id = Column(Integer, primary_key=True)
    college_id = Column(
        Integer,
        ForeignKey("colleges.id")
    )
    branch_name = Column(String)
    average_ctc_lpa = Column(Float)
    median_ctc_lpa = Column(Float)
    placement_percentage = Column(Float)
    college = relationship(
        "College",
        back_populates="branches"
    )
    cutoffs = relationship(
        "BranchCutoff",
        back_populates="branch"
    )

class BranchCutoff(Base):
    __tablename__ = "branch_cutoffs"

    id = Column(Integer,primary_key=True)
    branch_id = Column(
        Integer,
        ForeignKey("branches.id"))

    branch = relationship(
    "Branch",
    back_populates="cutoffs"
    )

    category = Column(String)
    closing_rank = Column(Integer)
    year = Column(Integer)

class UserSearch(Base):
    __tablename__ = "user_searches"

    id = Column(Integer, primary_key=True)
    user_id = Column("alpha_id", String, index=True, nullable=True)
    email = Column(String, nullable=True)
    rank = Column(Integer)
    category = Column(String)
    exam_type = Column(String, nullable=True)
    homestate = Column(String, nullable=True)
    query_text = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
