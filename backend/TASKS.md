# Backend build tracker

Building the Spring Boot MVP backend per `../PRD.md`, to match domain shapes in `../src/types/index.ts`
and formula in `../src/utils/payroll.ts`. Package layout follows PRD §3.

Status legend: `[ ]` todo · `[~]` in progress · `[x]` done

## Setup
- [x] pom.xml — lombok + mapstruct annotation processor wiring (maven-compiler-plugin)
- [x] application.yml (base) + application-dev/test/prod.yml profiles, replaced application.properties
- [x] .env.example + .gitignore entry for .env

## common/
- [x] BaseEntity (id, createdAt, updatedAt, auditing)
- [x] ApiError
- [x] PageResponse<T>
- [x] exceptions/ (NotFoundException, ConflictException, ForbiddenException, LockedAccountException)
- [x] GlobalExceptionHandler (@RestControllerAdvice)

## tenant/
- [x] TenantContext (ThreadLocal) — populated/cleared directly by JwtAuthFilter (no separate interceptor needed)

## security/
- [x] JwtProperties (@ConfigurationProperties)
- [x] JwtService (access token) + RefreshTokenGenerator (opaque, hashed refresh tokens)
- [x] UserPrincipal / AuthUserDetails
- [x] JwtAuthFilter (populates SecurityContext + TenantContext from claims)
- [x] UserDetailsServiceImpl
- [x] RestAccessDeniedHandler / RestAuthenticationEntryPoint

## config/
- [x] SecurityConfig (filter chain, RBAC via @EnableMethodSecurity, headers, CORS)
- [x] CorsProperties
- [x] JacksonConfig
- [x] OpenApiConfig (springdoc)
- [x] RateLimitProperties + Bucket4j RateLimitFilter for /auth/**
- [x] JpaAuditingConfig (@EnableJpaAuditing)
- [x] AppProperties + ConfigPropertiesRegistration (@ConfigurationPropertiesScan)

## auth/
- [x] AuthProvider, Role enums
- [x] AppUser, RefreshToken, PasswordResetToken entities + repositories
- [x] dto/ (SignupRequest, LoginRequest, TokenResponse, RefreshRequest, ForgotPasswordRequest, ResetPasswordRequest)
- [x] AuthService (signup, login, refresh, logout, forgot/reset-password, lockout logic)
- [x] AuthController

## business/
- [x] Business entity (tenant root)
- [x] dto/ (BusinessResponse, UpdateBusinessRequest) + mapper/ (MapStruct)
- [x] BusinessRepository / Service / Controller (GET/PUT /me)

## employee/
- [x] EncryptionProperties + BankAccountEncryptor (AES-256-GCM AttributeConverter for bankAccountNumber)
- [x] EmployeeStatus, SalaryType enums + Employee entity
- [x] dto/ (EmployeeResponse w/ masked bank fields, Create/UpdateEmployeeRequest) + mapper/
- [x] EmployeeRepository / Service (tenant-scoped, soft delete) / Controller CRUD

(security/ also gained CurrentUser helper for pulling businessId/userId in controllers)

## attendance/
- [x] AttendanceStatus enum + AttendanceRecord entity (unique business_id/employee_id+date)
- [x] dto/ (AttendanceResponse, Mark/BulkMark/UpdateAttendanceRequest, AttendanceSummaryResponse) + mapper/
- [x] AttendanceRepository / Service (upsert on mark, bulk mark, ADMIN+ edit past entry, monthly summary) / Controller

(EmployeeRepository gained findByBusinessId(businessId) — no pagination — for summary aggregation)

## payroll/
- [x] PayrollRun + PayrollRunItem entities (unique business_id/month/year, run_id/employee_id)
- [x] PayrollCalculationService (matches payroll.ts formula, unit tested)
- [x] dto/ (PayrollRunResponse, PayrollRunSummaryResponse, PayrollRunItemResponse, CreatePayrollRunRequest, PayrollAdjustment, PayslipResponse)
- [x] PayrollRunRepository / PayrollRunItemRepository / Service (attendance-driven draft seeding, item adjust, finalize) / Controller
- [x] Payslip endpoint (JSON; PDF export deferred to report/ phase — PRD §11 lists PDF/CSV export under Phase 2)

## report/
- [x] ReportService (expense-summary over payroll runs by runDate range, attendance-summary delegates to AttendanceService)
- [x] ReportController (GET expense-summary, attendance-summary, export?type=csv — real CSV; type=pdf 400s with a clear message, PDF export is Phase 2 per PRD §11)

## audit/
- [x] AuditLog entity (business_id, user_id, action, entityType, entityId, newValue JSON, ipAddress, createdAt)
- [x] @Auditable annotation + AuditAspect (@Around, logs after successful mutation; oldValue diffing skipped — ponytail, add when a real audit review needs it)
- [x] AuditLogService — wired onto EmployeeService.create/update/softDelete, BusinessService.updateCurrent, PayrollRunService.create/adjustItem/finalizeRun
- [x] AuditLogController — `GET /api/v1/audit-logs?page=&size=` (business-scoped, newest first, `size` capped at 100) returns `PageResponse<AuditLogResponse>` for the app's Recent Activity feed; `entityLabel` derived best-effort from the `newValue` JSON
- (pom.xml gained aspectjweaver 1.9.22.1 for @Aspect annotation support)

## tests
- [x] PayrollCalculationServiceTest (matches payroll.ts self-check, passes)
- [x] BackendApplicationTests now uses Testcontainers MySQL (@Container + @DynamicPropertySource) per PRD §9, replacing the missing-datasource failure — needs Docker running locally/CI to execute; wiring compiles, could not run end-to-end here (no Docker daemon in this environment)

## final
- [x] mvn -q compile passes clean (also fixed pre-existing SecurityConfig DaoAuthenticationProvider bug)
