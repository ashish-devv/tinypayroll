# TinyPayroll Backend API Reference

Base URL: `http://localhost:8080/api/v1`
Auth: `Authorization: Bearer <accessToken>` on every endpoint except `/auth/**`.
Multi-tenant: `businessId` is always taken from the JWT (`CurrentUser`), never from the request body/path.

Roles: `OWNER` > `ADMIN` > `STAFF`. Where noted, an endpoint requires a minimum role via `@PreAuthorize`.

---

## auth (public, rate-limited)

### POST /auth/signup
Creates a Business + its OWNER user.
```json
// request
{ "companyName": "Acme Co", "ownerName": "Asha", "email": "asha@acme.com", "password": "min8chars" }
// 201 response (TokenResponse)
{ "accessToken": "...", "refreshToken": "...", "expiresInSeconds": 900, "userId": 1, "businessId": 1, "name": "Asha", "email": "asha@acme.com", "role": "OWNER" }
```

### POST /auth/login
```json
{ "email": "asha@acme.com", "password": "min8chars" }
// 200 -> TokenResponse (same shape as signup)
```

### POST /auth/refresh
```json
{ "refreshToken": "..." }
// 200 -> TokenResponse
```

### POST /auth/logout
```json
{ "refreshToken": "..." }
// 204 No Content
```

### POST /auth/forgot-password
```json
{ "email": "asha@acme.com" }
// 204 No Content (always, regardless of whether email exists)
```

### POST /auth/reset-password
```json
{ "token": "...", "newPassword": "min8chars" }
// 204 No Content
```

---

## business — requires auth; write = OWNER/ADMIN, read = any authenticated tenant member

### GET /business/me
Returns the current tenant's `BusinessResponse`.

### PUT /business/me — OWNER/ADMIN
```json
// request (UpdateBusinessRequest)
{
  "companyName": "Acme Co", "industry": "Retail", "gstin": "22AAAAA0000A1Z5",
  "address": "...", "email": "billing@acme.com", "phone": "+919999999999",
  "currency": "INR", "currencySymbol": "₹",
  "payDay": 5, "workingDaysPerMonth": 26, "otRate": 150.0,
  "autoReminders": true, "whatsappPayslip": false
}
// 200 -> BusinessResponse (adds "id" field)
```

---

## employees — requires auth; create/update/delete = OWNER/ADMIN

### GET /employees?status=ACTIVE&page=0&size=20
Paginated (`Pageable`), `status` optional filter (`ACTIVE`/`INACTIVE`). Returns `PageResponse<EmployeeResponse>`.

### GET /employees/{id}
Returns `EmployeeResponse`.

`EmployeeResponse` never carries a raw `bankAccountNumber` — it's always `ifscMasked`/`bankAccountMasked`.

### POST /employees — OWNER/ADMIN
```json
// request (CreateEmployeeRequest)
{
  "name": "Ravi Kumar", "role": "Cashier",
  "department": "Operations", "departmentId": 2, "designationId": 5,
  "baseSalary": 25000, "salaryType": "MONTHLY",
  "avatarUrl": null, "joinDate": "2026-01-15", "phone": "+919999999999",
  "bankAccountNumber": "1234567890", "bankName": "HDFC", "ifsc": "HDFC0001234"
}
// 201 -> EmployeeResponse
```
`salaryType` is `MONTHLY` or `DAILY`. `department`/`departmentId`/`designationId` are optional org-catalog links (see the **catalog** section); `role` is the free-text job title and stays required.

### PUT /employees/{id} — OWNER/ADMIN
Same body as create, plus required `status` (`ACTIVE`/`INACTIVE`). Returns `EmployeeResponse`.

### DELETE /employees/{id} — OWNER/ADMIN
Soft delete. 204 No Content.

---

## catalog (departments / designations) — requires auth; write = OWNER/ADMIN

Per-tenant org catalogs. Employees optionally link to a department/designation (see POST /employees). A designation with `departmentId: null` is a global role usable under any department.

### GET /departments
Returns `List<DepartmentResponse>` (`{ id, name }`).

