# HireBit Architecture Blueprint

> Tài liệu phân tích JOBIO hiện tại và đề xuất cấu trúc dự án HireBit khi xây dựng lại bằng NestJS + Python AI Service.
>
> Trạng thái: Architecture baseline — dùng để khởi tạo repository, chia module, lập backlog và review ranh giới hệ thống trước khi viết code.
>
> Ngày cập nhật: 2026-10-26

---

## 1. Mục tiêu tài liệu

Tài liệu này có bốn mục tiêu:

1. Ghi lại đầy đủ các miền nghiệp vụ, thành phần kỹ thuật và luồng xử lý đang có trong JOBIO.
2. Chuyển cấu trúc Django hiện tại sang một cấu trúc NestJS rõ ràng, có thể mở rộng nhưng không tạo microservice quá sớm.
3. Tách ranh giới giữa backend nghiệp vụ và AI engineering bằng một Python/FastAPI AI Service độc lập.
4. Cung cấp cây thư mục, trách nhiệm module, dữ liệu, API, queue, Docker, CI/CD, testing và roadmap đủ chi tiết để bắt đầu HireBit.

Đây là tài liệu kiến trúc mục tiêu. Không phải tất cả module cần được triển khai trong sprint đầu tiên.

---

## 2. Kết luận kiến trúc

### 2.1. Quyết định chính

HireBit nên sử dụng kiến trúc sau:

- Frontend: React + TypeScript.
- Backend nghiệp vụ: NestJS + TypeScript, tổ chức theo modular monolith.
- AI Service: Python + FastAPI cho CV parsing, embedding, semantic matching, retrieval, reranking và RAG.
- Database chính: PostgreSQL.
- Vector storage: pgvector trong PostgreSQL ở giai đoạn đầu.
- Cache và background jobs phía NestJS: Redis + BullMQ.
- Background jobs phía Python: Celery + Redis, tách queue namespace/database khỏi BullMQ.
- Object storage: Google Cloud Storage hoặc một S3-compatible provider; Cloudinary chỉ nên giữ nếu cần tối ưu media/image.
- Realtime: NestJS WebSocket Gateway + Socket.IO, dùng Redis adapter khi scale nhiều instance.
- Container: Docker + Docker Compose.
- CI/CD: GitHub Actions, container registry và triển khai GCP.

### 2.2. Vì sao không tách toàn bộ thành microservice ngay

JOBIO có nhiều domain nhưng phần lớn dùng chung transaction, database và đội phát triển nhỏ. Nếu tách mỗi domain thành một service ngay từ đầu sẽ tạo thêm:

- Network calls và distributed transaction.
- Nhiều pipeline deploy.
- Contract/versioning phức tạp.
- Khó debug, test và seed dữ liệu.
- Chi phí hạ tầng và quan sát hệ thống cao.

Modular monolith vẫn thể hiện tốt boundary nếu:

- Mỗi module chỉ truy cập repository của chính nó.
- Giao tiếp chéo module qua public service, domain event hoặc application port.
- Không import trực tiếp implementation nội bộ của module khác.
- Database schema, migration và ownership được mô tả rõ.

AI Service là ngoại lệ hợp lý vì nó có hệ sinh thái Python, workload nặng, model lifecycle và cách scale khác backend nghiệp vụ.

### 2.3. Ranh giới backend và AI

NestJS chịu trách nhiệm:

- Authentication, authorization, RBAC và tenant/company scope.
- Candidate, company, job, application và interview workflow.
- Billing, subscription, VNPay và entitlement.
- Chat, notification, job alert và realtime connection.
- Kiểm tra quyền trước khi yêu cầu AI xử lý dữ liệu.
- Trạng thái business và source of truth của dữ liệu nghiệp vụ.
- Final hybrid matching policy nếu score có liên quan tới business rule.

Python AI Service chịu trách nhiệm:

- PDF validation chuyên biệt, text extraction và OCR.
- Safety classification và document classification.
- CV structured extraction.
- Embedding generation.
- Vector retrieval, semantic similarity và reranking.
- RAG prompt construction, citation và AI evaluation.
- Model/provider abstraction và model-specific retry/fallback.

AI Service không nên tự quản lý login, payment, company permissions hoặc application state.

---

## 3. Phân tích cấu trúc JOBIO hiện tại

### 3.1. Cấu trúc cấp cao

JOBIO hiện được tổ chức như sau:

```text
JOBIO/
├── backend/                 # Django REST Framework backend
├── frontend/                # React + Vite + TypeScript
├── DataSet/                 # Dữ liệu seed/demo
├── Docs/                    # Tài liệu kỹ thuật nội bộ
├── asset/                   # Tài nguyên dự án
├── postman/                 # Postman collections/environments
├── .postman/                # Postman local metadata
├── .github/workflows/       # CI, CD và production seeding
├── docker-compose.yml       # Local stack
├── docker-compose.prod.yml  # Production stack
├── Caddyfile                # Reverse proxy và TLS
├── .env.example             # Root environment template
└── README.md
```

### 3.2. Backend Django hiện tại

Backend sử dụng cách tách theo domain lớn, sau đó tách tiếp thành nhiều Django app nhỏ theo bảng hoặc resource:

```text
backend/apps/
├── core/
├── geography/
├── company/
├── recruitment/
├── candidate/
├── communication/
├── billing/
├── blog/
├── social/
├── system/
├── assessment/
├── analytics/
└── email/
```

Mẫu phổ biến trong các app đã triển khai:

```text
feature/
├── models.py
├── serializers.py
├── views.py
├── urls.py
├── selectors/
├── services/
├── tests/
├── migrations/
├── admin.py
└── apps.py
```

Ý tưởng `selectors` cho read/query và `services` cho write/business logic là điểm tốt nên giữ khi chuyển sang NestJS. Tuy nhiên không cần tạo một Nest module riêng cho từng bảng; nên gom theo bounded context.

### 3.3. Các domain đã có code trong JOBIO

#### Identity và core

- User account và role.
- JWT authentication và refresh token.
- Google OAuth.
- OTP/email verification.
- Password setup/reset.
- Passkey/WebAuthn.
- Permission, throttle, pagination, cache và utility dùng chung.

#### Candidate

- Candidate profile, đang được đặt tên `Recruiter` trong code cũ.
- Education, experience, skills, certifications, languages và projects.
- Skill category, skill taxonomy và language taxonomy.
- CV templates và template categories.
- CV builder, render HTML/PDF và upload CV.
- CV parsing bằng Groq LLM.
- Cloudinary file storage.

#### Company

- Company profile và verification status.
- Industry taxonomy.
- Benefits và benefit categories.
- Company media và media types.
- Company follower.
- Company suggestions/search.

#### Recruitment

- Jobs, job categories, job skills và multiple job locations.
- Job views, saved jobs, featured jobs và search/filter.
- Job recommendations.
- Applications và application status history.
- Application state machine.
- Interviews và interview types.
- Email notification khi application/interview thay đổi.

#### Communication

- Notification và notification type.
- Job alert, job alert skills và alert matching task.
- Email templates/service.

#### Billing

- Subscription plans.
- Company subscription.
- Payment methods và payment transactions.
- VNPay payment flow.
- Cleanup transaction/subscription task.
- Payment confirmation email task.
- Feature entitlement như AI matching.

#### Blog/content

- Blog categories, tags, post-tag relation, posts và comments.
- Admin moderation/management UI.
- Rich text editor ở frontend.

#### System và administration

- System settings.
- Activity log và activity log type.
- File upload tracking và cleanup.
- Report và report type.
- Admin analytics/dashboard endpoints.
- Contact endpoint.

#### Geography

- Province.
- Commune.
- Address.

