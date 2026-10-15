# TPP Careers release verification

Verification date: 2026-10-15
Branch: `codex/full-recruitment-management`  
Starting commit: `951ef5ec`

## Result legend

- **PASS** — executed successfully or verified directly against source/schema.
- **FAIL** — executed and did not satisfy the release requirement.
- **NOT TESTED** — could not be executed with the available environment or credentials.

## Release summary

The frontend builds and its automated tests pass. The 2026-10-15 fidelity pass aligned the recruiter shell, dashboard, requisition list, candidate roster, vacancy editor tabs, and candidate detail tabs with the checked-in design exports while preserving existing data operations.

The in-app browser webview did not attach during the 2026-10-15 pass, so the previously recorded public/unauthenticated browser results remain historical evidence and the newly changed authenticated surfaces are **NOT TESTED** in a browser.

The release is **not ready for production**. The locally linked Supabase project cannot be identified as staging, does not contain the recruitment-management migration, and no two independent recruiter credentials were available. The migration was not applied and no write was made to the configured project.

## Migration review

| Check | Result | Evidence and notes |
| --- | --- | --- |
| Existing-schema compatibility | **PASS** | Reviewed against all three existing migrations. The new migration is additive until the intentional public-view replacement and recruiter-directory policy replacement. A defect querying nonexistent recruiter `email`/`full_name` fields was fixed to use the existing `display_name` column. |
| Existing data preservation | **PASS** | Added vacancy/application columns have nullable values or defaults. No existing rows are deleted or rewritten. Existing applications receive `screening` and a `stage_updated_at` value. |
| Public vacancy compatibility | **PASS** | Existing view columns retain their order and new public-safe fields are appended. `client_name` and `created_by` remain excluded. |
| Review isolation | **PASS** | `(application_id, reviewer_id)` is the primary key. Insert/update policies require `reviewer_id = auth.uid()`. There is no delete grant for reviews. |
| Notes safety | **PASS** | Recruiters may read notes; authors alone may insert, update, or delete their own notes. Author identity is constrained to `recruiters`. |
| Stage-history attribution | **PASS** | Clients only receive `SELECT`; writes occur through the `SECURITY DEFINER` transition function after `is_recruiter()` validation. The function locks the application, updates the stage, and inserts the actor and transition atomically. |
| Template ownership | **PASS** | A permissive combined policy was found and fixed. Recruiters can read shared templates, but only the creating recruiter can insert, update, or delete their template. |
| Restricted grants | **PASS** | New internal tables revoke privileges from `public`, `anon`, and `authenticated`, then grant only the operations required by the RLS policies. Stage history is read-only to authenticated clients. |
| CV storage policy unchanged | **PASS** | The existing private `cvs` bucket and recruiter-only object `SELECT` policy remain unchanged. No public storage grant was introduced. |
| Service-role isolation | **PASS** | No service-role credential is present in browser code or frontend environment names. |
| Migration execution on staging | **NOT TESTED** | No confirmed staging target was available and applying the migration requires explicit confirmation. |
| Database rollback execution | **NOT TESTED** | No database was changed. See rollback considerations below. |

### Migration operational considerations

- `ALTER TABLE` and view/policy replacement take locks; apply during a staging maintenance window before estimating production impact.
- The migration is versioned and intentionally not idempotent (`CREATE TYPE`); it must be recorded and applied exactly once through the normal migration mechanism.
- Prefer a forward-fix after deployment. A down migration would be destructive because it must remove ratings, notes, history, templates, and new vacancy metadata.
- If rollback is unavoidable: first roll back the frontend, export all new-table data, remove the stage RPC and grants/policies, restore `recruiters_read_self` and the original public view, remove triggers/indexes/tables, remove added columns, and only then drop the enum types. This requires separate approval because it destroys newly created recruitment data.
- If migration execution fails inside the normal Supabase transactional migration runner, allow the transaction to roll back; do not manually drop partially observed objects without checking migration history.

## Environment and security verification

