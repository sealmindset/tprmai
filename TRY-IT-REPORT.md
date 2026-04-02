# AI TPRM Machine -- Try-It Report
> Tested: 2026-04-02 (v2.10.0)
> Status: All Passing (23 passed, 0 failed)

## Summary

Your app was tested automatically across 3 user roles and 8 pages.

| What Was Tested | Result |
|----------------|--------|
| App starts up | PASS |
| Login works (3 roles tested) | PASS |
| All pages load | 23 of 23 passing |
| Notification bell | PASS (18 unread for Admin) |
| Permissions work correctly | PASS |
| API is responding | PASS |
| Logout works | PASS |

## Login Testing

Each type of user was tested:

| User Type | Login | Dashboard | Pages Tested | Result |
|-----------|-------|-----------|-------------|--------|
| Admin (Alex Admin) | PASS | PASS | 8 of 8 | PASS |
| Analyst (Sam Analyst) | PASS | PASS | 6 of 6 | PASS |
| Viewer (Val Viewer) | PASS | PASS | 6 of 6 | PASS |

## Pages Tested

| Page | Admin | Analyst | Viewer | Notes |
|------|-------|---------|--------|-------|
| Dashboard | PASS | PASS | PASS | 78 vendors, 65 critical/high, 67% compliance |
| Vendors | PASS | PASS | PASS | Search + Excel filters: Industry, Risk Tier, Status |
| Assessments | PASS | PASS | PASS | Filters: Vendor, Type, Status, Risk Rating, Assessed By |
| Documents | PASS | PASS | PASS | Upload & Onboard, filters: Type, Vendor, Status, Source |
| Findings | PASS | PASS | PASS | 366 findings, filters: Vendor, Category, Severity, Status, ID'd By |
| Reports | PASS | PASS | PASS | Download: PDF/DOCX/MD/JSON/XML, filters: Type, Vendor, Status |
| Admin: Users | PASS | N/A | N/A | Search + filters: Role, Status |
| Admin: Prompts | PASS | N/A | N/A | Search + filters: Agent, Category, Tier, Status |

## API Testing

| Endpoint | Status | Notes |
|----------|--------|-------|
| GET /api/auth/login | PASS | OIDC redirect with state cookie |
| GET /api/auth/callback | PASS | Code exchange, JWT token set |
| GET /api/auth/me | PASS | Returns user profile with permissions |
| POST /api/auth/logout | PASS | Clears session |
| GET /api/vendors | PASS | 78 vendors with risk profiles |
| GET /api/assessments | PASS | Assessment list |
| GET /api/documents | PASS | Document list |
| GET /api/findings | PASS | 366 findings |
| GET /api/reports | PASS | Report list |
| GET /api/notifications/count | PASS | 18 unread |

## What's New in v2.10.0

- **Excel-style column filters on ALL tables** -- Every table now has consistent filter popovers (like Excel) on relevant columns with checkbox lists, counts, Select All/Clear All
- **Built-in search bar** -- Every table has an integrated search field
- **Consistent pagination** -- All tables show row counts and page navigation
- **Active filter bar** -- Applied filters are shown with one-click removal
- **Standardized 7 pages** -- Vendors, Assessments, Documents, Findings, Reports, Admin Users, Admin Prompts all use identical DataTable pattern

## Screenshots

Screenshots of each page (per role) are saved in `.try-it/screenshots/`:

**Admin (8 pages):**
- `admin_dashboard.png` - Risk dashboard with metrics and charts
- `admin_vendors.png` - Vendor list with filters
- `admin_assessments.png` - Assessment list
- `admin_documents.png` - Document library
- `admin_findings.png` - Risk findings with severity cards
- `admin_reports.png` - Reports with download options
- `admin_admin_users.png` - User management
- `admin_admin_prompts.png` - AI prompt management

**Analyst (6 pages):** `analyst_*.png`
**Viewer (6 pages):** `viewer_*.png`

## How to Access Your App

- **Open your browser to:** http://localhost:3020
- **To log in as Admin:** Click "Sign in with SSO", pick "Alex Admin" from the login screen
- **To log in as Analyst:** Click "Sign in with SSO", pick "Sam Analyst" from the login screen
- **To log in as Viewer:** Click "Sign in with SSO", pick "Val Viewer" from the login screen
- **To log in as Vendor:** Click "Sign in with SSO", pick "Vic Vendor" from the login screen

## Issues Found

None -- everything is working!

## What to Do Next
- Explore your app in the browser (see instructions above)
- Try the **Excel-style filters** on any table -- click the filter icon next to column headers
- Download a report in different formats from the **Reports** page
- Click the **bell icon** to see notifications
- If something doesn't look right, tell me and I'll fix it
- When you're happy with how it works, type **/ship-it** to deploy
- To make changes, type **/resume-it**
