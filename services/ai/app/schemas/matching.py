from pydantic import BaseModel


class SemanticScore(BaseModel):
    score: float
    model_version: str
