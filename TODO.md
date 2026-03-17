# TODO - AI TPRM Machine

## High Priority

- [ ] **Environment: Configure AI credentials** - Update AZURE_OPENAI_API_KEY and related settings in .env for AI features (Claude via Azure AI Foundry)

## Medium Priority

- [ ] **Testing: Add test suite** - No tests currently exist. Add Jest/Vitest for unit tests, Playwright for E2E
- [ ] **UI: Review component completeness** - Check if all pages listed in features are implemented
- [ ] **AI Agents: Document agent workflows** - Create documentation for each agent's capabilities and triggers
- [ ] **API: Document endpoints** - Create API documentation for all routes
- [ ] **Tooling UX: Smoother /resume-it after /retrofit-it** - When a vibe coder exits Claude after using /retrofit-it and comes back via /resume-it, the experience feels disconnected. /resume-it should detect retrofit state, present clear context on what phase they're in, and make it obvious the user doesn't need to do anything technical -- just say what to work on next

## Low Priority

- [ ] **Cleanup: Remove unused scripts** - Many standalone .js scripts in root (create_*.js, read_*.js) - evaluate if needed
- [ ] **Cleanup: Remove Windows-specific files** - .bat files, node-v22 references may not be needed on Mac
- [ ] **CI/CD: Set up GitHub Actions** - Configure automated testing and deployment pipeline

## Completed

- [x] Import codebase to GitHub-managed local repository
- [x] Initialize git repository
- [x] Install npm dependencies
- [x] Create make-it framework files (app-context.json, CHANGELOG.md, TODO.md)
- [x] Initialize SQLite database (`npx prisma db push`)
- [x] Configure DATABASE_URL for SQLite
- [x] Fix TypeScript errors (JSON string fields, generic types)
- [x] Make LLM initialization lazy (build succeeds without AI credentials)
- [x] Consolidate dual app structure (merged /app and /src/app)
- [x] Verify build passes (`npm run build`)
- [x] **Security: Upgrade Next.js** - Upgraded from 14.2.0 to 16.1.6
- [x] **Security: Fix npm vulnerabilities** - All 22 vulnerabilities resolved (0 remaining)
- [x] **Docs: Update CLAUDE.MD** - Added Claude via Azure AI Foundry as primary AI provider
- [x] **Clarify AI provider** - Claude via Azure AI Foundry is PRIMARY, OpenAI is optional alternative only
- [x] **Replace xlsx with exceljs** - Fixed vulnerable xlsx dependency
- [x] **Retrofit Phase A** - Docker, PostgreSQL, mock-oidc
- [x] **Retrofit Phase B** - OIDC auth, database-driven RBAC, JWT sessions, admin UI, permission middleware
- [x] **Retrofit Phase C** - Multi-provider AI abstraction, model tiering, LangChain removal
