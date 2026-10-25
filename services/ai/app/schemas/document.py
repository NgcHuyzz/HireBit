from pydantic import BaseModel


class DocumentRef(BaseModel):
    document_id: str
    owner_user_id: str
    content_hash: str