### 3.4. Các thư mục chủ yếu là scaffold hoặc chưa được nối hoàn chỉnh

Các thư mục sau xuất hiện trong repository nhưng tại thời điểm phân tích chưa có implementation tương xứng hoặc chưa được đăng ký đầy đủ:

- `assessment/*`: AI matching scores, assessment categories/tests, job requirements và test results.
- `communication/messages`, `message_threads`, `message_participants`.
- Phần lớn `social/*` ngoài company followers: recruiter connections, referrals, reviews, reactions, endorsements và recommendations.
- Một số recruitment area: campaigns, recruitment campaigns, referrals và interview interviewers.
- `system/audit_logs`, FAQ, search history và job search history.
- `analytics` top-level app.
- Django Channels đã được cài nhưng ASGI routing hiện chỉ khai báo HTTP; realtime messaging chưa hoàn chỉnh theo cấu trúc production.

Trong HireBit, các phần này nên được đưa vào backlog theo phase, không được mô tả là đã hoàn thiện.

### 3.5. Frontend hiện tại

Frontend JOBIO sử dụng:

- React, TypeScript và Vite.
- React Router.
- TanStack Query cho server state.
- Zustand cho client/global state.
- Axios.
- React Hook Form + Zod.
- Tailwind CSS + Radix UI.
- Recharts.
- TipTap editor.
- Playwright E2E.

Frontend đã chia theo ba nhóm actor:

- Candidate: dashboard, applications, saved jobs, job alert, CV manager, interviews, recommendations, notifications, connections và settings.
- Company: dashboard, company profile, post/manage jobs, candidates, interviews, CV search, billing, analytics, notifications và support.
- Admin: dashboard, user management, job marketplace, moderation, violation reports, blog, master data, finance và system settings.

Ngoài ra có public pages: home, jobs, job details, companies, blog, pricing, FAQ, contact, privacy, terms và authentication.

### 3.6. AI hiện tại trong JOBIO

CV pipeline hiện tại:

```text
Upload PDF
→ Validate size/magic/page count
→ PyMuPDF native extraction
→ Tesseract OCR fallback
→ Groq safeguard model
→ Groq parser model
→ Fallback parser model nếu cần
→ Pydantic normalization
→ Semantic signal check
→ RecruiterCV.cv_data
```

Model mặc định:

- Safety: `openai/gpt-oss-safeguard-20b`.
- Primary parser: `openai/gpt-oss-120b`.
- Fallback parser: `llama-3.3-70b-versatile`.

Điểm cần lưu ý: model nhỏ hiện kiểm tra prompt injection/unsafe content, không phải classifier xác định tài liệu có phải CV. Kiểm tra resume-like signal chỉ xảy ra sau khi parser lớn đã chạy.

Job recommendation hiện tại không dùng embedding. Nó là weighted rule-based engine:

- Skill: 35%.
- Experience: 20%.
- Category/domain: 15%.
- Salary: 15%.
- Location: 10%.
- Job type: 5%.

Kỹ năng từ LLM output được normalize và map về Skill ID. Nếu parse thất bại hoặc skill không map được, hệ thống fallback sang candidate profile.

### 3.7. Infrastructure và delivery hiện tại

JOBIO đã có:

- Dockerfiles cho backend/frontend.
- Docker Compose local và production.
- PostgreSQL, Redis, Celery worker và Celery beat.
- Caddy reverse proxy/TLS.
- GitHub Actions CI cho lint, test, typecheck và build.
- GitHub Actions CD build image lên GHCR và deploy qua SSH lên GCP VM.
- Health checks, migration trước deploy, database backup và rollback theo image tag.
- Workflow riêng để seed demo data có bước xác nhận và backup.

Đây là nền tốt và nên được tái sử dụng về mặt quy trình, dù backend runtime đổi sang NestJS.

---

## 4. Tech stack đề xuất cho HireBit

| Tầng | Công nghệ đề xuất | Trách nhiệm |
|---|---|---|
| Web | React, TypeScript, Vite | Candidate/company/admin UI |
| UI state | TanStack Query, Zustand | Server state và client state |
| Form | React Hook Form, Zod | Form state và validation |
| Styling | Tailwind CSS, Radix UI hoặc shadcn/ui | Design system |
| Main API | NestJS, TypeScript | Business API và orchestration |
| HTTP engine | Fastify adapter hoặc Express | REST transport; Fastify nếu team sẵn sàng |
| ORM | Prisma | Schema, migration và type-safe persistence |
| Auth | Passport, JWT, OAuth, WebAuthn | Identity và access control |
| Background jobs | BullMQ + Redis | Email, notification, billing, indexing phía NestJS |
| Realtime | NestJS WebSocket Gateway + Socket.IO | Chat và notification realtime |
| AI API | Python, FastAPI, Pydantic | AI workload boundary |
| AI worker | Celery + Redis | OCR, parsing, embedding, batch matching |
| LLM | Groq qua provider abstraction | CV extraction và RAG generation |
| Embedding | Provider API trước; local model sau | Vector representation |
| Vector DB | PostgreSQL + pgvector | Semantic retrieval |
| Database | PostgreSQL | Transactional data |
| Object storage | GCS hoặc S3-compatible | CV, image, attachment |
| API contract | OpenAPI + generated clients | Contract giữa web/API/AI |
| Email | SMTP/provider abstraction | OTP và transactional email |
| Payment | VNPay adapter | Subscription payment |
| Logging | Pino phía NestJS, structlog phía Python | Structured logs |
| Observability | OpenTelemetry, Prometheus/Grafana tùy phase | Trace, metric và alert |
| Containers | Docker, Docker Compose | Local/prod parity |
| CI/CD | GitHub Actions, GHCR, GCP | Test/build/deploy |

### 4.1. Ghi chú về Prisma và pgvector

Prisma có thể quản lý dữ liệu PostgreSQL chính. Với vector, cần chốt một trong hai cách:

1. Dùng extension pgvector của Prisma nếu phiên bản dự án hỗ trợ ổn định.
2. Dùng custom SQL migration và TypedSQL/raw SQL có type wrapper.
3. Cho AI Service sở hữu bảng vector trong PostgreSQL schema riêng và quản lý bằng SQLAlchemy/Alembic.

Khuyến nghị ban đầu: NestJS/Prisma sở hữu schema nghiệp vụ; Python/Alembic sở hữu schema `ai`. Không để hai migration tool cùng sửa một bảng.

---

## 5. Kiến trúc tổng thể mục tiêu

```text
┌──────────────────────────────────────────────────────────────┐
│ React Web                                                    │
│ Public + Candidate + Company + Admin                         │
└──────────────────────────────┬───────────────────────────────┘
                               │ HTTPS / WebSocket
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ NestJS API — Business Source of Truth                        │
│ Auth, RBAC, Candidate, Company, Job, Application, Interview │
│ Billing, Content, Notification, Chat, Admin, Analytics      │
└───────────────┬──────────────────────┬───────────────────────┘
                │                      │
                │ Internal HTTP/gRPC   │ BullMQ / Redis
                ▼                      ▼
┌─────────────────────────────┐  ┌─────────────────────────────┐
│ Python FastAPI AI Service   │  │ NestJS Workers              │
│ CV/OCR/Embedding/RAG/Match  │  │ Email/Alert/Billing/Index   │
└──────────────┬──────────────┘  └─────────────────────────────┘
               │ Celery / Redis
               ▼
┌─────────────────────────────┐
│ Python AI Workers           │
└──────────────┬──────────────┘
               │
       ┌───────┴────────┐
       ▼                ▼
┌─────────────┐  ┌────────────────┐
│ PostgreSQL  │  │ Object Storage │
│ + pgvector  │  │ CV/Media       │
└─────────────┘  └────────────────┘
```

---

