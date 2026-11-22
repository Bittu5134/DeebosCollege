from pydantic import BaseModel


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

class LoginRequest(BaseModel):
    name: str = "Student"
    email: str
