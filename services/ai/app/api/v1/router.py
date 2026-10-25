from fastapi import APIRouter

from app.api.v1 import cv, embeddings, health, matching, rag

router = APIRouter()
router.include_router(health.router, prefix="/health", tags=["health"])
router.include_router(cv.router, prefix="/cv", tags=["cv"])
router.include_router(embeddings.router, prefix="/embeddings", tags=["embeddings"])
router.include_router(matching.router, prefix="/matching", tags=["matching"])
router.include_router(rag.router, prefix="/rag", tags=["rag"])