## 6. Cấu trúc monorepo đề xuất

```text
HireBit/
├── apps/
│   ├── web/                              # React/Vite frontend
│   ├── api/                              # NestJS business API
│   └── api-worker/                       # Optional Nest standalone BullMQ worker
│
├── services/
│   └── ai/                               # FastAPI + Celery AI service
│
├── packages/
│   ├── api-contracts/                    # Generated TS clients/types from OpenAPI
│   ├── eslint-config/                    # Shared ESLint config
│   ├── typescript-config/                # Shared tsconfig presets
│   ├── logger/                           # Logging conventions/helpers
│   ├── test-utils/                       # Factories, fixtures, test containers
│   └── ui/                               # Optional shared UI/design system
│
├── infra/
│   ├── docker/
│   │   ├── docker-compose.yml
│   │   ├── docker-compose.dev.yml
│   │   └── docker-compose.prod.yml
│   ├── caddy/
│   │   └── Caddyfile
│   ├── postgres/
│   │   └── init.sql                      # CREATE EXTENSION vector
│   ├── monitoring/
│   │   ├── prometheus.yml
│   │   └── grafana/
│   └── gcp/
│       ├── README.md
│       └── deploy/                       # VM/Cloud Run/Terraform in later phase
│
├── docs/
│   ├── ARCHITECTURE_BLUEPRINT.md         # Tài liệu này
│   ├── adr/                              # Architecture Decision Records
│   ├── api/
│   ├── database/
│   ├── ai/
│   ├── deployment/
│   └── runbooks/
│
├── scripts/
│   ├── bootstrap.ps1
│   ├── bootstrap.sh
│   ├── seed.ts
│   ├── generate-contracts.sh
│   └── smoke-test.sh
│
├── tests/
│   ├── e2e/
│   ├── contract/
│   └── performance/
│
├── .github/workflows/
│   ├── ci.yml
│   ├── cd.yml
│   ├── ai-evaluation.yml
│   └── seed-demo-data.yml
│
├── .env.example
├── .gitignore
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── Makefile                              # Optional cross-platform aliases
└── README.md
```

### 6.1. Workspace strategy

- Dùng `pnpm workspace` cho web, API và shared TypeScript packages.
- Có thể dùng Turborepo để cache lint/test/build.
- Python AI Service giữ `pyproject.toml` và virtual environment riêng.
- Không cố chia sẻ source code trực tiếp giữa TypeScript và Python.
- Chia sẻ contract qua OpenAPI/JSON Schema và generated client.

---

## 7. Cấu trúc NestJS API chi tiết

```text
apps/api/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   │
│   ├── config/
│   │   ├── app.config.ts
│   │   ├── auth.config.ts
│   │   ├── database.config.ts
│   │   ├── redis.config.ts
│   │   ├── storage.config.ts
│   │   ├── email.config.ts
│   │   ├── payment.config.ts
│   │   ├── ai.config.ts
│   │   └── env.validation.ts
│   │
│   ├── common/
│   │   ├── constants/
│   │   ├── decorators/
│   │   ├── dto/
│   │   ├── enums/
│   │   ├── exceptions/
│   │   ├── filters/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   ├── middleware/
│   │   ├── pagination/
│   │   ├── pipes/
│   │   ├── policies/
│   │   ├── serializers/
│   │   └── utils/
│   │
│   ├── database/
│   │   ├── database.module.ts
│   │   ├── prisma.service.ts
│   │   ├── transaction.service.ts
│   │   └── repositories/
│   │
│   ├── integrations/
│   │   ├── ai-service/
│   │   ├── cloud-storage/
│   │   ├── email/
│   │   ├── google-oauth/
│   │   ├── groq/                         # Chỉ nếu Nest có use case gọi trực tiếp
│   │   └── vnpay/
│   │
│   ├── queues/
│   │   ├── queues.module.ts
│   │   ├── queue-names.ts
│   │   ├── producers/
│   │   └── processors/
│   │
│   ├── modules/
│   │   ├── identity/
│   │   ├── candidates/
│   │   ├── companies/
│   │   ├── taxonomy/
│   │   ├── jobs/
│   │   ├── applications/
│   │   ├── interviews/
│   │   ├── assessments/
│   │   ├── matching/
│   │   ├── communications/
│   │   ├── billing/
│   │   ├── content/
│   │   ├── admin/
│   │   ├── analytics/
│   │   ├── files/
│   │   ├── mail/
│   │   └── health/
│   │
│   └── observability/
│       ├── logger.module.ts
│       ├── metrics.module.ts
│       ├── tracing.ts
│       └── correlation-id.middleware.ts
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   ├── seed/
│   └── fixtures/
│
├── test/
│   ├── integration/
│   ├── e2e/
│   └── helpers/
│
├── Dockerfile
├── Dockerfile.prod
├── nest-cli.json
├── package.json
└── tsconfig.json
```

### 7.1. Mẫu cấu trúc một domain module

Không nên tạo controller/service/repository khổng lồ. Mỗi domain module dùng cấu trúc nhất quán:

```text
modules/jobs/
├── jobs.module.ts
├── presentation/
│   ├── http/
│   │   ├── jobs.controller.ts
│   │   ├── admin-jobs.controller.ts
│   │   └── dto/
│   └── websocket/                       # Chỉ khi domain cần realtime
├── application/
│   ├── use-cases/
│   │   ├── create-job.use-case.ts
│   │   ├── publish-job.use-case.ts
│   │   ├── close-job.use-case.ts
│   │   └── search-jobs.use-case.ts
│   ├── queries/
│   ├── commands/
│   └── ports/
├── domain/
│   ├── entities/
│   ├── value-objects/
│   ├── events/
│   ├── policies/
│   └── repositories/
├── infrastructure/
│   ├── persistence/
│   │   ├── prisma-job.repository.ts
│   │   └── job.mapper.ts
│   ├── search/
│   └── subscribers/
└── tests/
    ├── unit/
    └── integration/
```

Đối với module CRUD đơn giản như taxonomy, có thể rút gọn. Không cần áp dụng đầy đủ mọi layer nếu chỉ có vài thao tác.

---

## 8. Thiết kế từng NestJS module

### 8.1. IdentityModule

Thay thế `apps/core/users` và các auth endpoint hiện tại.

Trách nhiệm:

- Register/login/logout.
- Access token và refresh token rotation.
- Email verification, OTP và password reset.
- Google OAuth.
- Passkey/WebAuthn.
- User management cho admin.
- Role, permission và account status.
- Session/device tracking.

Thành phần:

```text
identity/
├── auth/
├── users/
├── roles/
├── permissions/
├── oauth/
├── otp/
├── passkeys/
└── sessions/
```

Yêu cầu bảo mật:

- Password hash dùng Argon2id hoặc bcrypt với cost phù hợp.
- Refresh token lưu dạng hash và có rotation/revocation.
- Guard theo role và permission, không chỉ kiểm tra role ở UI.
- Rate limit riêng cho login, OTP và password reset.
- Audit login success/failure, privilege change và account lock.

### 8.2. CandidatesModule

Gom các Django app candidate nhỏ thành một bounded module:

- Candidate profile.
- Education.
- Experience.
- Candidate skills.
- Certifications.
- Languages.
- Projects.
- CV/resume records.
- CV templates và CV builder.
- Profile visibility và job preferences.

Tên entity mới nên dùng `Candidate`, không dùng `Recruiter` cho người tìm việc để tránh nhầm với company recruiter.

Các use case chính:

- Create/update candidate profile.
- Add/update/delete education, experience, skill, certificate, language và project.
- Upload resume.
- Generate resume từ profile/template.
- Chọn default resume.
- Thay đổi public/private.
- Request resume parsing.
- Apply parsed result vào profile sau khi người dùng review.
- Delete resume và toàn bộ object/vector liên quan.

