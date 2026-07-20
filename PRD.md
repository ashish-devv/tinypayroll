# TinyPayroll Backend — Product & Technical Requirements Document

**Status:** Draft for planning · **Owner:** TinyPayroll · **Target stack:** Spring Boot 3.x (Java 21 LTS) · **Consumer:** the existing Expo/React Native app in this repo

---

## 1. Purpose

TinyPayroll's mobile app currently runs entirely on mock data (`src/data/mock.ts`) with a dummy in-memory auth layer (`src/services/auth.tsx`). This document plans the real backend: a Spring Boot API that owns employees, attendance, payroll runs, business configuration, and authentication, so the app can be pointed at a real service without changing its domain shapes (`src/types/index.ts` is the contract to preserve).

**Target users:** small business owners (5–50 employees) — bakeries, traders, small retail, services — who need dead-simple attendance tracking and monthly payroll runs. This shapes every decision below: low ops cost, low cognitive overhead, strong defaults, nothing that needs a DBA to operate.

---

## 2. Database choice

**Decision: PostgreSQL.** Fully relational domain (employees, attendance, payroll lines), and Postgres brings extras that fit a multi-tenant financial app well:

- **JSONB** (with indexing) for any flexible fields — e.g. the `AuditLog` old/new value snapshots (§5).
- **Native row-level security (RLS)** — an optional DB-level second net behind the code-level tenant scoping (§4).
- **Field encryption** — app-level via JPA `AttributeConverter` + AES (§6), or `pgcrypto` if pushed to the DB.
- Widely available managed hosting (Render, Railway, Supabase, RDS, Neon).

**Decision: PostgreSQL, revisit only if a concrete need appears.**

**Migrations: `ddl-auto=update` for MVP** (ponytail: Hibernate auto-generates schema from `@Entity` classes — zero migration files, fastest to iterate solo). No rollback story and it can drift silently on renames/drops, so switch to **Flyway** the moment a second dev joins or prod has real user data worth protecting from a bad auto-migration.

---

## 3. Architecture

Standard layered Spring Boot architecture, one package per bounded module:

```
Controller → Service → Repository → Entity
                ↕
              DTO (request/response) + Mapper (MapStruct)
```

- **Controller**: HTTP concerns only — routing, status codes, `@Valid` request binding. No business logic.
- **Service**: business logic, transaction boundaries (`@Transactional`), orchestrates repositories, enforces tenant scoping.
- **Repository**: Spring Data JPA interfaces. All tenant-scoped queries take `businessId` explicitly — never a bare `findById`.
- **Entity**: JPA-mapped persistence model. Never returned directly from a controller.
- **DTO**: separate request/response shapes with Bean Validation annotations. Mapped to/from entities via **MapStruct** (compile-time, no reflection overhead, no hand-written boilerplate).

### Package layout

```
com.tinypayroll
 ├─ config/          SecurityConfig, JacksonConfig, OpenApiConfig, CorsProperties, AppProperties
 ├─ security/         JwtService, JwtAuthFilter, UserDetailsServiceImpl, AccessDeniedHandler
 ├─ tenant/           TenantContext (ThreadLocal via request scope), TenantInterceptor
 ├─ common/           BaseEntity (id, createdAt, updatedAt, auditing), ApiError, PageResponse<T>, exceptions/
 ├─ auth/             AuthController, AuthService, dto/ (SignupRequest, LoginRequest, TokenResponse)
 ├─ business/         BusinessController, BusinessService, BusinessRepository, Business entity, dto/, mapper/
 ├─ employee/         same shape
 ├─ attendance/       same shape
 ├─ payroll/          PayrollRunController/Service/Repository, PayrollRunItem, PayrollCalculationService, dto/
 ├─ report/           ReportController, ReportService (aggregation queries, CSV/PDF export)
 └─ audit/            AuditLogEntity, AuditLogService, @Auditable annotation + AOP aspect
```

---

## 4. Multi-tenancy model

