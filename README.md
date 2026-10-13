# TPP Careers

Focused recruitment MVP for The People Practice, built with React, TypeScript, Vite, Tailwind and Supabase.

## Local setup

```bash
npm install
copy .env.example .env.local
npm run dev
```

Set the three `VITE_*` values in `.env.local`. Apply `supabase/migrations/20261013000000_initial_schema.sql`, then deploy the function:

```bash
supabase functions deploy submit-application --no-verify-jwt
supabase secrets set TURNSTILE_SECRET_KEY=your-secret
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are supplied automatically to hosted Edge Functions. Never put the service-role key in frontend environment files.

## Provision the first recruiter

1. In Supabase Dashboard → Authentication → Users, create the user with email confirmation enabled and a strong temporary password. Do not enable public sign-up.
2. Copy the user's UUID and run this in the SQL editor while signed in as a project administrator:

```sql
insert into public.recruiters (user_id, display_name)
values ('AUTH_USER_UUID', 'Recruiter name');
```

The application checks both a valid Auth session and membership in `recruiters`. Email domain alone never grants access.

## Verification

```bash
npm test
npm run build
```

Before production, configure the real site/secret keys in Cloudflare Turnstile, restrict the Edge Function CORS origin, enable Supabase leaked-password protection/MFA for recruiters, configure retention and deletion policies for applicant data/CVs, add monitoring without applicant PII, and run integration/security tests against a staging Supabase project. File signatures are validated for type consistency; this is not malware scanning.
