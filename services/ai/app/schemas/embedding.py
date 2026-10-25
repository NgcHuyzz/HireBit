from pydantic import BaseModel


class EmbeddingRef(BaseModel):
    document_id: str
    model_version: str
