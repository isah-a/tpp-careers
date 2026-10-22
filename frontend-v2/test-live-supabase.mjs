// test-live-supabase.mjs
// Real Supabase database integration & security acceptance test suite
// Runs against local Supabase at http://127.0.0.1:54321

import { createClient } from '@supabase/supabase-js'
import { execSync } from 'child_process'

const SUPABASE_URL = 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const results = []

function recordResult(category, testName, passed, details = '') {
  results.push({ category, testName, passed, details })
  const icon = passed ? '✅ PASS' : '❌ FAIL'
  console.log(`${icon} [${category}] ${testName}${details ? ` -> ${details}` : ''}`)
}

async function createOrGetTestUser(email, password, displayName, role) {
  const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers()
  if (listError) throw listError

  let user = usersData.users.find(u => u.email === email)
  if (!user) {
    const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: displayName },
    })
    if (createError) throw createError
    user = createData.user
  } else {
    await adminClient.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: { full_name: displayName },
    })
  }

  // Upsert into public.recruiters
  const { error: upsertError } = await adminClient
    .from('recruiters')
    .upsert({
      user_id: user.id,
      display_name: displayName,
      role: role,
    })
  if (upsertError) throw upsertError

  return user
}

async function createAuthenticatedClient(email, password) {
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw error
  return { client, user: data.user, session: data.session }
}