### 8.3. CompaniesModule

Gom:

- Company profile.
- Industry relation.
- Company verification.
- Benefits.
- Media/gallery.
- Company followers.
- Company member và recruiter role.

Nên bổ sung `CompanyMember` thay vì giả định một company chỉ có một user:

- Owner.
- Admin.
- Recruiter.
- Interviewer.
- Finance viewer.

Tất cả company-scoped query phải có `company_id` lấy từ trusted membership context, không lấy trực tiếp từ request body.

### 8.4. TaxonomyModule

Gom dữ liệu master:

- Skills và skill categories.
- Job categories.
- Industries.
- Languages.
- Benefit categories.
- Interview types.
- Provinces, communes và address helpers.
- Media types nếu còn cần.

Các endpoint read có thể public/cache; endpoint write chỉ dành cho admin.

### 8.5. JobsModule

Trách nhiệm:

- Draft/create/update/publish/pause/close job.
- Required và optional skills.
- Multi-location và remote/hybrid/on-site.
- Salary range và negotiable flag.
- Search, filter, sort và pagination.
- Featured job với thời hạn hiệu lực.
- View tracking.
- Saved job.
- Similar jobs.
- Company/admin moderation.

PostgreSQL Full-Text Search có thể dùng trước. Semantic search được bổ sung qua AI Service và pgvector, không thay thế hard filters.

### 8.6. ApplicationsModule

Trách nhiệm:

- Candidate apply bằng một resume version cụ thể.
- Prevent duplicate active application nếu business rule yêu cầu.
- Application pipeline.
- Status history.
- Candidate withdraw.
- Company note/rating.
- Offer letter metadata.
- Activity/event emission.

State machine đề xuất:

```text
SUBMITTED
→ SCREENING
→ SHORTLISTED
→ INTERVIEWING
→ OFFERED
→ HIRED

Terminal/alternative:
REJECTED, WITHDRAWN, EXPIRED
```

Transition phải đi qua application service/policy. Không cho controller update status trực tiếp.

### 8.7. InterviewsModule

Trách nhiệm:

- Interview type.
- Schedule/reschedule/cancel/complete.
- Multiple interviewers.
- Online/offline meeting information.
- Candidate confirmation.
- Reminder jobs.
- Feedback và scorecard.
- Permission theo company membership.

### 8.8. AssessmentsModule

JOBIO mới có scaffold. HireBit có thể triển khai sau core MVP:

- Assessment categories.
- Tests và questions.
- Job assessment requirements.
- Invitations.
- Candidate attempts và results.
- Manual/automatic grading.
- Anti-cheat metadata ở mức phù hợp.

Không gọi điểm assessment là AI score nếu chỉ là rule-based calculation.

### 8.9. MatchingModule

Matching là nơi phối hợp business rule với AI signal.

NestJS sở hữu:

- Hard eligibility filter.
- Weight configuration.
- Subscription entitlement.
- Final score aggregation.
- Match explanation public.
- Match result persistence và version.

AI Service cung cấp:

- Resume/job embedding similarity.
- Semantic skill/domain similarity.
- Optional reranker score.
- Extracted normalized skill concepts.

Hybrid score gợi ý:

```text
final_score =
    skill_rule_score       * 0.25
  + experience_score       * 0.15
  + category_score         * 0.10
  + salary_score           * 0.10
  + location_score         * 0.10
  + job_type_score         * 0.05
  + semantic_similarity    * 0.20
  + reranker_score         * 0.05
```

Trọng số phải cấu hình và version hóa; không hard-code vĩnh viễn trong controller.

### 8.10. CommunicationsModule

Gom notification, job alerts và phần chat đang scaffold:

- In-app notification.
- Notification preferences.
- Job alerts và scheduled matching.
- Message thread.
- Participants.
- Messages và attachments.
- Read receipt.
- WebSocket presence/typing nếu cần.
- Email/push delivery request.

Đảm bảo message access bằng membership trong thread, không chỉ bằng message ID.

### 8.11. BillingModule

Trách nhiệm:

- Subscription plans và feature entitlements.
- Company subscriptions.
- Upgrade/downgrade/renew/cancel.
- Payment methods.
- Payment transaction.
- VNPay create payment URL, return và IPN/webhook.
- Idempotency và signature verification.
- Reconciliation/expiry cleanup.
- Finance/admin reporting.

Payment callback phải idempotent. Trạng thái subscription chỉ thay đổi sau khi server xác minh chữ ký và trạng thái giao dịch.

### 8.12. ContentModule

Gom blog/content:

- Categories.
- Tags.
- Posts.
- Post-tag relation.
- Comments.
- Draft/published/archived/moderated state.
- SEO metadata.
- Author/admin permissions.

### 8.13. AdminModule

Trách nhiệm:

- User/company/job moderation.
- Master data management.
- Violation reports.
- System settings.
- Activity log và security audit log.
- Financial overview.
- Content moderation.
- Operational actions có audit trail.

`ActivityLog` và `AuditLog` nên tách nghĩa:

- Activity log: business activity phục vụ dashboard/support.
- Audit log: immutable security/administrative record.

### 8.14. AnalyticsModule

Trách nhiệm:

- Candidate/company/admin dashboards.
- Job views và conversion.
- Application funnel.
- Time-to-hire.
- Source/channel performance.
- Subscription/revenue metrics.

Ban đầu query từ PostgreSQL với materialized views hoặc scheduled aggregates. Chưa cần data warehouse nếu dữ liệu nhỏ.

### 8.15. FilesModule

Trách nhiệm:

- Signed upload URL.
- File metadata.
- MIME/magic/size validation.
- Owner và access policy.
- Quarantine/scan hook.
- Signed download URL.
- Orphan cleanup.
- Retention/delete workflow.

### 8.16. MailModule

Trách nhiệm:

- Template rendering.
- Transactional email queue.
- OTP, verification, application status, interview reminder, offer letter, report result và billing email.
- Provider abstraction.
- Retry và delivery log.

### 8.17. HealthModule

Endpoint tối thiểu:

- `/health/live`: process đang chạy.
- `/health/ready`: database/Redis và dependency bắt buộc sẵn sàng.
- `/health/version`: commit SHA/image tag, không lộ secret.

---

## 9. Cấu trúc Python AI Service

