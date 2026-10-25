# Database ownership

PostgreSQL `public` is for NestJS and Prisma. Schema `ai` is reserved for Python and future Alembic migrations. `infra/postgres/init.sql` enables pgvector and creates the empty `ai` schema for local development. No business tables or AI vector tables are created in this foundation.
