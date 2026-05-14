# ATS Killer — by Manfred

Free tool to analyze CVs against ATS (Applicant Tracking Systems). Built by [Manfred](https://www.getmanfred.com) to help candidates improve their CVs before they reach a selection process.

## What it does

**Core feature — ATS analysis**: upload a CV (PDF, DOCX, TXT or MD) and get a score from 0 to 100 broken down into 6 weighted categories:

| Category | Weight | What it checks |
|---|---|---|
| Keywords & technical skills | 30% | Explicitly named technologies, languages, frameworks, tools, certifications |
| Format & parseability | 25% | Multi-column layouts, merged tables, image-based text, non-standard bullets |
| Work experience structure | 20% | Company name, job title, dates, and description present per role |
| Education & certifications | 10% | Institution, degree, and year complete per entry |
| Contact information | 10% | Email, phone, city/country, LinkedIn or portfolio |
| Length & optimization | 5% | Estimated page count (optimal: 1–2 pages) |

The overall score is computed server-side from fixed weights — the AI only scores each category.

**Additional tools:**

- **CV–job match** (`/match`): paste or upload a job offer and calculate alignment with the CV; surfaces present and missing keywords
- **CV editor** (`/editor`): visual editor with Harvard template; exports to PDF (via `html2canvas` + `jsPDF`), DOCX and Markdown; supports importing an analyzed CV and applying ATS recommendations with AI
- **LinkedIn analysis** (`/linkedin`): paste a LinkedIn profile and get a score by section (headline, summary, experience, skills, education, completeness)
- **CV anonymizer** (`/anonymize`): strips personal data (name, email, phone, company names, etc.) while keeping professional content intact
- **Version comparison** (`/results/compare`): side-by-side comparison of two CV versions
- **Multilingual**: detects whether the CV is in Spanish or English and responds in the same language; manual toggle available
- **Local history**: last analyses saved automatically in the browser (localStorage)
- **Methodology page** (`/como-funciona`): explains scoring dimensions and what ATS thresholds mean in practice

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14.2 (App Router, `src/` directory) |
| AI | NaN API — model `gemma4` (OpenAI-compatible endpoint) |
| Database | Supabase (tables: `feedback`, `issues`; RPC: `increment_stat`) |
| PDF parsing | `pdf-parse` |
| DOCX parsing | `mammoth` |
| PDF export | `html2canvas` + `jsPDF` |
| DOCX export | `docx` |
| Styling | Tailwind CSS (Manfred design tokens) |
| Deployment | Railway |

---

## Project structure

```
src/
├── app/
│   ├── api/
│   │   ├── analyze/          # ATS scoring endpoint
│   │   ├── match/            # CV–job match endpoint
│   │   ├── anonymize/        # CV anonymization endpoint
│   │   ├── linkedin/         # LinkedIn analysis endpoint
│   │   ├── editor/parse/     # CV import for editor
│   │   └── feedback/         # User feedback (Supabase)
│   ├── results/              # ATS results page + version compare
│   ├── match/                # Job match UI + results
│   ├── editor/               # CV editor
│   ├── linkedin/             # LinkedIn analysis UI + results
│   ├── como-funciona/        # Scoring methodology explainer
│   └── admin/                # Internal panel (feedback, issues, stats)
├── components/
│   ├── Header.tsx            # Main nav (hamburger menu on mobile)
│   └── results/              # Score header, suggestion cards, export button
└── lib/
    ├── nan-client.ts         # NaN API client (temperature: 0, seed: 42)
    ├── analysis.ts           # ATS scoring prompt + server-side score calculation
    ├── match-ai.ts           # Job match AI logic
    ├── editor-ai.ts          # Editor AI logic
    ├── linkedin-ai.ts        # LinkedIn analysis AI logic
    ├── extractors.ts         # PDF / DOCX / TXT extraction
    ├── history.ts            # localStorage analysis history
    ├── rate-limit.ts         # In-memory rate limiter (per IP)
    └── supabase.ts           # Supabase client (server-side only)
```

---

## Local development

```bash
npm install
npm run dev
```

App runs at `http://localhost:3000`.

Copy `.env.local.example` to `.env.local` and fill in your values (see required variables below). The admin panel is at `/admin/feedback` and requires login.

---

## Environment variables

All secrets are server-side only — none are prefixed with `NEXT_PUBLIC_`.

```bash
NAN_API_KEY=                 # NaN API key (AI provider)
SUPABASE_URL=                # Supabase project URL
SUPABASE_SERVICE_ROLE_KEY=   # Supabase service role key
AUTH_USERNAME=               # Admin panel username
AUTH_PASSWORD=               # Admin panel password
AUTH_SECRET=                 # Session cookie signing secret
```

Configure these in `.env.local` for local development and in Railway environment variables for production.

---

## Security & limits

- Accepted formats: PDF, DOCX, DOC, TXT, MD — max 3 MB, max 5 pages
- Rate limiting on all analysis endpoints: 10 requests/min per IP; 3 requests/min on `/analyze`
- Analysis timeout: 85 s (Railway limit awareness)
- No secrets exposed to the client — `NEXT_PUBLIC_` prefix not used for any sensitive variable
- CV text is never stored — only usage counters are written to Supabase

---

## Git workflow

- `master` → production (Railway auto-deploys from here). Never push directly.
- `dev` → working branch. All changes go here first.
- Open a PR from `dev` → `master` for every change. Merge only after review.

Commits follow [Conventional Commits](https://www.conventionalcommits.org/): `fix:`, `feat:`, `improve:`, `refactor:`, `chore:`, `docs:`, `security:`.