```text
services/ai/
├── app/
│   ├── main.py
│   ├── api/
│   │   ├── dependencies.py
│   │   └── v1/
│   │       ├── router.py
│   │       ├── health.py
│   │       ├── cv.py
│   │       ├── embeddings.py
│   │       ├── matching.py
│   │       └── rag.py
│   │
│   ├── core/
│   │   ├── config.py
│   │   ├── logging.py
│   │   ├── security.py
│   │   ├── telemetry.py
│   │   └── exceptions.py
│   │
│   ├── schemas/
│   │   ├── cv.py
│   │   ├── document.py
│   │   ├── embedding.py
│   │   ├── matching.py
│   │   └── rag.py
│   │
│   ├── domain/
│   │   ├── models/
│   │   ├── policies/
│   │   └── ports/
│   │
│   ├── services/
│   │   ├── cv/
│   │   │   ├── file_validator.py
│   │   │   ├── text_extractor.py
│   │   │   ├── ocr.py
│   │   │   ├── safety_classifier.py
│   │   │   ├── document_classifier.py
│   │   │   ├── parser.py
│   │   │   └── normalizer.py
│   │   ├── embeddings/
│   │   │   ├── chunker.py
│   │   │   ├── embedding_service.py
│   │   │   └── indexer.py
│   │   ├── retrieval/
│   │   │   ├── vector_search.py
│   │   │   ├── keyword_search.py
│   │   │   ├── hybrid_search.py
│   │   │   └── reranker.py
│   │   ├── matching/
│   │   │   ├── semantic_matcher.py
│   │   │   ├── skill_normalizer.py
│   │   │   └── explanation_builder.py
│   │   └── rag/
│   │       ├── context_builder.py
│   │       ├── chatbot.py
│   │       ├── citation_builder.py
│   │       └── guardrails.py
│   │
│   ├── providers/
│   │   ├── llm/
│   │   │   ├── base.py
│   │   │   ├── groq_provider.py
│   │   │   └── fallback_provider.py
│   │   ├── embeddings/
│   │   │   ├── base.py
│   │   │   ├── api_provider.py
│   │   │   └── local_provider.py
│   │   ├── object_storage/
│   │   └── callbacks/
│   │
│   ├── repositories/
│   │   ├── documents.py
│   │   ├── embeddings.py
│   │   ├── conversations.py
│   │   └── evaluation.py
│   │
│   ├── db/
│   │   ├── session.py
│   │   ├── models/
│   │   └── migrations/                   # Alembic
│   │
│   ├── workers/
│   │   ├── celery_app.py
│   │   ├── cv_tasks.py
│   │   ├── embedding_tasks.py
│   │   ├── matching_tasks.py
│   │   └── cleanup_tasks.py
│   │
│   └── prompts/
│       ├── cv_safety.yaml
│       ├── cv_classifier.yaml
│       ├── cv_parser.yaml
│       ├── rag_system.yaml
│       └── match_explanation.yaml
│
├── evals/
│   ├── datasets/
│   ├── cv_parsing/
│   ├── retrieval/
│   ├── matching/
│   └── rag/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── contract/
│
├── alembic.ini
├── pyproject.toml
├── Dockerfile
└── README.md
```

### 9.1. CV parsing pipeline mới

```text
1. Validate file
2. Extract native text
3. OCR pages without enough text
4. Sanitize/control input size
5. Safety classifier
6. Lightweight document classifier: is_cv + confidence + reason
7. Large parser model only when is_cv=true
8. Pydantic schema validation
9. Normalize skills/dates/languages/location
10. Return structured result to NestJS
11. Generate chunks/embeddings asynchronously
```

Classifier output đề xuất:

```json
{
  "document_type": "resume",
  "is_cv": true,
  "confidence": 0.97,
  "language": "vi",
  "reason": "Contains personal profile, skills, education and experience sections"
}
```

Không gộp `is_cv` với safety nếu safeguard model chỉ được huấn luyện cho security. Có thể dùng một small general model riêng hoặc rule + small model gate.

### 9.2. Structured CV schema

Schema tối thiểu:

- `personal`: name, email, phone, headline, summary, years of experience.
- `location`.
- `links`: LinkedIn, GitHub, portfolio.
- `skills`: canonical name, raw name, proficiency, years.
- `education`.
- `experience`.
- `certifications`.
- `projects`.
- `languages`.
- `metadata`: parser model, prompt version, parsed_at, confidence, warnings.

Luôn lưu:

- Raw extracted text hoặc hash/secure reference theo retention policy.
- Parser model/version.
- Prompt/schema version.
- Processing status và error code.
- User-reviewed flag.

Không tự động ghi đè candidate profile bằng output LLM trước khi người dùng xác nhận.

### 9.3. Embedding pipeline

```text
Resume/Job created or updated
→ Build canonical searchable text
→ Split thành logical chunks
→ Generate embedding
→ Upsert document + chunks + vector
→ Mark embedding version active
```

Không chỉ chunk theo số ký tự. CV/job nên chunk theo section:

- Summary.
- Skills.
- Mỗi experience item.
- Education/certification/project.
- Job responsibilities.
- Job requirements.
- Benefits/company context nếu cần RAG.

Metadata bắt buộc cho mỗi vector:

- `tenant_id` hoặc `company_id` nếu dữ liệu thuộc company.
- `owner_user_id`.
- `document_type`.
- `document_id`.
- `section_type`.
- `embedding_model` và dimension.
- `content_hash`.
- `is_active`.

### 9.4. Hybrid job matching

Matching không nên chỉ dựa vào cosine similarity.

Luồng đề xuất:

```text
1. NestJS kiểm tra quyền và subscription entitlement
2. Hard filters: status, deadline, location/work mode, legal constraints
3. Rule score: skills, experience, salary, category, job type
4. AI Service tính semantic similarity resume ↔ job
5. Optional reranking top candidates
6. NestJS tổng hợp final score theo scoring version
7. Lưu reasons, factor scores và model/version
8. Trả top N và explanation
```

Để tránh black-box, response nên có breakdown:

```json
{
  "score": 84,
  "version": "hybrid-v1",
  "factors": {
    "requiredSkills": 0.85,
    "experience": 0.8,
    "salary": 1.0,
    "location": 0.8,
    "semanticSimilarity": 0.82,
    "reranker": 0.76
  },
  "reasons": [
    "5/6 required skills matched",
    "Experience is within the requested range",
    "Strong semantic similarity with backend responsibilities"
  ],
  "missingRequiredSkills": ["Kubernetes"]
}
```

### 9.5. RAG chatbot

Các use case khả thi:

- Candidate hỏi về job/company dựa trên dữ liệu đã công khai.
- Candidate hỏi cách cải thiện CV so với một job cụ thể.
- Company hỏi về candidate đã apply mà họ có quyền xem.
- Help-center chatbot dựa trên FAQ/policy.

Luồng an toàn:

```text
Client
→ NestJS authenticate + authorize
→ NestJS tạo retrieval scope/document IDs được phép
→ AI Service embed query
→ Hybrid retrieval với tenant/ACL filter
→ Rerank
→ Build bounded context
→ LLM generate answer
→ Validate citations
→ NestJS audit + stream response
```

Không cho LLM tự quyết định tenant hoặc tự sinh SQL tùy ý. Access scope phải do NestJS cung cấp và AI repository bắt buộc áp dụng.

---

## 10. Data ownership và database structure

### 10.1. PostgreSQL schemas

Đề xuất:

```text
PostgreSQL
├── public/core    # NestJS + Prisma ownership
├── ai             # FastAPI + Alembic ownership
└── audit          # Có thể do NestJS ownership, append-only
```

Nguyên tắc:

- Prisma không sửa bảng do Alembic quản lý.
- Alembic không sửa bảng nghiệp vụ do Prisma quản lý.
- AI Service chỉ nhận business data cần thiết qua contract hoặc read-only view.
- AI Service không trực tiếp đổi trạng thái application/subscription.
- NestJS nhận callback/result và quyết định business persistence.

### 10.2. Nhóm bảng NestJS

#### Identity

- `users`
- `oauth_accounts`
- `refresh_tokens`
- `user_sessions`
- `user_passkeys`
- `roles`
- `permissions`
- `user_roles`
- `role_permissions`
- `otp_challenges`

#### Candidate

- `candidate_profiles`
- `candidate_educations`
- `candidate_experiences`
- `candidate_skills`
- `candidate_certifications`
- `candidate_languages`
- `candidate_projects`
- `resumes`
- `resume_versions`
- `resume_parse_jobs`
- `cv_templates`
- `cv_template_categories`
- `job_preferences`

#### Company

- `companies`
- `company_members`
- `company_verification_requests`
- `industries`
- `company_industries`
- `benefit_categories`
- `company_benefits`
- `company_media`
- `company_followers`

#### Jobs

- `job_categories`
- `jobs`
- `job_skills`
- `job_locations`
- `job_views`
- `saved_jobs`
- `job_alerts`
- `job_alert_skills`
- `job_alert_matches`

#### Recruitment

- `applications`
- `application_status_history`
- `application_notes`
- `interview_types`
- `interviews`
- `interview_interviewers`
- `interview_feedback`
- `offers`

