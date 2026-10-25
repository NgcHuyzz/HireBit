from pydantic import BaseModel


class CvParseJob(BaseModel):
    job_id: str
    status: str
