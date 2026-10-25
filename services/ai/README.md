# HireBit AI Service

FastAPI owns AI processing and the future `ai` PostgreSQL schema. The API and Celery worker currently expose infrastructure only. No Groq or model call is made.

Run locally after `pip install -e .[dev]`:

```sh
uvicorn app.main:app --reload --port 8000
celery -A app.workers.celery_app:celery_app worker --loglevel=info
ruff check .
mypy app
pytest
```