#### Communication

- `notification_types`
- `notifications`
- `notification_preferences`
- `message_threads`
- `message_participants`
- `messages`
- `message_attachments`
- `message_receipts`
- `email_delivery_logs`

#### Billing

- `subscription_plans`
- `plan_features`
- `company_subscriptions`
- `payment_methods`
- `payment_transactions`
- `payment_webhook_events`
- `invoices`

#### Content/system

- `blog_categories`
- `blog_tags`
- `blog_posts`
- `blog_post_tags`
- `blog_comments`
- `system_settings`
- `activity_logs`
- `audit_logs`
- `report_types`
- `reports`
- `file_uploads`

### 10.3. Nhóm bảng AI

- `ai.documents`
- `ai.document_chunks`
- `ai.embedding_models`
- `ai.embeddings`
- `ai.cv_parse_runs`
- `ai.document_classification_runs`
- `ai.semantic_match_runs`
- `ai.semantic_match_items`
- `ai.rag_conversations`
- `ai.rag_messages`
- `ai.rag_citations`
- `ai.prompt_versions`
- `ai.evaluation_datasets`
- `ai.evaluation_runs`
- `ai.evaluation_results`

Vector table phải hỗ trợ model version. Không trộn vector có dimension/model khác trong cùng index nếu không có partial index phù hợp.

---

## 11. API và service contracts

### 11.1. Public API conventions

- Prefix: `/api/v1`.
- JSON field dùng `camelCase` ở API, mapping sang database naming nội bộ.
- Pagination chuẩn hóa: `page`, `pageSize`, `total`, `items`.
- Error envelope có `code`, `message`, `details`, `requestId`.
- Timestamp ISO 8601 UTC.
- Idempotency key cho payment, apply và task creation nhạy cảm.
- OpenAPI là source of truth cho public REST contract.

Ví dụ error:

```json
{
  "error": {
    "code": "RESUME_NOT_READY",
    "message": "The resume has not finished processing.",
    "details": {},
    "requestId": "req_01..."
  }
}
```

### 11.2. NestJS ↔ AI Service

Internal endpoint gợi ý:

```text
POST /internal/v1/cv/parse-jobs
GET  /internal/v1/cv/parse-jobs/{jobId}
POST /internal/v1/embeddings/index
POST /internal/v1/matching/semantic-score
POST /internal/v1/rag/answers
GET  /internal/v1/health/ready
```

Mỗi request cần:

- Service authentication bằng short-lived JWT hoặc mTLS ở production.
- `X-Request-Id`/trace context.
- Timeout rõ ràng.
- Idempotency key cho job creation.
- Contract version.
- Không truyền secret hoặc dữ liệu ngoài phạm vi cần thiết.

### 11.3. Async callback

CV parse task nên trả ngay `202 Accepted`:

```json
{
  "jobId": "aijob_...",
  "status": "QUEUED"
}
```

Khi hoàn thành, AI Service có thể:

1. Gọi signed internal callback sang NestJS.
2. Phát event qua broker chung trong phase sau.
3. Cho NestJS poll status trong phase đầu.

Callback phải idempotent và chứa checksum/version.

---

## 12. Queue, cache và scheduled jobs

### 12.1. BullMQ phía NestJS

Queue đề xuất:

- `mail`
- `notifications`
- `job-alerts`
- `billing`
- `file-cleanup`
- `analytics-aggregation`
- `ai-orchestration`

Mỗi job phải có:

- Stable job name.
- JSON-serializable payload.
- Retry/backoff.
- Timeout.
- Idempotency strategy.
- Dead-letter/failed job inspection policy.
- Correlation/request ID.

### 12.2. Celery phía AI

Queue đề xuất:

- `cv-parse`
- `ocr`
- `embeddings`
- `semantic-matching`
- `ai-evaluation`
- `ai-cleanup`

Không để BullMQ worker đọc Celery message hoặc ngược lại. Có thể dùng chung Redis server local nhưng tách database/prefix. Production nên theo dõi memory và cân nhắc instance riêng khi workload tăng.

### 12.3. Cache

Cache phù hợp:

- Public taxonomy.
- Job detail/list query phổ biến.
- Company public profile.
- Feature entitlement.
- Short-lived JWKS/public key.

Không cache response có PII mà không có user/tenant key. Cache invalidation phải nằm trong service/use case thay vì controller.

---

## 13. Realtime và notification

### 13.1. WebSocket namespaces/events

Có thể dùng một namespace `/realtime` với event rõ ràng:

- `notification.created`
- `notification.read`
- `thread.message.created`
- `thread.message.read`
- `interview.updated`
- `application.status.changed`
- `ai.job.updated`

### 13.2. Security

- Authenticate handshake.
- Revalidate authorization trên từng event nhạy cảm.
- Join room theo `user:{id}` và `company:{id}` sau khi kiểm tra membership.
- Không tin room/company ID do client tự gửi.
- Rate limit chat event và attachment upload.
- Redis adapter khi có nhiều API instance.

---

## 14. Frontend structure đề xuất

```text
apps/web/
├── src/
│   ├── app/
│   │   ├── router.tsx
│   │   ├── providers.tsx
│   │   └── query-client.ts
│   ├── assets/
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   ├── feedback/
│   │   └── data-display/
│   ├── features/
│   │   ├── auth/
│   │   ├── public-jobs/
│   │   ├── candidate-profile/
│   │   ├── resumes/
│   │   ├── applications/
│   │   ├── recommendations/
│   │   ├── saved-jobs/
│   │   ├── job-alerts/
│   │   ├── interviews/
│   │   ├── companies/
│   │   ├── company-jobs/
│   │   ├── company-candidates/
│   │   ├── company-billing/
│   │   ├── messaging/
│   │   ├── notifications/
│   │   ├── blog/
│   │   ├── admin/
│   │   └── ai-assistant/
│   ├── hooks/
│   ├── lib/
│   ├── services/
│   │   ├── api-client.ts
│   │   ├── generated/                    # OpenAPI generated client
│   │   └── websocket.ts
│   ├── stores/
│   ├── styles/
│   ├── types/
│   └── main.tsx
├── e2e/
├── public/
├── Dockerfile
├── package.json
└── vite.config.ts
```

Khuyến nghị chuyển từ organization theo `pages/components/services` thuần túy sang feature-based structure. Shared component chỉ chứa UI thực sự dùng chung; business component nằm trong feature.

### 14.1. Route groups

```text
Public
├── /
├── /jobs
├── /jobs/:slug
├── /companies
├── /companies/:slug
├── /blog
├── /pricing
├── /faq
└── /auth/*

Candidate
├── /candidate/dashboard
├── /candidate/profile
├── /candidate/resumes
├── /candidate/applications
├── /candidate/recommendations
├── /candidate/saved-jobs
├── /candidate/job-alerts
├── /candidate/interviews
├── /candidate/messages
└── /candidate/settings

Company
├── /company/dashboard
├── /company/profile
├── /company/jobs
├── /company/jobs/new
├── /company/candidates
├── /company/interviews
├── /company/messages
├── /company/analytics
├── /company/billing
└── /company/settings

Admin
├── /admin/dashboard
├── /admin/users
├── /admin/companies
├── /admin/jobs
├── /admin/reports
├── /admin/content
├── /admin/master-data
├── /admin/finance
└── /admin/settings
```

---

## 15. Docker và local development

### 15.1. Docker Compose services

```text
web
api
api-worker
ai-api
ai-worker
ai-beat                    # Optional scheduled AI tasks
postgres                   # pgvector image
redis
caddy                      # Optional local/prod edge
mailpit                    # Local email testing
```

Optional development tools:

