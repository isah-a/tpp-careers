# TPP Careers implementation plan

## Design evidence

- Figma file: `iHa0BUP548ppPpIPuFmxpZ`.
- Figma MCP is installed but unavailable for this run because the Starter-plan call limit has been reached.
- Exact live-node spacing, typography, component variants, interactions, and responsive frames cannot be independently verified.
- Implementation is calibrated against the repository's exported dashboard, vacancy, applicant, public careers, login, and confirmation screens plus `stitch_tpp_careers_portal/vibrant_talent_infrastructure/DESIGN.md`.
- No unverified Figma-only visual specifications are invented.

## Reused functionality

- Recruiter authentication and allow-list membership checks.
- Protected recruiter routes and shared public/recruiter layouts.
- Vacancy CRUD and public-safe vacancy views.
- Screening-question editor and public answer capture.
- Turnstile-protected application submission Edge Function.
- Private CV bucket, signed recruiter downloads, validation, duplicate protection, and submission rate limits.
- Applicant CSV export and application validation tests.

## Feature inventory and checklist

### Database and security

- [x] Preserve existing vacancy/application records with additive migration only.
- [x] Add structured vacancy compensation, department, workplace, dates, skills, and benefits.
- [x] Add reusable recruiter-owned job templates.
- [x] Add application pipeline stages.
- [x] Add per-application, per-recruiter 1-5 star assessments.
- [x] Add attributed internal notes.
- [x] Add immutable stage history through a recruiter-only RPC.
- [x] Add recruiter-only RLS policies and grants for every internal table.
- [x] Keep CV storage private and service-role credentials server-only.

### Recruiter workspace

- [x] Database-driven dashboard metrics, stage distribution, recent vacancies, and quick actions.
- [x] Vacancy list search, status tabs, employment/workplace filters, pagination, and actions.
- [x] Vacancy create/edit/publish/close flow with richer job fields.
- [x] Screening-question create/edit/remove and vacancy association.
- [x] Template list, create-from-vacancy, use, and delete flows.
- [x] Cross-vacancy candidate pipeline grouped by stage.
- [x] Vacancy applicant list with search, stage filtering, pagination, CSV, and candidate links.
- [x] Candidate detail with profile, screening responses, secure CV actions, stage controls, ratings, notes, and history.
- [x] Responsive recruiter navigation and empty/loading/error/success states.

### Public integration

- [x] Preserve published-vacancy projection and public listing.
- [x] Show richer public vacancy metadata when present.
- [x] Preserve application submission, Turnstile, AI consent, CV validation, and screening answers.

### Verification

- [ ] Apply migration to a staging Supabase project.
- [ ] Run database policy/integration tests against staging.
- [ ] Verify recruiter A and recruiter B can rate one application independently.
- [ ] Verify unauthorised and anonymous access is denied to all internal records and CVs.
- [x] Run frontend tests, typecheck/build, and Edge Function tests.
- [ ] Manually compare implemented routes with live Figma when MCP access is restored.

## Deployment sequence

1. Apply `supabase/migrations/20261014000000_recruitment_management.sql` to staging.
2. Run the staging security and multi-recruiter verification checklist.
3. Deploy the unchanged `submit-application` function only if the target environment does not already have the current version.
4. Deploy the frontend after migration success.

