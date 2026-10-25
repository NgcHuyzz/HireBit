from celery import Celery

from app.core.config import get_settings

settings = get_settings()
celery_app = Celery("hirebit_ai", broker=settings.redis_url, backend=settings.redis_url)
celery_app.conf.update(
    task_default_queue="ai-default",
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    task_track_started=True,
    include=[
        "app.workers.cv_tasks",
        "app.workers.embedding_tasks",
        "app.workers.matching_tasks",
        "app.workers.cleanup_tasks",
    ],
)
