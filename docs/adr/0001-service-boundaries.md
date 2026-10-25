# ADR 0001: Business and AI ownership

Status: Accepted for foundation.

NestJS is the source of truth for users, permissions, companies, jobs, applications, billing, and final matching decisions. FastAPI owns document processing, embeddings, semantic retrieval, and RAG. PostgreSQL `public` is reserved for Prisma business migrations; schema `ai` will be managed by Alembic when its first model is designed. Neither migration tool may alter the other's tables.

The services communicate through versioned internal contracts. NestJS authorizes requests before providing the permitted document scope to AI. Redis DB 0 is for future BullMQ jobs; DB 1 is for Celery. Both job systems use their own protocol.