### POST /departments — OWNER/ADMIN
```json
{ "name": "Operations" }
// 201 -> DepartmentResponse
```

### PUT /departments/{id} — OWNER/ADMIN
Same body as create. 200 -> `DepartmentResponse`.

### DELETE /departments/{id} — OWNER/ADMIN
204 No Content.

### GET /designations
Returns `List<DesignationResponse>` (`{ id, departmentId, name, defaultSalary, defaultSalaryType }`).

### POST /designations — OWNER/ADMIN
```json
{ "departmentId": 2, "name": "Cashier", "defaultSalary": 25000, "defaultSalaryType": "MONTHLY" }
// 201 -> DesignationResponse
```
`departmentId` nullable (global role). `defaultSalary`/`defaultSalaryType` optional — used to prefill the Add Employee form.

### PUT /designations/{id} — OWNER/ADMIN
Same body as create. 200 -> `DesignationResponse`.

### DELETE /designations/{id} — OWNER/ADMIN
204 No Content.

---

## attendance — requires auth; mark = OWNER/ADMIN/STAFF, edit past entry = OWNER/ADMIN

### GET /attendance?month=6&year=2026&employeeId=3
`employeeId` optional. Returns `List<AttendanceResponse>`.

### POST /attendance
Accepts a single record or a batch, both via the same wrapper body:
```json
{ "records": [ { "employeeId": 3, "date": "2026-06-01", "status": "PRESENT", "note": null } ] }
```
`status` is one of `PRESENT`, `ABSENT`, `LEAVE`, `HOLIDAY`, `WEEKEND`. Marking an existing (employeeId, date) pair **upserts** it.
201 -> a single `AttendanceResponse` if one record was sent, otherwise `List<AttendanceResponse>`.

### PUT /attendance/{id} — OWNER/ADMIN
```json
{ "status": "LEAVE", "note": "Approved sick leave" }
// 200 -> AttendanceResponse
```

### GET /attendance/summary?month=6&year=2026
Returns `AttendanceSummaryResponse` — per-employee counts of present/absent/leave/holiday/weekend days for the period.

---

## payroll-runs — requires auth; create/adjust/finalize = OWNER/ADMIN

### GET /payroll-runs
Returns `List<PayrollRunSummaryResponse>` (list-view row, no items).

### GET /payroll-runs/{id}
Returns full `PayrollRunResponse` including `items: List<PayrollRunItemResponse>`.

### POST /payroll-runs — OWNER/ADMIN
```json
{ "month": 6, "year": 2026 }
// 201 -> PayrollRunResponse (status DRAFT)
```
Accepts any past or future period. **Snapshot at creation:** items are seeded only for employees who are **ACTIVE** at the moment the run is created (`findByBusinessIdAndStatus(businessId, ACTIVE)`) — later hires/status changes do not retroactively alter an existing run. Auto-seeds items from attendance: `unpaidLeave = absentDays × dailyRate` (`dailyRate = baseSalary / workingDaysPerMonth` for MONTHLY, or `baseSalary` for DAILY). Rejects with 409 if a **live** (non-deleted) run already exists for that month/year — a soft-deleted period can be recreated.

### PUT /payroll-runs/{runId}/items/{itemId} — OWNER/ADMIN
```json
// request (PayrollAdjustment)
{ "overtime": 2000, "bonus": 5000, "unpaidLeave": 3000, "advances": 1000, "deductions": 500 }
// 200 -> PayrollRunResponse (item + run total recomputed)
```
`finalSalary = baseSalary + overtime + bonus − unpaidLeave − advances − deductions`. Rejects with 409 if the run is already PAID.

### POST /payroll-runs/{id}/finalize — OWNER/ADMIN
Marks the run PAID, sets `paidAt`. 200 -> `PayrollRunResponse`. Rejects with 409 on double-finalize.

### DELETE /payroll-runs/{id} — OWNER/ADMIN
Soft delete (sets `deletedAt`). 204 No Content. The period is excluded from list/get/reports and frees it up to be recreated (unique constraint is `(business_id, month, year, deleted_at)` — NULLs are distinct, so a live run still blocks duplicates).

