# AI TPRM Machine -- Try-It Report
> Tested: 2026-04-02 (v2.9.1)
> Status: All Passing (71 passed, 1 expected 403, 9 N/A)

## Summary

Your app was tested automatically across 4 user roles and 11 pages, plus the notification system.

| What Was Tested | Result |
|----------------|--------|
| App starts up | PASS |
| Login works (4 roles) | PASS |
| All pages load | 11 of 11 passing |
| Notification bell | PASS (Admin: 3 unread, Analyst: 4 unread, Viewer: 2 unread, Vendor: 0) |
| Permissions work correctly | PASS (Vendor role correctly denied reports API) |
| API is responding | PASS |
| Document upload (PDF fix) | PASS |
| Logout works | PASS |

## Login Testing

Each type of user was tested:

| User Type | Login | Dashboard | Pages Tested | Notifications | Result |
|-----------|-------|-----------|-------------|---------------|--------|
| Admin (Alex Admin) | PASS | PASS | 11 of 11 | 3 unread | PASS |
| Analyst (Sam Analyst) | PASS | PASS | 8 of 8 | 4 unread | PASS |
| Viewer (Val Viewer) | PASS | PASS | 8 of 8 | 2 unread | PASS |
| Vendor (Vic Vendor) | PASS | PASS | 8 of 8 | 0 unread | PASS |

## Pages Tested

| Page | Admin | Analyst | Viewer | Vendor | Notes |
|------|-------|---------|--------|--------|-------|
| Dashboard | PASS | PASS | PASS | PASS | 42 vendors, 35 critical/high, 67% compliance |
| Vendors | PASS | PASS | PASS | PASS | 20 vendors with risk tiers and scores |
| Assessments | PASS | PASS | PASS | PASS | Mixed statuses |
| Documents | PASS | PASS | PASS | PASS | "Upload & Onboard" button visible |
| Findings | PASS | PASS | PASS | PASS | Risk findings with severity levels |
| Reports | PASS | PASS | PASS | PASS | AI-generated reports with statuses |
| AI Agents | PASS | PASS | PASS | PASS | All 7 agents: VERA, CARA, DORA, SARA, RITA, MARS, AURA |
| Settings | PASS | PASS | PASS | PASS | System info, AI agents list (7), user details |
| Admin: Users | PASS | N/A | N/A | N/A | Admin only |
| Admin: Roles | PASS | N/A | N/A | N/A | Admin only |
| Admin: AI Instructions | PASS | N/A | N/A | N/A | Admin only -- prompt management |

## Notification System

| Feature | Status | Notes |
|---------|--------|-------|
| Bell icon in header | PASS | Shows unread badge count |
| Dropdown panel | PASS | Color-coded items with agent badges |
| Detail dialog | PASS | Full message, "Go to" navigation |
| Mark as read | PASS | Individual and "Mark all read" |
| 30s auto-polling | PASS | Lightweight count endpoint |
| Per-user scoping | PASS | Different counts per role (broadcast + targeted) |
| Vendor isolation | PASS | Vendor sees 0 (no internal notifications) |

## API Testing

| Endpoint | Admin | Analyst | Viewer | Vendor |
|----------|-------|---------|--------|--------|
| /api/vendors | PASS | PASS | PASS | PASS |
| /api/assessments | PASS | PASS | PASS | PASS |
| /api/documents | PASS | PASS | PASS | PASS |
| /api/reports | PASS | PASS | PASS | 403 (expected) |
| /api/dashboard/stats | PASS | PASS | PASS | PASS |
| /api/notifications/count | PASS | PASS | PASS | PASS |

## Seed Data

The database is populated with realistic test data:
- 42 vendors (Snowflake, Salesforce, CrowdStrike, Workday, Stripe, Acme Logistics, CloudSecure Analytics, and more)
- 56 risk assessments across multiple statuses
- 63 open findings (21 critical/high)
- Security documents (SOC 2, pen tests, questionnaires)
- AI-generated risk reports with approval workflows
- 8 managed AI prompts (VERA, CARA, DORA, SARA, RITA, MARS + AURA system/similarity)
- 5 notification seeds (escalations, remediation, document requests)
- 4 users with 4 roles and 40+ permissions

## Screenshots

Screenshots of each page (per role) are saved in `.try-it/screenshots/`:

- `admin_dashboard.png` - Risk dashboard with metrics and notification bell
- `admin_notifications.png` - Notification dropdown
- `analyst_notifications.png` - Notification dropdown
- `admin_ai-agents.png` - All 7 AI agents including AURA
- `admin_vendors.png` - Vendor list with risk tiers
- `admin_findings.png` - Risk findings table
- `admin_ai-instructions.png` - AI prompt management admin
- `admin_settings.png` - Settings with all 7 agents listed
- `{role}_*.png` - Every page per role

## Fixes Applied in v2.9.1

- **PDF upload fix**: Document upload was failing because the PDF parsing library tried to load a test file that doesn't exist in production. Fixed by providing a custom page renderer that bypasses the test file dependency.

## How to Access Your App

- **Open your browser to:** http://localhost:3020
- **To log in as Admin:** Click "Sign in with SSO", pick "Alex Admin" from the login screen
- **To log in as Analyst:** Click "Sign in with SSO", pick "Sam Analyst" from the login screen
- **To log in as Viewer:** Click "Sign in with SSO", pick "Val Viewer" from the login screen
- **To log in as Vendor:** Click "Sign in with SSO", pick "Vic Vendor" from the login screen

## What's New in v2.9.1

- **PDF upload fix**: Document upload now works correctly for PDF files
- **All 7 AI agents visible**: AURA now appears on the Settings page alongside VERA, CARA, DORA, SARA, RITA, MARS

## Issues Found

No issues found. The one 403 response (Vendor accessing /api/reports) is correct RBAC behavior -- Vendor users don't have permission to view reports.

## What to Do Next
- Explore your app in the browser (see instructions above)
- Click the **bell icon** to see your notifications -- try it as different users!
- Try uploading a document on the **Documents** page -- PDF upload is now working!
- If something doesn't look right, tell me and I'll fix it
- When you're happy with how it works, type **/ship-it** to deploy
- To make changes, type **/resume-it**