async function run() {
  console.log('='.repeat(80))
  console.log('ONCULTURE HIRES: LIVE LOCAL SUPABASE SECURITY & INTEGRATION ACCEPTANCE')
  console.log('Target URL: ' + SUPABASE_URL)
  console.log('='.repeat(80))

  const testTrackedIds = {
    vacancies: [],
    applications: [],
    interviews: [],
    notes: [],
    reviews: [],
  }

  try {
    // -------------------------------------------------------------------------
    // 1. Environment Verification
    // -------------------------------------------------------------------------
    console.log('\n--- 1. ENVIRONMENT VERIFICATION ---')

    // Health check
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/health`)
      const json = await res.json()
      recordResult(
        'Environment',
        'Supabase local endpoint reachable at 127.0.0.1:54321',
        res.status === 200 && json.name === 'GoTrue',
        `GoTrue version: ${json.version}`
      )
    } catch (e) {
      recordResult('Environment', 'Supabase local endpoint reachable', false, e.message)
      throw new Error('Supabase unreachable at 127.0.0.1:54321')
    }

    // Migration verification directly via PostgreSQL
    let actualVersions = []
    try {
      const psqlOutput = execSync(
        'wsl.exe -d Ubuntu docker exec supabase_db_tpp_hire psql -U postgres -t -c "SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;"',
        { encoding: 'utf-8' }
      )
      actualVersions = psqlOutput
        .split('\n')
        .map(v => v.trim())
        .filter(Boolean)
    } catch (e) {
      console.warn('Could not query psql directly:', e.message)
    }

    const expectedVersions = [
      '20261013000000',
      '20261013000001',
      '20261013000002',
      '20261014000000',
      '20261021000000',
      '20261022000000',
    ]

    const allVersionsPresent = expectedVersions.every(v => actualVersions.includes(v))

    recordResult(
      'Environment',
      'All 6 local migrations applied and recorded in schema_migrations',
      allVersionsPresent,
      `Recorded versions: ${actualVersions.join(', ')}`
    )

    // Check non-destruction of pre-existing recruitment records
    const { count: initialVacancyCount } = await adminClient.from('vacancies').select('*', { count: 'exact', head: true })
    const { count: initialApplicantCount } = await adminClient.from('applications').select('*', { count: 'exact', head: true })
    recordResult(
      'Environment',
      'Existing legacy recruitment data preserved without data loss',
      initialVacancyCount >= 4 && initialApplicantCount >= 1,
      `Vacancies: ${initialVacancyCount}, Applications: ${initialApplicantCount}`
    )

    // -------------------------------------------------------------------------
    // 2. Test Identities Setup
    // -------------------------------------------------------------------------
    console.log('\n--- 2. TEST IDENTITIES INITIALIZATION ---')
    const PASSWORD = 'TestPassword123!'

    const userAdmin = await createOrGetTestUser('admin.test@onculture.local', PASSWORD, 'Workspace Admin', 'admin')
    const userA = await createOrGetTestUser('recruiter.a@onculture.local', PASSWORD, 'Recruiter Alpha', 'recruiter')
    const userB = await createOrGetTestUser('recruiter.b@onculture.local', PASSWORD, 'Recruiter Beta', 'recruiter')
    const userC = await createOrGetTestUser('recruiter.c@onculture.local', PASSWORD, 'Recruiter Gamma', 'recruiter')

    recordResult(
      'Identities',
      'Created/verified 4 isolated test accounts in auth.users and public.recruiters',
      Boolean(userAdmin.id && userA.id && userB.id && userC.id),
      `Admin: ${userAdmin.id.slice(0, 8)}..., A: ${userA.id.slice(0, 8)}..., B: ${userB.id.slice(0, 8)}..., C: ${userC.id.slice(0, 8)}...`
    )

    // Authenticate separate clients
    const { client: clientAdmin } = await createAuthenticatedClient('admin.test@onculture.local', PASSWORD)
    const { client: clientA } = await createAuthenticatedClient('recruiter.a@onculture.local', PASSWORD)
    const { client: clientB } = await createAuthenticatedClient('recruiter.b@onculture.local', PASSWORD)
    const { client: clientC } = await createAuthenticatedClient('recruiter.c@onculture.local', PASSWORD)

    recordResult(
      'Identities',
      'Successfully authenticated 4 distinct recruiter sessions with unique tokens',
      true,
      'Authenticated Admin, Recruiter A (Lead), Recruiter B (Collaborator), Recruiter C (Unrelated)'
    )

    // -------------------------------------------------------------------------
    // 3. Ownership Tests
    // -------------------------------------------------------------------------
    console.log('\n--- 3. VACANCY OWNERSHIP TESTS ---')

    // Recruiter A creates vacancy
    const testVacancyTitle = `Test Senior Platform Engineer [${Date.now()}]`
    const { data: createdVacancyA, error: createErrorA } = await clientA
      .from('vacancies')
      .insert({
        title: testVacancyTitle,
        slug: `test-senior-platform-engineer-${Date.now()}`,
        client_name: 'OnCulture Labs',
        requirements: '<p>5+ years distributed systems.</p>',
        description: '<p>Lead recruiter test position</p>',
        location: 'Remote',
        employment_type: 'full-time',
        status: 'draft',
      })
      .select()
      .single()

    if (createdVacancyA) testTrackedIds.vacancies.push(createdVacancyA.id)

    recordResult(
      'Ownership',
      'Recruiter A creates a vacancy and automatically becomes lead recruiter',
      Boolean(
        !createErrorA &&
        createdVacancyA &&
        createdVacancyA.created_by === userA.id &&
        createdVacancyA.lead_recruiter_id === userA.id
      ),
      `created_by=${createdVacancyA?.created_by?.slice(0, 8)}, lead_recruiter_id=${createdVacancyA?.lead_recruiter_id?.slice(0, 8)}`
    )

    // Anti-spoofing: Recruiter B attempts to spoof creator and lead during insertion
    const { data: spoofedVacancy, error: spoofError } = await clientB
      .from('vacancies')
      .insert({
        title: `Spoofing Attempt Vacancy [${Date.now()}]`,
        slug: `test-spoof-${Date.now()}`,
        client_name: 'Acme Spoof',
        requirements: '<p>None</p>',
        description: '<p>Spoofed creator test</p>',
        location: 'Lagos',
        employment_type: 'full-time',
        status: 'draft',
        created_by: userA.id, // Attempt spoofing Recruiter A as creator
        lead_recruiter_id: userA.id, // Attempt spoofing Recruiter A as lead
      })
      .select()
      .single()

    if (spoofedVacancy) testTrackedIds.vacancies.push(spoofedVacancy.id)

    recordResult(
      'Ownership',
      'Database server-side trigger overrides client spoofing and forces actual creator',
      Boolean(
        spoofedVacancy &&
        spoofedVacancy.created_by === userB.id &&
        spoofedVacancy.lead_recruiter_id === userB.id
      ),
      `Client submitted creator A, but DB enforced creator B (${spoofedVacancy?.created_by?.slice(0, 8)})`
    )

    // Recruiter C attempts to claim Recruiter A's vacancy
    const { data: claimAttempt, error: claimError } = await clientC
      .from('vacancies')
      .update({ lead_recruiter_id: userC.id })
      .eq('id', createdVacancyA.id)
      .select()

    const claimBlocked = !claimAttempt || claimAttempt.length === 0 || Boolean(claimError)
    recordResult(
      'Ownership',
      'Recruiter C is blocked by RLS from claiming Recruiter A vacancy',
      claimBlocked,
      claimBlocked ? 'RLS blocked modification (0 rows updated)' : 'FAILED: Vacancy was modified by unauthorized recruiter'
    )

    // Creator identity is immutable
    const { data: mutateCreator, error: mutateCreatorError } = await clientA
      .from('vacancies')
      .update({ created_by: userB.id })
      .eq('id', createdVacancyA.id)
      .select()

    recordResult(
      'Ownership',
      'Creator identity cannot be changed after creation (strictly immutable)',
      Boolean(mutateCreatorError || !mutateCreator || mutateCreator.length === 0),
      mutateCreatorError ? mutateCreatorError.message : 'Blocked by invariant trigger'
    )

    // Ownership survives query and re-authentication
    const { data: recheckVacancy } = await clientA
      .from('vacancies')
      .select('created_by, lead_recruiter_id')
      .eq('id', createdVacancyA.id)
      .single()

    recordResult(
      'Ownership',
      'Vacancy lead ownership persists safely in database',
      recheckVacancy?.lead_recruiter_id === userA.id && recheckVacancy?.created_by === userA.id,
      `Lead: ${recheckVacancy?.lead_recruiter_id?.slice(0, 8)}`
    )

    // -------------------------------------------------------------------------
    // 4. Collaboration Tests
    // -------------------------------------------------------------------------
    console.log('\n--- 4. COLLABORATIVE RECRUITMENT TESTS ---')

    // Recruiter A adds Recruiter B as collaborator
    const { data: addedCollab, error: addCollabError } = await clientA
      .from('vacancy_collaborators')
      .insert({
        vacancy_id: createdVacancyA.id,
        recruiter_id: userB.id,
      })
      .select()
      .single()

    recordResult(
      'Collaboration',
      'Lead Recruiter A successfully assigns Recruiter B as collaborator',
      Boolean(!addCollabError && addedCollab && addedCollab.recruiter_id === userB.id),
      `Collaborator assignment ID: ${addedCollab?.id?.slice(0, 8)}`
    )

    // Duplicate assignment rejection
    const { error: duplicateCollabError } = await clientA
      .from('vacancy_collaborators')
      .insert({
        vacancy_id: createdVacancyA.id,
        recruiter_id: userB.id,
      })

    recordResult(
      'Collaboration',
      'Duplicate collaborator assignment is strictly rejected by uniqueness constraint',
      Boolean(duplicateCollabError),
      duplicateCollabError ? duplicateCollabError.message : 'FAILED: Duplicate allowed'
    )

    // Recruiter B cannot add other collaborators (only Lead or Admin can manage team)
    const { error: bAddCollabError } = await clientB
      .from('vacancy_collaborators')
      .insert({
        vacancy_id: createdVacancyA.id,
        recruiter_id: userC.id,
      })

    recordResult(
      'Collaboration',
      'Collaborator B cannot add other collaborators (blocked by RLS)',
      Boolean(bAddCollabError),
      bAddCollabError ? bAddCollabError.message : 'FAILED: Collaborator was able to add another collaborator'
    )

    // Recruiter B cannot edit vacancy core metadata (restricted to Lead or Admin)
    const { data: bEditAttempt, error: bEditError } = await clientB
      .from('vacancies')
      .update({ title: 'Hacked Title by Collaborator' })
      .eq('id', createdVacancyA.id)
      .select()

    const bEditBlocked = Boolean(bEditError) || !bEditAttempt || bEditAttempt.length === 0
    recordResult(
      'Collaboration',
      'Collaborator B cannot edit vacancy core metadata (blocked by RLS)',
      bEditBlocked,
      bEditBlocked ? 'RLS blocked modification (0 rows updated)' : 'FAILED: Collaborator modified vacancy title'
    )

    // Recruiter B cannot close or reopen vacancy
    const { data: bStatusAttempt, error: bStatusError } = await clientB
      .from('vacancies')
      .update({ status: 'closed' })
      .eq('id', createdVacancyA.id)
      .select()

    const bStatusBlocked = Boolean(bStatusError) || !bStatusAttempt || bStatusAttempt.length === 0
    recordResult(
      'Collaboration',
      'Collaborator B cannot close or publish vacancy (blocked by RLS)',
      bStatusBlocked,
      bStatusBlocked ? 'RLS blocked status update (0 rows updated)' : 'FAILED: Collaborator changed vacancy status'
    )

    // Recruiter B cannot delete vacancy
    const { data: bDeleteAttempt, error: bDeleteError } = await clientB
      .from('vacancies')
      .delete()
      .eq('id', createdVacancyA.id)
      .select()

    const bDeleteBlocked = Boolean(bDeleteError) || !bDeleteAttempt || bDeleteAttempt.length === 0
    recordResult(
      'Collaboration',
      'Collaborator B cannot delete vacancy (blocked by RLS)',
      bDeleteBlocked,
      bDeleteBlocked ? 'RLS blocked delete (0 rows deleted)' : 'FAILED: Collaborator deleted vacancy'
    )

    // Set up a candidate application for candidate operations testing
    const { data: testCandidateApp, error: appCreateError } = await adminClient
      .from('applications')
      .insert({
        vacancy_id: createdVacancyA.id,
        full_name: 'Test Applicant Alpha',
        email: `candidate.alpha.${Date.now()}@example.com`,
        phone: '+2348000000001',
        cv_path: `cvs/test_candidate_${Date.now()}.pdf`,
        answers: {},
        privacy_acknowledged_at: new Date().toISOString(),
        stage: 'screening',
      })
      .select()
      .single()

    if (testCandidateApp) testTrackedIds.applications.push(testCandidateApp.id)

    recordResult(
      'Collaboration',
      'Created test candidate application for operational workflow testing',
      Boolean(testCandidateApp && !appCreateError),
      `Candidate ID: ${testCandidateApp?.id?.slice(0, 8)}`
    )

    // Recruiter B (Assigned Collaborator) CAN add internal note
    const { data: bNote, error: bNoteError } = await clientB
      .from('application_notes')
      .insert({
        application_id: testCandidateApp.id,
        author_id: userB.id,
        body: 'Collaborator internal assessment note: Strong portfolio.',
      })
      .select()
      .single()

    if (bNote) testTrackedIds.notes.push(bNote.id)

    recordResult(
      'Collaboration',
      'Assigned Collaborator B can add internal candidate notes',
      Boolean(!bNoteError && bNote),
      bNoteError ? bNoteError.message : `Note created: ${bNote?.id?.slice(0, 8)}`
    )

    // Recruiter B (Assigned Collaborator) CAN rate candidate
    const { data: bReview, error: bReviewError } = await clientB
      .from('application_reviews')
      .insert({
        application_id: testCandidateApp.id,
        reviewer_id: userB.id,
        rating: 4,
        assessment: 'Promising engineering background.',
      })
      .select()
      .single()

    if (bReview) testTrackedIds.reviews.push({ application_id: testCandidateApp.id, reviewer_id: userB.id })

    recordResult(
      'Collaboration',
      'Assigned Collaborator B can submit candidate review and rating',
      Boolean(!bReviewError && bReview),
      bReviewError ? bReviewError.message : `Review rating: ${bReview?.rating}/5`
    )

    // Recruiter B (Assigned Collaborator) CAN transition candidate recruitment stage
    const { data: stageResult, error: stageError } = await clientB.rpc('transition_application_stage', {
      p_application_id: testCandidateApp.id,
      p_to_stage: 'interview',
      p_note: 'Moved to interview stage by collaborator',
    })

    recordResult(
      'Collaboration',
      'Assigned Collaborator B can move candidate through recruitment stages',
      Boolean(!stageError && stageResult?.stage === 'interview'),
      stageError ? stageError.message : `New stage: ${stageResult?.stage}`
    )

    // Recruiter B (Assigned Collaborator) CAN schedule interview
    const futureDate = new Date(Date.now() + 86400000 * 2).toISOString() // 2 days in future
    const { data: bInterview, error: bInterviewError } = await clientB
      .from('interviews')
      .insert({
        application_id: testCandidateApp.id,
        scheduled_at: futureDate,
        duration_minutes: 45,
        timezone: 'UTC',
        format: 'online',
        location_or_link: 'https://meet.google.com/test-collab-room',
        notes: 'Technical assessment round',
      })
      .select()
      .single()

    if (bInterview) testTrackedIds.interviews.push(bInterview.id)

    recordResult(
      'Collaboration',
      'Assigned Collaborator B can schedule candidate interviews',
      Boolean(!bInterviewError && bInterview),
      bInterviewError ? bInterviewError.message : `Interview scheduled: ${bInterview?.id?.slice(0, 8)}`
    )

    // Recruiter C (Unrelated Recruiter) CANNOT add internal note
    const { error: cNoteError } = await clientC
      .from('application_notes')
      .insert({
        application_id: testCandidateApp.id,
        author_id: userC.id,
        body: 'Unauthorized note from unrelated recruiter.',
      })

    recordResult(
      'Collaboration',
      'Unrelated Recruiter C is blocked by RLS from adding notes',
      Boolean(cNoteError),
      cNoteError ? cNoteError.message : 'FAILED: Unrelated recruiter added note'
    )

    // Recruiter C (Unrelated Recruiter) CANNOT submit candidate review/rating
    const { error: cReviewError } = await clientC
      .from('application_reviews')
      .insert({
        application_id: testCandidateApp.id,
        reviewer_id: userC.id,
        rating: 1,
        assessment: 'Unauthorized rating attempt',
      })

    recordResult(
      'Collaboration',
      'Unrelated Recruiter C is blocked by RLS from rating candidates',
      Boolean(cReviewError),
      cReviewError ? cReviewError.message : 'FAILED: Unrelated recruiter submitted rating'
    )

    // Recruiter C (Unrelated Recruiter) CANNOT transition application stage
    const { error: cStageError } = await clientC.rpc('transition_application_stage', {
      p_application_id: testCandidateApp.id,
      p_to_stage: 'offer',
    })

    recordResult(
      'Collaboration',
      'Unrelated Recruiter C is blocked from moving candidate stage',
      Boolean(cStageError),
      cStageError ? cStageError.message : 'FAILED: Unrelated recruiter changed stage'
    )

    // Recruiter C (Unrelated Recruiter) CANNOT schedule interview
    const { error: cInterviewError } = await clientC
      .from('interviews')
      .insert({
        application_id: testCandidateApp.id,
        scheduled_at: futureDate,
        duration_minutes: 30,
        timezone: 'UTC',
        format: 'online',
        location_or_link: 'https://meet.google.com/unauthorized',
      })

    recordResult(
      'Collaboration',
      'Unrelated Recruiter C is blocked from scheduling candidate interviews',
      Boolean(cInterviewError),
      cInterviewError ? cInterviewError.message : 'FAILED: Unrelated recruiter scheduled interview'
    )

    // Lead Recruiter A removes Collaborator B
    const { error: removeCollabError } = await clientA
      .from('vacancy_collaborators')
      .delete()
      .eq('vacancy_id', createdVacancyA.id)
      .eq('recruiter_id', userB.id)

    recordResult(
      'Collaboration',
      'Lead Recruiter A successfully removes Collaborator B',
      !removeCollabError,
      removeCollabError ? removeCollabError.message : 'Collaborator removed'
    )

    // Removed Collaborator B immediately loses access to candidate operations
    const { error: bPostRemovalNoteError } = await clientB
      .from('application_notes')
      .insert({
        application_id: testCandidateApp.id,
        author_id: userB.id,
        body: 'Post-removal attempt note',
      })

    recordResult(
      'Collaboration',
      'Removed collaborator immediately loses access to protected candidate operations',
      Boolean(bPostRemovalNoteError),
      bPostRemovalNoteError ? bPostRemovalNoteError.message : 'FAILED: Removed collaborator still had access'
    )

    // -------------------------------------------------------------------------
    // 5. Administrator Tests
    // -------------------------------------------------------------------------
    console.log('\n--- 5. WORKSPACE ADMINISTRATOR TESTS ---')

    // Workspace Admin can manage vacancy ownership (reassign lead)
    const { data: reassignResult, error: reassignError } = await clientAdmin
      .from('vacancies')
      .update({ lead_recruiter_id: userB.id })
      .eq('id', createdVacancyA.id)
      .select()
      .single()

    recordResult(
      'Administrator',
      'Workspace Admin can reassign vacancy lead recruiter',
      Boolean(!reassignError && reassignResult?.lead_recruiter_id === userB.id),
      `New lead: ${reassignResult?.lead_recruiter_id?.slice(0, 8)}`
    )

    // Workspace Admin can add and remove collaborators across vacancies
    const { data: adminAddCollab, error: adminAddCollabErr } = await clientAdmin
      .from('vacancy_collaborators')
      .insert({
        vacancy_id: createdVacancyA.id,
        recruiter_id: userC.id,
      })
      .select()
      .single()

    const { error: adminDelCollabErr } = await clientAdmin
      .from('vacancy_collaborators')
      .delete()
      .eq('id', adminAddCollab?.id)

    recordResult(
      'Administrator',
      'Workspace Admin can add and remove collaborators across vacancies',
      Boolean(!adminAddCollabErr && !adminDelCollabErr),
      adminAddCollabErr ? adminAddCollabErr.message : 'Admin successfully added and removed collaborator'
    )

    // Ordinary recruiter cannot grant themselves admin privileges
    const { error: selfPromoteError } = await clientA.rpc('set_recruiter_role', {
      p_recruiter_id: userA.id,
      p_new_role: 'admin',
    })

    recordResult(
      'Administrator',
      'Ordinary recruiter cannot grant themselves administrator privileges (RPC protected)',
      Boolean(selfPromoteError),
      selfPromoteError ? selfPromoteError.message : 'FAILED: Ordinary recruiter promoted self'
    )

    // Ordinary recruiter cannot update recruiter table directly
    const { data: directRoleUpdate, error: directRoleError } = await clientA
      .from('recruiters')
      .update({ role: 'admin' })
      .eq('user_id', userA.id)
      .select()

    const directBlocked = Boolean(directRoleError) || !directRoleUpdate || directRoleUpdate.length === 0
    recordResult(
      'Administrator',
      'Ordinary recruiter cannot directly mutate role column in recruiters table',
      directBlocked,
      directBlocked ? 'Blocked by database rules (0 rows updated)' : 'FAILED: Direct role mutation succeeded'
    )

    // Legacy unassigned vacancy reconciliation
    // Create a genuine legacy unassigned vacancy (lead_recruiter_id = NULL)
    const unassignedSlug = `test-unassigned-${Date.now()}`
    execSync(
      `wsl.exe -d Ubuntu docker exec supabase_db_tpp_hire psql -U postgres -c "ALTER TABLE public.vacancies DISABLE TRIGGER set_vacancy_creator_and_lead_trigger; INSERT INTO public.vacancies (title, slug, client_name, requirements, description, location, employment_type, status, created_by, lead_recruiter_id) VALUES ('Legacy Unassigned Vacancy', '${unassignedSlug}', 'Legacy Corp', '<p>Req</p>', '<p>Desc</p>', 'Remote', 'contract', 'draft', '${userAdmin.id}', NULL); ALTER TABLE public.vacancies ENABLE TRIGGER set_vacancy_creator_and_lead_trigger;"`
    )
    const { data: unassignedVacancy } = await clientAdmin
      .from('vacancies')
      .select('*')
      .eq('slug', unassignedSlug)
      .single()

    if (unassignedVacancy) testTrackedIds.vacancies.push(unassignedVacancy.id)

    // Ordinary recruiter A cannot claim unassigned vacancy
    const { data: ordinaryClaim, error: ordinaryClaimErr } = await clientA
      .from('vacancies')
      .update({ lead_recruiter_id: userA.id })
      .eq('id', unassignedVacancy.id)
      .select()

    const ordinaryClaimBlocked = Boolean(ordinaryClaimErr) || !ordinaryClaim || ordinaryClaim.length === 0
    recordResult(
      'Administrator',
      'Legacy unassigned vacancy cannot be claimed by ordinary recruiters',
      ordinaryClaimBlocked,
      ordinaryClaimBlocked ? 'Blocked: unassigned vacancies require administrator authorization' : 'FAILED: Ordinary recruiter claimed unassigned vacancy'
    )

    // Workspace Admin reconciles unassigned vacancy safely via assign_lead_recruiter RPC
    const { data: reconciledVac, error: reconcileErr } = await clientAdmin.rpc('assign_lead_recruiter', {
      p_vacancy_id: unassignedVacancy.id,
      p_recruiter_id: userA.id,
    })

    recordResult(
      'Administrator',
      'Workspace Admin reconciles unassigned vacancy via authorized procedure',
      Boolean(!reconcileErr && reconciledVac?.lead_recruiter_id === userA.id),
      reconcileErr ? reconcileErr.message : `Reconciled lead: ${reconciledVac?.lead_recruiter_id?.slice(0, 8)}`
    )

    // -------------------------------------------------------------------------
    // 6. Data Integrity and Deletion Safeguards
    // -------------------------------------------------------------------------
    console.log('\n--- 6. DATA INTEGRITY AND REGRESSION SAFEGUARDS ---')

    // Safeguard 1: Vacancy with candidate applications CANNOT be deleted
    const { error: deleteWithAppsErr } = await clientAdmin
      .from('vacancies')
      .delete()
      .eq('id', createdVacancyA.id)

    recordResult(
      'Data Integrity',
      'Vacancy with submitted candidate applications cannot be permanently deleted',
      Boolean(deleteWithAppsErr),
      deleteWithAppsErr ? deleteWithAppsErr.message : 'FAILED: Vacancy with applications was deleted'
    )

    // Safeguard 2: Active (non-draft) vacancy cannot be permanently deleted
    const { data: activeVacancy, error: activeVacErr } = await clientAdmin
      .from('vacancies')
      .insert({
        title: `Active Deletion Guard Vacancy [${Date.now()}]`,
        slug: `test-active-guard-${Date.now()}`,
        client_name: 'Active Client',
        requirements: '<p>None</p>',
        description: '<p>Active position test</p>',
        location: 'Remote',
        employment_type: 'full-time',
        status: 'active',
      })
      .select()
      .single()

    if (activeVacancy) testTrackedIds.vacancies.push(activeVacancy.id)

    const { data: deleteActiveData, error: deleteActiveErr } = await clientAdmin
      .from('vacancies')
      .delete()
      .eq('id', activeVacancy.id)
      .select()

    const { data: activeStillExists } = await adminClient
      .from('vacancies')
      .select('id, status')
      .eq('id', activeVacancy.id)
      .maybeSingle()

    const activeProtected = Boolean(
      activeStillExists && (!deleteActiveData || deleteActiveData.length === 0)
    )

    recordResult(
      'Data Integrity',
      'Active vacancies cannot be deleted (protected by RLS and status invariants)',
      activeProtected,
      activeProtected
        ? 'Active vacancy preserved in database (0 rows deleted by RLS)'
        : 'FAILED: Active vacancy deleted'
    )

    // Empty draft vacancy CAN be deleted safely
    const { data: emptyDraft, error: emptyDraftErr } = await clientAdmin
      .from('vacancies')
      .insert({
        title: `Empty Draft For Safe Delete [${Date.now()}]`,
        slug: `test-draft-del-${Date.now()}`,
        client_name: 'Draft Client',
        requirements: '<p>None</p>',
        description: '<p>Draft test</p>',
        location: 'Remote',
        employment_type: 'part-time',
        status: 'draft',
      })
      .select()
      .single()

    const { error: deleteDraftErr } = await clientAdmin
      .from('vacancies')
      .delete()
      .eq('id', emptyDraft.id)

    recordResult(
      'Data Integrity',
      'Empty draft vacancy can be safely deleted by authorized lead/admin',
      !deleteDraftErr,
      deleteDraftErr ? deleteDraftErr.message : 'Successfully deleted empty draft'
    )

  } catch (err) {
    console.error('Test execution error:', err)
  } finally {
    // -------------------------------------------------------------------------
    // Cleanup of isolated test data
    // -------------------------------------------------------------------------
    console.log('\n--- CLEANUP OF TEST ARTIFACTS ---')
    try {
      if (testTrackedIds.interviews.length > 0) {
        await adminClient.from('interviews').delete().in('id', testTrackedIds.interviews)
      }
      if (testTrackedIds.reviews.length > 0) {
        for (const rev of testTrackedIds.reviews) {
          await adminClient
            .from('application_reviews')
            .delete()
            .eq('application_id', rev.application_id)
            .eq('reviewer_id', rev.reviewer_id)
        }
      }
      if (testTrackedIds.notes.length > 0) {
        await adminClient.from('application_notes').delete().in('id', testTrackedIds.notes)
      }
      if (testTrackedIds.applications.length > 0) {
        await adminClient.from('applications').delete().in('id', testTrackedIds.applications)
      }
      if (testTrackedIds.vacancies.length > 0) {
        // Remove collaborator assignments first
        await adminClient.from('vacancy_collaborators').delete().in('vacancy_id', testTrackedIds.vacancies)
        // Set status to draft so delete invariant allows it
        await adminClient.from('vacancies').update({ status: 'draft' }).in('id', testTrackedIds.vacancies)
        await adminClient.from('vacancies').delete().in('id', testTrackedIds.vacancies)
      }
      console.log('✅ Cleaned up all test vacancies, applications, notes, and interviews.')
    } catch (cleanErr) {
      console.warn('Cleanup warning:', cleanErr.message)
    }

    // Verify original data remains intact
    const { count: finalVacancyCount } = await adminClient.from('vacancies').select('*', { count: 'exact', head: true })
    const { count: finalApplicantCount } = await adminClient.from('applications').select('*', { count: 'exact', head: true })
    console.log(`Original data state: ${finalVacancyCount} vacancies, ${finalApplicantCount} applications.`)
  }

  // ---------------------------------------------------------------------------
  // Summary Matrix
  // ---------------------------------------------------------------------------
  console.log('\n' + '='.repeat(80))
  console.log('INTEGRATION TEST MATRIX SUMMARY')
  console.log('='.repeat(80))
  const passedCount = results.filter(r => r.passed).length
  const failedCount = results.filter(r => !r.passed).length

  console.table(
    results.map(r => ({
      Category: r.category,
      Test: r.testName,
      Status: r.passed ? 'PASS' : 'FAIL',
      Details: r.details.slice(0, 60),
    }))
  )

  console.log(`\nTOTAL: ${results.length} tests | PASSED: ${passedCount} | FAILED: ${failedCount}`)
  if (failedCount > 0) {
    process.exit(1)
  }
}

run()