| Check | Result | Evidence and notes |
| --- | --- | --- |
| Supabase target configured | **PASS** | `.env.local` and `supabase/.temp/project-ref` both target project ref `clylfzjicejsmxbxioio` (`clylfzjicejsmxbxioio.supabase.co`). |
| Target confirmed as staging | **NOT TESTED** | Repository configuration does not label the project as staging or production, and no Supabase CLI/session was available to retrieve project metadata. It must be identified by an owner before any migration. |
| Recruitment migration state | **PASS** | Read-only REST probes show `public_vacancies.workplace_type` is absent and `application_reviews` is absent. The new migration has not been applied to the configured target. |
| Anonymous access to applications | **PASS** | Anonymous REST request returned `401 permission denied for table applications`. |
| Anonymous access to recruiters | **PASS** | Anonymous REST request returned `401 permission denied for table recruiters`. |
| Anonymous review access | **NOT TESTED** | The review table does not yet exist on the configured project. Static policy tests pass, but live RLS cannot be tested before staging migration. |
| Anonymous CV listing | **PASS** | Anonymous storage listing returned an empty result and disclosed no object names. |
| Anonymous access to a known CV object | **NOT TESTED** | No non-production CV fixture/path was available. An empty listing alone does not prove download denial for a known path. |
| Authenticated non-recruiter access | **NOT TESTED** | No unauthorised test-user credentials were available. |
| Two-recruiter independent ratings | **NOT TESTED** | Requires the migration, a staging application, and two recruiter accounts. |
| Two-recruiter notes and attribution | **NOT TESTED** | Requires the migration, a staging application, and two recruiter accounts. |
| Recruiter cannot overwrite another rating | **NOT TESTED** | Statically protected by composite key/RLS and covered by SQL assertions, but not executed against Postgres. |
| Stage-history actor attribution | **NOT TESTED** | Statically reviewed and covered by SQL assertions, but not executed against Postgres. |

## Workflow verification

| Check | Result | Evidence and notes |
| --- | --- | --- |
| Public vacancy listing loads | **PASS** | Browser loaded two public roles from the configured project without console errors. |
| Public vacancy search | **PASS** | Entering `Motion` reduced the visible results to “Motion Graphics Designer”. |
| Public vacancy details | **PASS** | Opened the live public role and verified role metadata, application inputs, CV control, consent controls, and Turnstile loading state. |
| Public application submission | **NOT TESTED** | The only configured target is not confirmed as staging. Submitting would create application/CV data in an unknown environment. |
| Submitted application appears internally | **NOT TESTED** | Depends on confirmed staging, migration, application submission, and recruiter credentials. |
| Recruiter review/rating/note/stage workflow | **NOT TESTED** | Depends on confirmed staging and recruiter credentials. |
| Secure CV preview/download | **NOT TESTED** | Depends on a staging application and recruiter session. |

## Browser route smoke tests

Executed with the local Vite server and a real browser. Console-error collection was empty for the tested routes.

| Route or interaction | Result | Observed behavior |
| --- | --- | --- |
| `/` | **PASS** | Careers page rendered and loaded public vacancies. |
| Public role search | **PASS** | Search filtered roles correctly. |
| `/jobs/motion-graphics-designer` | **PASS** | Public job and application form rendered. |
| `/jobs/nonexistent` | **PASS** | Unavailable-role state rendered. |
| `/login` | **PASS** | Login screen rendered; submitting empty required fields stayed on the page without a request or console error. |
| `/application-success` | **PASS** | Confirmation screen rendered. |
| `/dashboard` | **PASS** | Unauthenticated browser redirected to `/login`. |
| `/dashboard/pipeline` | **PASS** | Unauthenticated browser redirected to `/login`. |
| `/dashboard/candidates` | **PASS** | Unauthenticated browser redirected to `/login`. |
| `/dashboard/candidates/:applicationId` | **PASS** | Unauthenticated browser redirected to `/login`. |
| `/dashboard/templates` | **PASS** | Unauthenticated browser redirected to `/login`. |
| `/dashboard/vacancies` | **PASS** | Unauthenticated browser redirected to `/login`. |
| `/dashboard/vacancies/new` | **PASS** | Unauthenticated browser redirected to `/login`. |
| `/dashboard/vacancies/:id` | **PASS** | Unauthenticated browser redirected to `/login`. |
| `/dashboard/vacancies/:id/applicants` | **PASS** | Unauthenticated browser redirected to `/login`. |
| Unknown route | **PASS** | “Return home” fallback rendered. |
| Authenticated internal route rendering/interactions | **NOT TESTED** | No staging recruiter credentials and migration is absent from the configured target. |