- pgAdmin hoặc Adminer.
- RedisInsight.
- Prometheus/Grafana.

### 15.2. Volumes

- `postgres_data`.
- `redis_data` nếu persistence cần thiết local.
- Không bind mount secret.
- Object files local có volume riêng hoặc dùng emulator/provider dev bucket.

### 15.3. Health dependencies

- API chờ PostgreSQL và Redis ready.
- Worker chờ Redis và database.
- AI worker chờ Redis, PostgreSQL và model/provider configuration.
- Web không nên phụ thuộc trực tiếp DB.

### 15.4. Environment files

```text
.env.example
apps/web/.env.example
apps/api/.env.example
services/ai/.env.example
```

Nhóm biến:

- App/environment/domain.
- Database.
- Redis/BullMQ/Celery.
- JWT/OAuth/WebAuthn.
- Email.
- Storage.
- VNPay.
- AI providers/models/timeouts/token limits.
- Internal service auth.
- Observability.

Không commit `.env` thật. CI production dùng secret store.

---

## 16. CI/CD đề xuất

### 16.1. Pull request CI

Chạy song song:

#### Web

- Install locked dependencies.
- ESLint.
- TypeScript typecheck.
- Unit/component tests.
- Production build.

#### NestJS API

- ESLint/format check.
- TypeScript typecheck/build.
- Unit tests.
- Integration tests với PostgreSQL/Redis service container.
- Prisma schema validation và migration check.
- OpenAPI snapshot/contract diff.

#### Python AI

- Ruff lint/format.
- mypy hoặc pyright.
- pytest unit/integration.
- Alembic migration check.
- Prompt/schema tests với provider được mock.
- Small offline evaluation dataset.

#### Cross-system

- Contract tests NestJS ↔ AI.
- Docker image build smoke test.
- Secret scan và dependency audit.
- E2E critical path khi cần.

### 16.2. CD

Quy trình:

1. CI pass trên commit main.
2. Build immutable images theo commit SHA.
3. Push GHCR/Artifact Registry.
4. Backup database trước migration.
5. Chạy Prisma migration deploy.
6. Chạy Alembic upgrade cho schema AI.
7. Deploy services.
8. Readiness/smoke tests.
9. Lưu deployed image tag.
10. Rollback application image nếu health check thất bại.

Database rollback phải được thiết kế theo expand/contract migration; không giả định rollback image sẽ tự rollback schema an toàn.

### 16.3. AI evaluation workflow

Chạy thủ công hoặc khi prompt/model config thay đổi:

- CV field extraction accuracy.
- Document classification precision/recall.
- Retrieval Recall@K/MRR.
- Matching Precision@K/NDCG trên labeled set.
- RAG groundedness và citation accuracy.
- Latency và estimated token cost.

Không deploy prompt/model version mới nếu vượt regression threshold.

---

## 17. Testing strategy

### 17.1. Test pyramid

- Unit: domain policy, state transition, score formula, parser normalization.
- Integration: repository, Prisma, Redis, queue processor và provider adapter.
- Contract: OpenAPI response và NestJS ↔ AI schema.
- E2E: user-facing critical paths.
- AI evaluation: deterministic dataset và metrics.
- Performance: search, recommendations, upload và chat streaming.

### 17.2. Critical E2E scenarios

#### Candidate

1. Register → verify email → complete profile.
2. Upload CV → processing → review parsed data.
3. Receive recommendations → open job → save/apply.
4. Track application status.
5. Receive interview notification.
6. Use RAG assistant with authorized data.

#### Company

1. Register company → verification.
2. Subscribe/pay with VNPay sandbox.
3. Create/publish job.
4. Review applications and matching breakdown.
5. Schedule interview.
6. Update application state.

#### Admin

1. Moderate company/job/blog.
2. Process violation report.
3. Update master data/system settings.
4. Review finance and analytics.

### 17.3. AI-specific tests

- Reject invalid/non-PDF/malicious file.
- OCR fallback for scanned Vietnamese/English CV.
- Safety blocks prompt injection.
- Document classifier rejects invoice/article/random PDF.
- Parser output validates against schema.
- Parser fallback is used only on expected provider/model errors.
- Skill normalization handles aliases without ambiguous matching.
- Embedding reindex handles model version changes.
- Retrieval never crosses tenant/ACL scope.
- RAG answer citations point to retrieved sources.

---

## 18. Security baseline

### 18.1. Authentication và authorization

- Short-lived access token.
- Refresh token rotation và revocation.
- RBAC + resource ownership/policy checks.
- Company membership context.
- Admin action audit.
- WebSocket authorization.

### 18.2. File security

- Validate extension, MIME và magic bytes.
- Size/page limits.
- Signed upload/download URLs.
- Private bucket cho CV.
- Virus scanning hook nếu đưa production.
- Prevent SSRF khi AI worker tải file; chỉ allow trusted object storage host/bucket.
- Delete embeddings/chunks khi resume bị xóa.

### 18.3. AI security

- Treat CV/job/document text as untrusted.
- Prompt delimiters và instruction hierarchy.
- Prompt injection classification.
- Tool allowlist; chatbot không có quyền tùy ý gọi business action.
- Tenant/ACL filter ở repository layer.
- Redact PII khỏi log/tracing.
- Không gửi toàn bộ CV vào model khi use case chỉ cần một phần.
- Lưu provider/model/prompt version cho audit.
- Có timeout, retry budget và circuit breaker.

### 18.4. Payment security

- Verify VNPay signature server-side.
- Idempotent callback/IPN.
- Store raw callback có redaction cần thiết.
- Không tin amount/status từ frontend.
- Unique provider transaction ID.

---

## 19. Observability và operations

Mọi request/job cần có:

- Request/correlation ID.
- User/company ID dạng safe metadata khi được phép.
- Service name và version.
- Duration, status và error code.
- Queue wait time và retry count.
- AI provider/model, latency, token usage và estimated cost.

Dashboard tối thiểu:

- API request rate/error/latency.
- Database connection/query latency.
- Redis/BullMQ/Celery queue depth.
- Failed/retried jobs.
- CV parse success/failure/blocked rate.
- Embedding backlog.
- RAG latency/cost/citation failure.
- Payment success/failure.
- Email delivery failure.

Runbook nên có:

- Queue bị kẹt.
- AI provider outage.
- Database migration failure.
- VNPay callback mismatch.
- Object storage outage.
- Rollback deployment.
- Reindex embeddings.

---

## 20. Roadmap triển khai đề xuất

### Phase 0 — Foundation

- Khởi tạo monorepo/workspace.
- Docker Compose PostgreSQL+pgvector, Redis.
- NestJS API, FastAPI AI service và React web skeleton.
- Shared config, lint, format, test và CI.
- Health/readiness endpoints.
- OpenAPI generation.

### Phase 1 — Identity và taxonomy

- User, role, permission.
- Register/login/refresh/logout.
- Email verification/reset password.
- Candidate/company role onboarding.
- Skills, categories, industries, geography.

### Phase 2 — Candidate và company

- Candidate profile subresources.
- Company profile/membership/verification.
- File upload/storage.
- CV builder/template basic.

### Phase 3 — Recruitment core

- Jobs/search/filter.
- Saved jobs/views.
- Applications + state machine/history.
- Interviews.
- Email/notification.

### Phase 4 — AI CV pipeline

- PDF extraction/OCR.
- Safety model.
- Small CV classifier.
- Large structured parser + fallback.
- Review/apply parsed data.
- Prompt/model versioning và eval dataset.

### Phase 5 — Hybrid recommendations

- pgvector schema/index.
- Job/resume embeddings.
- Rule-based score port từ JOBIO.
- Semantic score và reranking.
- Explainable score breakdown.
- Recommendation evaluation.

