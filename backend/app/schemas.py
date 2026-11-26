from pydantic import BaseModel

class CollegeResponse(BaseModel):
    id: int
    college_name: str
    branch_name: str
    avg_ctc: float | None
    placement_percentage: float | None
    class Config:
        from_attributes = True

class RecommendationRequest(BaseModel):
    rank: int
    adv_rank: int | None = None
    query: str
    category: str
    homestate: str
    exam_type: str | None = "Advanced"
    profile: dict | None = None

class FollowupRequest(BaseModel):
    query: str
    homestate: str
