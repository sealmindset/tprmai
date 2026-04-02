# Changelog

All notable changes to AI TPRM Machine will be documented in this file.

## [2.5.0] - 2026-04-01

### Changed
- **AI Provider**: Rewrote `anthropic_foundry` provider to use the Anthropic SDK instead of raw OpenAI-compatible fetch calls
- **Dual-mode auth**: API key (AZURE_AI_FOUNDRY_API_KEY) is used when set; falls back to DefaultAzureCredential (Entra ID) when empty
- **Env var naming**: Renamed AZURE_OPENAI_* to AZURE_AI_FOUNDRY_* to match actual Anthropic endpoint
- **Docker Compose**: AI provider env vars now passed through to the app container (were commented out)
- **Model deployments**: Configured for Sleep Number Azure AI Foundry (Opus 4.5, Sonnet 4.5, Haiku 4.5)

## [2.4.0] - 2026-03-20

### Removed
- **skills/** directory (8.6 MB) — generic Claude Code skills (pptx, algorithmic-art, canvas-design, etc.) unrelated to the TPRM app
- **diagrams/** directory — draw.io and mermaid TPRM process diagrams from original OneDrive import
- **DATABASE_SETUP.md** — outdated SQLite setup instructions (app now uses PostgreSQL via Docker)
- **TPRM-Process-Requirements.md** — original requirements doc from OneDrive import

### Changed
- Updated **CLAUDE.MD** with current tech stack (PostgreSQL, OIDC, RBAC, AI Safety, Docker) and accurate project structure
- Updated **.gitignore** to prevent removed directories from being re-added
- Cleaned up **TODO.md** — marked cleanup items complete

## [2.3.0] - 2026-03-17

### Added
- **Rich seed data**: 7 realistic vendors (Snowflake, Salesforce, CrowdStrike, Workday, Stripe, Acme Logistics, CloudSecure Analytics) with risk profiles, documents, assessments, findings, reports, and agent activity
- **Terraform infrastructure templates** (`infra/main.tf`): Azure Resource Group, PostgreSQL Flexible Server, Key Vault, Container Registry, App Service
- **Deployment configuration** (`.ship-it.yml`): Build, deploy, and rollback steps for local/staging/production
- **Security headers** in `next.config.js`: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy

### Changed
- Seed data expanded from 3 basic vendors to 7 fully-populated vendors with related entities across all tables
- `.gitignore` updated to exclude Terraform state files and production tfvars

## [2.2.0] - 2026-03-17

### Added
- **Reusable DataTable component** with sorting, pagination, and empty states (`src/components/ui/data-table.tsx`)
- **Assessments page** (`/assessments`) — list, filter, and search vendor risk assessments
- **Documents page** (`/documents`) — browse vendor security docs with status/expiration tracking
- **Reports page** (`/reports`) — view AI-generated risk reports with content preview dialog
- **Settings page** (`/settings`) — system info, user account details, AI agent configuration overview
- **Assessments API** (`/api/assessments`) — GET with vendor, status, and type filters
- **Reports API** (`/api/reports`) — GET with vendor, status, and type filters

### Changed
- Admin Users table upgraded from plain HTML to Radix UI Table component with Badge for status
- All sidebar navigation links now point to implemented pages (no more stubs)

## [2.1.0] - 2026-03-17

### Changed
- **BREAKING: Replaced LangChain with direct multi-provider AI abstraction**
  - New `src/lib/ai/provider.ts` supports 4 providers: Azure AI Foundry, Claude API, OpenAI, Ollama
  - Provider selected via `AI_PROVIDER` env var
  - Model tiering: complex/standard/simple mapped to `AI_MODEL_COMPLEX/STANDARD/SIMPLE` env vars
  - All 6 agents updated to use tier-based model selection
  - Document analysis route rewritten to use new provider
- Removed LangChain, @langchain/openai, @langchain/core, @langchain/anthropic dependencies
- Removed NextAuth, @auth/prisma-adapter, bcryptjs dependencies (leftover from Phase B)

### Added
- Multi-provider AI abstraction (`src/lib/ai/provider.ts`)
  - `chat()`, `complete()`, `completeJSON()` public API
  - Azure AI Foundry provider with Entra ID token auth and fallback model support
  - Claude API provider (direct Anthropic API)
  - OpenAI provider
  - Ollama provider (local inference)
- Agent tier assignments: CARA/SARA → complex, VERA/RITA/MARS → standard, DORA → simple
- `ChatMessage`, `ChatOptions`, `ChatResponse` types for provider-agnostic messaging

## [2.0.0] - 2026-03-17

### Changed
- **BREAKING: Replaced NextAuth with OIDC + stateless JWT authentication**
  - Login via SSO (mock-oidc in dev, any OIDC provider in production)
  - Stateless JWT cookie-based sessions (no server-side session store)
  - Removed NextAuth, @auth/prisma-adapter, bcryptjs dependencies
  - Removed "Continue to Demo" bypass on login page
- Consolidated 4 duplicate layouts into one shared authenticated layout using route group
- Sidebar navigation now shows/hides items based on user permissions
- Header displays real user name, role, and logout button

### Added
- Database-driven RBAC: Role, Permission, RolePermission models in Prisma
- 4 system roles: ADMIN, ANALYST, VIEWER, VENDOR with auto-generated permissions
- Per-resource CRUD permissions for all app pages (40+ permissions)
- `requirePermission(resource, action)` middleware on all API routes
- OIDC auth flow: /api/auth/login, /api/auth/callback, /api/auth/me, /api/auth/logout
- Auth context provider (useAuth hook) for frontend permission checking
- Route-protecting middleware (redirects unauthenticated users to /login)
- Admin UI: User Management page (/admin/users)
- Admin UI: Role Management page with permission matrix (/admin/roles)
- Admin API: CRUD endpoints for users, roles, and permissions
- Seed data: 4 roles, 40+ permissions, 4 users aligned with mock-oidc test users
- jose package for JWT signing/verification (Edge Runtime compatible)

### Security
- All API routes now require authentication (middleware) and authorization (permissions)
- Removed Google Fonts import (Zscaler-safe system fonts)
- Removed password-based authentication entirely
- User roles sourced from application database, never from OIDC claims

## [1.2.0] - 2026-03-16

### Changed
- Switched to Entra ID authentication for Azure AI Foundry (no API keys required)
- Uses `DefaultAzureCredential` from @azure/identity for seamless az login integration
- Removed API key requirements from base-agent.ts and document analysis route

### Added
- @azure/identity package for Azure authentication

### Documentation
- Updated .env.example with Entra ID auth instructions

## [1.1.0] - 2026-03-16

### Changed
- Clarified Claude via Azure AI Foundry as PRIMARY AI provider (OpenAI is optional alternative only)
- Updated document analysis route to use Azure AI Foundry instead of direct Anthropic SDK
- Replaced vulnerable `xlsx` package with `exceljs` for Excel file processing
- Updated route handlers for Next.js 16 async params compatibility
- Added Turbopack configuration for Next.js 16

### Fixed
- All npm security vulnerabilities resolved (0 remaining)
- Next.js upgraded from 14.2.0 to 16.1.6

### Documentation
- Updated .env.example to clarify AI provider hierarchy
- Updated CLAUDE.MD with current tech stack

## [1.0.0] - 2026-03-16

### Added
- Imported existing codebase from OneDrive to GitHub-managed local repository
- Set up make-it framework for structured development
- Created app-context.json with project configuration

### Project Structure (Imported)
- Next.js 16 frontend with Tailwind CSS and Radix UI
- Prisma ORM with SQLite database
- 6 AI Agents: VERA, CARA, DORA, SARA, RITA, MARS
- Core entities: Vendors, Risk Profiles, Risk Assessments, Documents, Risk Findings, Reports, Remediation Actions
- Authentication via NextAuth with role-based access (ADMIN, ANALYST, VIEWER, VENDOR)
- AuditBoard API integration skill

### Security
- ~~Identified Next.js 14.2.0 security vulnerability~~ (fixed in 1.1.0)
- ~~22 npm vulnerabilities detected~~ (fixed in 1.1.0)

---

## Pre-Import History

The original codebase was developed January - March 2026 in the "AI TPRM MACHINE" OneDrive folder. Key milestones:

- **Jan 5, 2026**: Initial project setup with Next.js
- **Jan 7, 2026**: PowerPoint generation scripts added
- **Feb 12, 2026**: AuditBoard integration skill created
- **Mar 5-6, 2026**: Database schema finalized, document processing scripts added
- **Mar 12, 2026**: Latest updates to components and dependencies