### GET /payroll-runs/{id}/payslip/{employeeId}
Returns `PayslipResponse` (company header + one employee's line item) as JSON.

### GET /payroll-runs/{id}/payslip/{employeeId}/pdf
Streams a rendered payslip as `application/pdf` with a `Content-Disposition: attachment; filename="payslip-<period>-<employee>.pdf"` header. Renders the same fields as the JSON payslip via `PayslipPdfService` (HTML→PDF, openhtmltopdf).

---

## reports — requires auth

### GET /reports/expense-summary?from=2026-01-01&to=2026-06-30
Returns `ExpenseSummaryResponse` — total + one row per payroll run (`period`, `runDate`, `totalAmount`, `status`) whose `runDate` falls in range.

### GET /reports/attendance-summary?month=6&year=2026
Same shape/logic as `GET /attendance/summary`.

### GET /reports/export?type=csv&from=2026-01-01&to=2026-06-30
Streams `expense-summary.csv` (`period,runDate,status,totalAmount`) as `text/csv` with a `Content-Disposition: attachment` header.

### GET /reports/export?type=pdf&from=2026-01-01&to=2026-06-30
Streams `payroll-summary.pdf` as `application/pdf` with a `Content-Disposition: attachment` header. Renders company header, total/period-count/average stat cards, a per-run table (period, run date, status badge, amount), and a total-spend band via `ReportPdfService` (same letterhead style as the payslip PDF).

Any other `type` value returns **400 Bad Request** with a message.

---

## Enums reference

| Enum | Values |
|---|---|
| `Role` | `OWNER`, `ADMIN`, `STAFF` |
| `SalaryType` | `MONTHLY`, `DAILY` |
| `EmployeeStatus` | `ACTIVE`, `INACTIVE` |
| `AttendanceStatus` | `PRESENT`, `ABSENT`, `LEAVE`, `HOLIDAY`, `WEEKEND` |
| `PayrollRunStatus` | `DRAFT`, `PENDING`, `PAID`, `FAILED` |

## Error shape

All errors (validation, not-found, conflict, forbidden, auth) return the same `ApiError` JSON via `GlobalExceptionHandler` — status code varies (400/401/403/404/409).

## audit-logs (activity feed) — requires auth

Every employee create/update/delete, business config update, and payroll run create/adjust/finalize call is logged to `AuditLog` (business_id, user_id, action, entityType, newValue, ipAddress, timestamp) automatically via AOP (`@Auditable` → `AuditAspect`, best-effort in a `REQUIRES_NEW` tx so a logging failure never breaks the request).

### GET /audit-logs?page=0&size=20
Read-only, business-scoped, newest first. Backs the app's **Recent Activity** button and the **All Activity** screen (`app/activity.tsx`). Paginated (`Pageable`, `size` capped at **100**); returns `PageResponse<AuditLogResponse>`:
```json
{
  "content": [
    { "id": 42, "action": "CREATE_EMPLOYEE", "entityType": "Employee", "entityId": 8,
      "entityLabel": "Ravi Kumar", "createdAt": "2026-07-21T09:15:00Z" }
  ],
  "page": 0, "size": 20, "totalElements": 1, "totalPages": 1
}
```
`entityLabel` is a best-effort display name derived server-side from the logged `newValue` JSON; may be `null`. The client maps `action` → an icon + human phrasing (`src/services/activity.ts`) and caches each page for **10s** (stale-while-dedup) to spare the DB. Only the current tenant's rows are returned.

---

## Viewing the OpenAPI docs

The backend has `springdoc-openapi` wired in (`OpenApiConfig`). With the app running (`./mvnw spring-boot:run` from `backend/`, default profile `dev`, port `8080`):

- **Swagger UI** (interactive, try-it-out): http://localhost:8080/swagger-ui.html
- **Raw OpenAPI JSON**: http://localhost:8080/v3/api-docs

Swagger UI is disabled under the `test` profile (see `application-test.yml`) — it's only available when running with `dev` or `prod`.