## Automated checks

| Check | Result | Details |
| --- | --- | --- |
| `npm test -- --run` | **PASS** | 5 files, 14 tests passed on 2026-10-15. |
| `npm run build` | **PASS** | TypeScript and Vite production build completed successfully on 2026-10-15; 1,666 modules transformed. |
| Migration policy assertions | **PASS** | Review isolation, internal RLS, template ownership, and stage-history assertions passed. |
| Edge Function tests | **PASS** | 7 tests passed with `deno test --no-check --allow-read supabase/functions/submit-application/index_test.ts`. |
| Lint | **NOT TESTED** | The repository has no lint script or configured linter. |

## Design-reference comparison

The live Figma file could not be queried because its MCP Starter-plan call limit was reached. Comparison used the checked-in exported HTML screens and `DESIGN.md`.

| Area | Result | Difference |
| --- | --- | --- |
| Brand, type, and palette | **PASS** | Plus Jakarta Sans, violet/magenta accents, light surfaces, rounded controls, and compact typography are represented. |
| Public careers flow | **PASS** | Careers list, job detail/application, login, and confirmation follow the available references at a functional level. |
| Internal navigation | **PASS** | Updated to the available export's light 256px shell with global search, public-view action, compact header, profile identity, and responsive drawer. Out-of-scope destinations are not presented as working routes. |
| Dashboard composition | **PASS** | Now emphasizes live pipeline velocity, action required, priority mandates, and four database-driven operating metrics. |
| Candidate roster/detail | **PASS** | Roster is now a dense table; detail retains its deep-linked page and uses the required Profile, Q&A, and Notes tabs. |
| Vacancy management | **PASS** | Requisition list is now a dense table with live counts, filters, pagination, and actions; editor uses the required three-tab organization. |
| Exact Figma fidelity | **NOT TESTED** | Live Figma nodes, spacing, variants, and responsive frames remain unavailable for direct inspection. |

See `docs/DESIGN_FIDELITY.md` for unavailable references and the remaining comparison limits.

## Verified defects fixed during this pass

1. Candidate attribution queries referenced nonexistent `recruiters.email` and `recruiters.full_name` fields. They now select and render the existing `display_name` field.
2. The original combined template policy allowed any recruiter to delete another recruiter’s template or update it by changing ownership. It was replaced with shared read plus owner-only insert/update/delete policies.
3. Empty assessments are now saved as an empty string, matching the migration’s non-null assessment constraint.

## Release blockers and exact next actions

1. **Identify the linked project.** Confirm whether Supabase project `clylfzjicejsmxbxioio` is an isolated staging project. Do not approve migration execution if it contains production data.
2. **Prepare staging identities.** Provide or create two recruiter test accounts and one authenticated non-recruiter account. Add only the two recruiters to `public.recruiters`.
3. **Approve staging migration.** After target confirmation, explicitly approve applying `20261014000000_recruitment_management.sql` to that project.
4. **Seed disposable staging data.** Create one published vacancy with screening questions and a non-sensitive test CV/application.
5. **Execute the account matrix.** Test recruiter A and B ratings, attempts to overwrite each other, notes, stage changes, identities/timestamps, unauthorised database access, and signed-CV access/denial.
6. **Run authenticated browser tests.** Exercise dashboard, jobs, templates, candidate list/detail, pipeline movement, ratings, notes, CSV, and CV preview/download.
7. **Re-run build/tests and review the migration diff.** Only after all staging checks pass should production deployment approval be requested.

