from fastapi import FastAPI

from app.api.v1.router import router

app = FastAPI(title="HireBit AI Service", version="0.1.0")
app.include_router(router, prefix="/internal/v1")
