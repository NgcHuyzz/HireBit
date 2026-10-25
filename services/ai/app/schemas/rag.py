from pydantic import BaseModel


class Citation(BaseModel):
    document_id: str
    section: str