### Phase 6 — Billing và entitlement

- Plans/subscriptions.
- VNPay sandbox flow.
- Feature gates và usage limits.
- Billing/admin view.

### Phase 7 — Communication và RAG

- WebSocket notifications.
- Chat thread/messages.
- Job alerts.
- Candidate/company/help-center RAG.
- Streaming và citations.

### Phase 8 — Content, social, assessment và analytics

- Blog/content moderation.
- Followers/connections/reviews/referrals.
- Assessments.
- Dashboard/aggregates.
- Advanced admin/reporting.

### Phase 9 — Production hardening

- Security review.
- Load/performance tests.
- Observability và alerting.
- Backup/restore drill.
- Deployment rollback drill.
- Data retention/privacy workflow.

---

## 21. Definition of Done theo feature

Một feature chỉ được xem là hoàn thành khi có:

- Domain/business rule rõ.
- Authorization ở backend.
- Input DTO/schema validation.
- Database migration nếu cần.
- Transaction/idempotency strategy.
- Unit tests.
- Integration test cho repository/provider.
- API contract/OpenAPI cập nhật.
- Frontend loading/empty/error/success state.
- Structured logging và error code.
- Queue retry/timeout nếu chạy async.
- Documentation/env example cập nhật.
- Security/privacy review nếu xử lý CV, payment hoặc PII.

AI feature cần thêm:

- Dataset/evaluation case.
- Model và prompt version.
- Fallback behavior.
- Latency/cost budget.
- Human review path cho dữ liệu ảnh hưởng hồ sơ.
- Tenant/ACL test.

---

## 22. Mapping từ JOBIO sang HireBit

| JOBIO | HireBit target | Ghi chú |
|---|---|---|
| `apps/core/users` | `IdentityModule` | Auth, users, OAuth, passkey |
| `apps/geography/*` | `TaxonomyModule/geography` | Public cached data |
| `apps/company/*` | `CompaniesModule` + taxonomy | Gom các app theo resource |
| `apps/candidate/recruiters` | `CandidatesModule/profile` | Đổi tên Recruiter thành Candidate |
| `apps/candidate/recruiter_*` | `CandidatesModule` | Profile subresources |
| `apps/candidate/recruiter_cvs` | `CandidatesModule/resumes` + AI Service | Nest owns resume, Python owns processing |
| `apps/candidate/cv_templates*` | `CandidatesModule/cv-builder` | Template/render |
| `apps/candidate/skills*` | `TaxonomyModule/skills` | Shared taxonomy |
| `apps/recruitment/jobs*` | `JobsModule` | Job aggregate |
| `apps/recruitment/applications*` | `ApplicationsModule` | State machine/history |
| `apps/recruitment/interviews*` | `InterviewsModule` | Multiple interviewers/feedback |
| `apps/recruitment/saved_jobs` | `JobsModule/saved-jobs` | Candidate interaction |
| `apps/communication/notifications*` | `CommunicationsModule/notifications` | Realtime + inbox |
| `apps/communication/job_alert*` | `CommunicationsModule/job-alerts` | Scheduled worker |
| `apps/communication/message*` | `CommunicationsModule/messaging` | Scaffold cần triển khai |
| `apps/billing/*` | `BillingModule` | VNPay + entitlement |
| `apps/blog/*` | `ContentModule` | Blog/CMS |
| `apps/social/*` | `Companies/Candidates/Social features` | Chỉ followers đã có code đáng kể |
| `apps/system/system_settings` | `AdminModule/settings` | Typed config where possible |
| `apps/system/activity_logs` | `AdminModule/activity` | Business activity |
| `apps/system/audit_logs` | `AdminModule/audit` | Append-only, scaffold hiện tại |
| `apps/system/file_uploads` | `FilesModule` | Storage abstraction |
| `apps/system/reports*` | `AdminModule/reports` | Moderation/report workflow |
| `apps/system/analytics_reports` | `AnalyticsModule` | Dashboard query/aggregate |
| `apps/assessment/*` | `AssessmentsModule` | Phase sau, scaffold hiện tại |
| `apps/email` + templates | `MailModule` | Async provider/template |
| Celery tasks | BullMQ hoặc Celery theo ownership | Không dùng chéo protocol |
| Django signals | Domain events/subscribers | Explicit, testable side effects |
| DRF serializers | DTO + class-validator/Zod contracts | Tách input/output DTO |
| Selectors | Query services/repositories | Giữ read/write separation |
| Services | Application use cases | Không nhét logic vào controller |
| Django admin | HireBit Admin UI | NestJS không có admin miễn phí tương đương |

---

## 23. Những điều không nên làm khi bắt đầu

- Không tách mỗi bảng thành một Nest module độc lập.
- Không tạo microservice cho mọi domain ngay từ MVP.
- Không để AI Service sở hữu authentication hoặc subscription.
- Không gọi mọi weighted rule là AI.
- Không dùng embedding thay thế required-skill hard constraints.
- Không tự động ghi dữ liệu LLM vào profile mà không cho user review.
- Không lưu vector mà thiếu model/version/content hash.
- Không để NestJS và FastAPI cùng migrate một bảng.
- Không truyền toàn bộ database credential sang AI worker nếu chỉ cần một contract nhỏ.
- Không để controller chứa query/scoring/payment logic.
- Không dùng event/queue khi một transaction nội bộ đơn giản đã đủ.
- Không đưa secret vào Docker image hoặc frontend environment.
- Không triển khai RAG trước khi có document ownership và ACL rõ ràng.

---

## 24. Tài liệu chính thức tham khảo

- NestJS CLI và standard/monorepo mode: https://docs.nestjs.com/cli/overview
- NestJS workspaces: https://docs.nestjs.com/cli/monorepo
- NestJS BullMQ queues: https://docs.nestjs.com/techniques/queues
- NestJS WebSocket gateways: https://docs.nestjs.com/websockets/gateways
- NestJS OpenAPI: https://docs.nestjs.com/openapi/introduction
- FastAPI: https://fastapi.tiangolo.com/
- FastAPI background task guidance: https://fastapi.tiangolo.com/tutorial/background-tasks/
- pgvector: https://github.com/pgvector/pgvector
- Prisma PostgreSQL: https://www.prisma.io/docs/orm/core-concepts/supported-databases/postgresql
- Prisma PostgreSQL extensions: https://docs.prisma.io/docs/postgres/database/postgres-extensions

---

## 25. Checklist khởi tạo repository HireBit

- [ ] Chọn pnpm workspace và tạo root scripts.
- [ ] Tạo `apps/web`.
- [ ] Tạo `apps/api` NestJS.
- [ ] Tạo `services/ai` FastAPI.
- [ ] Tạo Docker Compose với pgvector PostgreSQL và Redis.
- [ ] Thiết lập Prisma cho schema nghiệp vụ.
- [ ] Thiết lập Alembic cho schema AI.
- [ ] Tạo `CREATE EXTENSION IF NOT EXISTS vector` migration/init.
- [ ] Tạo environment validation cho NestJS và FastAPI.
- [ ] Thiết lập request/correlation ID.
- [ ] Tạo health/live và health/ready cho từng service.
- [ ] Thiết lập OpenAPI và generated client.
- [ ] Thiết lập lint/typecheck/test cho TypeScript.
- [ ] Thiết lập Ruff/typecheck/pytest cho Python.
- [ ] Tạo CI workflow tối thiểu.
- [ ] Viết ADR cho boundary NestJS ↔ AI.
- [ ] Xác định object storage cho CV.
- [ ] Xác định auth/token strategy.
- [ ] Thiết kế core database ERD trước migration đầu tiên.
- [ ] Tạo seed master data.
- [ ] Chốt MVP scope trước khi triển khai social/assessment/advanced analytics.