Each signed-up business is a **tenant**. Given the target scale (small businesses, cost-sensitive), the right call is **shared schema, discriminator column** — not schema-per-tenant or DB-per-tenant (both are ops overhead this project doesn't need).

- Every tenant-owned table carries a `business_id` column (FK to `business.id`).
- **Enforcement happens in two layers, not one** (defense in depth):
  1. **Repository layer**: every query method takes `businessId` explicitly — e.g. `findByIdAndBusinessId(Long id, Long businessId)`. No repository method may fetch by bare `id` for tenant-owned entities.
  2. **Service layer**: pulls the current `businessId` from `TenantContext` (populated from the authenticated JWT's claims in `JwtAuthFilter`) and passes it into every repository call — never trusts a `businessId` from the request body/path.
- A Hibernate `@Filter` on tenant entities as a second safety net is a nice-to-have, not required for MVP — the explicit-argument pattern above is simpler to reason about and test.

`Business` doubles as the existing `BusinessConfig` type in the app — one row per tenant holds company profile + payroll settings (pay day, working days/month, OT rate), which is what makes payroll "very configurable" per business without any code change per tenant.

---

## 5. Domain model (entities)

All entities extend a `BaseEntity` (`id`, `createdAt`, `updatedAt` via `@CreatedDate`/`@LastModifiedDate` + `@EntityListeners(AuditingEntityListener.class)`).

### `Business` (tenant root)
| Field | Type | Notes |
|---|---|---|
| id | Long (PK) | |
| companyName | String | |
| industry | String | |
| gstin | String | nullable, validated format |
| address | String | |
| email, phone | String | |
| currency, currencySymbol | String | default `INR`, `₹` |
| payDay | int | 1–31 |
| workingDaysPerMonth | int | default 26 |
| otRate | BigDecimal | multiplier, e.g. 1.5 |
| autoReminders, whatsappPayslip | boolean | feature toggles per tenant |
| active | boolean | soft-disable a tenant |

### `AppUser` (login identity)
| Field | Type | Notes |
|---|---|---|
| id | Long (PK) | |
| business_id | FK → Business | |
| name, email | String | email unique, indexed |
| passwordHash | String | nullable — null for OAuth-only accounts. BCrypt, never exposed in any DTO |
| authProvider | enum: `LOCAL`, `GOOGLE` | default `LOCAL`; `GOOGLE` set once OAuth ships (see §6) |
| googleId | String | nullable, unique when set |
| role | enum: `OWNER`, `ADMIN`, `STAFF` | RBAC (see §6) |
| enabled, emailVerified | boolean | |
| failedLoginAttempts | int | brute-force lockout counter |
| lockedUntil | Instant | nullable |
| lastLoginAt | Instant | |

### `RefreshToken`
| id, user_id (FK), tokenHash, expiresAt, revoked, createdAt, deviceInfo |
|---|

Refresh tokens are stored **hashed** (never plaintext) so a DB leak doesn't hand out live sessions. Revocable individually (logout) or in bulk (logout-all-devices, password change).

### `Department` & `Designation` (org catalog)
Per-tenant catalogs so `Employee.role`/department are picked from a managed list instead of free text.
| `Department` | id, business_id (FK), name |
|---|
| `Designation` | id, business_id (FK), name, department_id (FK, nullable — a role can be unassigned/global) |

Employees reference these; a role with `department_id = null` is valid for any department. Managed via the catalog settings screen + CRUD endpoints below.

### `Employee`
Mirrors `src/types/index.ts` `Employee` + salary type + bank details:
| id, business_id (FK), name, role, department, department_id (FK → Department, nullable), designation_id (FK → Designation, nullable), baseSalary, salaryType (`MONTHLY`/`DAILY`), avatarUrl, status (`ACTIVE`/`INACTIVE`), joinDate, phone, bankAccountNumber (encrypted, see §6), bankName, ifsc |
|---|

### `AttendanceRecord`
| id, employee_id (FK), business_id (FK, denormalized for query/index efficiency), date, status (`PRESENT`/`ABSENT`/`LEAVE`/`HOLIDAY`/`WEEKEND`), markedByUserId, note |
|---|
Unique constraint: `(employee_id, date)` — one record per employee per day, upsert semantics on mark.

### `PayrollRun`
| id, business_id (FK), period (e.g. "2026-06"), month, year, status (`DRAFT`/`PENDING`/`PAID`/`FAILED`), totalAmount, runDate, paidAt, deletedAt (nullable — soft delete), createdByUserId |
|---|
Unique constraint: `(business_id, month, year, deleted_at)` — one **live** run per period per tenant. Postgres treats NULLs as distinct, so `deleted_at` in the constraint lets a soft-deleted period be recreated while still blocking a second live run. Runs can be created for any past or future month/year, not just the current one. Delete is soft (stamps `deletedAt`); list/get/reports exclude deleted rows.

### `PayrollRunItem`
Mirrors `PayrollRunItem`/`PayrollAdjustment` types exactly:
| id, payroll_run_id (FK), employee_id (FK), baseSalary, overtime, bonus, unpaidLeave, advances, deductions, finalSalary (computed, persisted for audit trail) |
|---|
Unique constraint: `(payroll_run_id, employee_id)`.

**Formula** (already implemented client-side in `src/utils/payroll.ts` — the backend is the source of truth going forward, app should defer to API response, not recompute):
```
finalSalary = baseSalary + overtime + bonus − unpaidLeave − advances − deductions
```
Computed once in `PayrollCalculationService`, unit-tested (see §9), never trusted from client input for a **finalized** run.

### `AuditLog`
| id, business_id, user_id, action, entityType, entityId, oldValue (JSON text), newValue (JSON text), ipAddress, createdAt |
|---|
Written via an `@Auditable` annotation + AOP aspect around service methods that mutate payroll runs, employee records, or business config — not hand-rolled per method.

---

## 6. Security

Non-negotiable list, all required for MVP (small-business payroll = sensitive financial + PII data):

- **Stateless JWT auth** — short-lived access token (~15 min) + rotating refresh token (~30 days, stored hashed, revocable). No server-side session state; `CSRF` disabled and documented as N/A (no cookie-based session to forge).
- **Auth methods**: email+password is the MVP login (matches the dummy `signIn`/`signUp` already wired in the app). **Google OAuth is planned, not MVP** — `authProvider`/`googleId` on `AppUser` (§5) exist from day one so adding it later is additive (no migration), but the actual `spring-boot-starter-oauth2-client` wiring + `/api/v1/auth/oauth/google` flow (§8) ships in Phase 1.5, once email/password is stable. Reason to delay: OAuth needs a verified Google Cloud OAuth consent screen + redirect URI per environment — avoidable setup cost for an MVP with no users yet.
- **Password hashing**: BCrypt, strength 12.
- **RBAC**: `OWNER` / `ADMIN` / `STAFF` roles enforced via `@PreAuthorize` at the service method level (not just controller) — e.g. only `OWNER`/`ADMIN` can finalize a payroll run or delete an employee.
- **Tenant isolation** enforced in code (§4), never solely trusted to the client-supplied `businessId`.
- **Brute-force protection**: lock account after 5 failed logins for 15 minutes (`failedLoginAttempts`/`lockedUntil` on `AppUser`); rate-limit `/auth/**` endpoints via **Bucket4j** regardless of account state.
- **Input validation**: Bean Validation (`@NotBlank`, `@Email`, `@Pattern` for GSTIN/IFSC/phone) on every request DTO; custom validators where format matters.
- **Centralized error handling**: `@RestControllerAdvice` → consistent `ApiError` shape (`timestamp`, `status`, `error`, `message`, `path`, `fieldErrors[]`), never leaks stack traces or entity internals.
- **Field-level encryption at rest**: `bankAccountNumber` via a JPA `AttributeConverter` (AES-256-GCM, key from env/secrets manager, never hardcoded).
- **Secrets management**: nothing sensitive in `application.yml` directly — all via `${ENV_VAR}` placeholders; local dev uses `.env` (gitignored) + `.env.example` committed; prod uses the platform's secret store (e.g. AWS Secrets Manager / Doppler) or env vars injected by the deploy pipeline.
- **Transport security**: HTTPS terminated at the load balancer/reverse proxy in prod; `Strict-Transport-Security` header enforced via Spring Security `headers()`.
- **Security headers**: HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, restrictive `Content-Security-Policy` if any web surface is added later.
- **CORS**: explicit allow-list of origins per environment (config property, not `*`).
- **SQL injection**: non-issue by construction — all queries via Spring Data JPA / parameterized `@Query`, no string-concatenated SQL anywhere (enforced by code review, not tooling).
- **Actuator hardening**: only `/actuator/health` and `/actuator/info` exposed publicly; `/actuator/env`, `/actuator/beans` etc. restricted to `ADMIN`-authenticated internal network or disabled in prod entirely.
- **Dependency scanning**: OWASP Dependency-Check (or Snyk) as a CI step — fail the build on high/critical CVEs.
- **Audit trail**: see `AuditLog` above — who changed what, when, on every payroll/employee/config mutation.

**Skipped for MVP** (name the ceiling, add when needed):
- Per-tenant DB-level RLS — the code-level enforcement in §4 is the ceiling; revisit only if you outgrow single-app-instance trust.
- 2FA — add once the app handles real bank transfers, not just record-keeping.

---

## 7. Configuration & environments

- **Spring profiles**: `dev`, `test`, `prod` via `application.yml` + `application-{profile}.yml` overrides. No profile-specific secrets committed.
- **12-factor config**: every environment-varying value (DB URL, JWT secret, CORS origins, mail/WhatsApp API keys) is an env var with a sane `dev` default and no default in `prod`.
- **`@ConfigurationProperties`** classes (not scattered `@Value`) for grouped config: `JwtProperties`, `CorsProperties`, `RateLimitProperties` — type-safe, validated at startup (`@Validated`), fails fast on misconfiguration.
- **Schema**: `ddl-auto=update` for MVP (see §2); revisit to Flyway once a second dev or real prod data exists.
- **Feature toggles**: `autoReminders`/`whatsappPayslip` already live per-tenant on `Business` (§5) — no global feature-flag service needed at this scale; that would be over-engineering for one flag pair.

---

## 8. API design

- Base path: `/api/v1/...` — versioned from day one so breaking changes don't strand the mobile client mid-rollout.
- Pagination: Spring Data `Pageable` (`?page=&size=&sort=`) on all list endpoints, wrapped in a `PageResponse<T>` (`content`, `page`, `size`, `totalElements`, `totalPages`).
- Consistent error shape (§6) on every 4xx/5xx.
- All request/response bodies are DTOs — entities never cross the controller boundary.
- Docs: **springdoc-openapi** (`/v3/api-docs`, Swagger UI at `/swagger-ui.html`, disabled in `prod` or gated behind `ADMIN` auth).

### Endpoint plan

**Auth** (public, rate-limited)
```
POST   /api/v1/auth/signup            create Business + OWNER AppUser
POST   /api/v1/auth/login             → access + refresh token
POST   /api/v1/auth/refresh           rotate refresh token
POST   /api/v1/auth/logout            revoke current refresh token
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password

# Phase 1.5 — Google OAuth (see §6)
GET    /api/v1/auth/oauth/google           redirect to Google consent screen
GET    /api/v1/auth/oauth/google/callback  exchange code → link/create AppUser → issue tokens
```

**Business** (`OWNER`/`ADMIN`)
```
GET    /api/v1/business/me
PUT    /api/v1/business/me
```

**Employees** (`OWNER`/`ADMIN` write, all roles read)
```
GET    /api/v1/employees?status=&page=&size=
POST   /api/v1/employees
GET    /api/v1/employees/{id}
PUT    /api/v1/employees/{id}
DELETE /api/v1/employees/{id}         soft delete → status INACTIVE
```

**Org catalog** (`OWNER`/`ADMIN` write, all roles read) — departments & designations picked when adding/editing employees
```
GET    /api/v1/departments
POST   /api/v1/departments
PUT    /api/v1/departments/{id}
DELETE /api/v1/departments/{id}
GET    /api/v1/designations
POST   /api/v1/designations
PUT    /api/v1/designations/{id}
DELETE /api/v1/designations/{id}
```

**Attendance** (`STAFF`+ can mark, `ADMIN`+ can edit past entries)
```
GET    /api/v1/attendance?month=&year=&employeeId=
POST   /api/v1/attendance             mark/upsert one or bulk
PUT    /api/v1/attendance/{id}
GET    /api/v1/attendance/summary?month=&year=
```

**Payroll** (`OWNER`/`ADMIN` only)
```
GET    /api/v1/payroll-runs?status=&page=&size=
POST   /api/v1/payroll-runs            create DRAFT for any (past/future) period, auto-seeded from attendance
GET    /api/v1/payroll-runs/{id}
PUT    /api/v1/payroll-runs/{id}/items/{itemId}       adjust bonus/advances/etc. pre-finalize
POST   /api/v1/payroll-runs/{id}/finalize             locks the run, status → PAID
DELETE /api/v1/payroll-runs/{id}                      soft delete → stamps deletedAt (any status)
GET    /api/v1/payroll-runs/{id}/payslip/{employeeId}
GET    /api/v1/payroll-runs/{id}/payslip/{employeeId}/pdf
```

**Reports**
```
GET    /api/v1/reports/expense-summary?from=&to=
GET    /api/v1/reports/attendance-summary?month=&year=
GET    /api/v1/reports/export?type=csv|pdf&from=&to=
```

---

## 9. Testing strategy

- **Unit tests**: services with JUnit 5 + Mockito, mocked repositories — this is where `PayrollCalculationService`'s formula gets its exhaustive test (matches the existing `payroll.ts` self-check pattern already in the repo).
- **Repository tests**: `@DataJpaTest` + **Testcontainers PostgreSQL** — real Postgres in CI, not H2, so constraint/index behavior matches prod (schema built via `ddl-auto=update` same as the app, per §2).
- **Controller tests**: `@WebMvcTest` + `MockMvc` for request validation, auth, and error-shape assertions.
- **Integration tests**: full `@SpringBootTest` + Testcontainers for the critical path — signup → add employee → mark attendance → run payroll → finalize → fetch payslip.
- CI: GitHub Actions — build, test, OWASP dependency check, then Docker image build.

---

## 10. Observability

- **Actuator** + **Micrometer** → Prometheus scrape endpoint (`/actuator/prometheus`), hardened per §6.
- **Structured logging**: Logback JSON encoder, `MDC`-injected request-correlation ID per request (filter sets it, included in every log line) — makes multi-tenant log tracing sane later.
- Skip full ELK/Grafana stack for MVP — ship logs to stdout, let the hosting platform aggregate; revisit once there's more than one instance to correlate across.

---

## 11. Roadmap

| Phase | Scope | Est. |
|---|---|---|
| **1 — MVP** | Auth (email/password signup/login/refresh), Business config, Employees CRUD, Attendance marking, Payroll run + finalize, Payslip view | 4–6 weeks |
| **1.5 — Google OAuth** | `spring-boot-starter-oauth2-client`, Google consent flow, account linking by email | 1 week |
| **2 — Team & polish** | Multi-user roles (`STAFF` invites), Reports export (CSV/PDF), WhatsApp payslip delivery, email reminders | 3–4 weeks |
| **3 — Scale-up** | Subscription/billing, multi-currency, offline-first sync for the mobile app, 2FA | as needed |

---

## 12. Open questions (need your call before implementation starts)

1. **Payslip PDF generation** — server-side (e.g. OpenPDF/iText) vs. client-side? Recommend server-side so the "source of truth" payslip is consistent regardless of client, and WhatsApp delivery (Phase 2) can attach it directly.
2. **Staff invites** (Phase 2) — email-link invite flow, or owner sets a temp password directly? Affects whether email delivery infra is needed for MVP or can wait.
3. **Hosting target** — self-managed (Docker Compose on a VPS) vs. managed (Railway/Render + a managed Postgres like Neon/Supabase/RDS)? Affects §7's secrets story and CI/CD deploy step.
