# PulseOps

A self-hosted HTTP uptime monitor. Add monitors with configurable intervals, track incidents automatically, receive alerts by email or webhook, and share a public status page.

**Author:** Shantanoo Chandorkar

---

## What It Does

- Add HTTP monitors with configurable method, interval, keyword assertions, and expected status code
- Automated health checks dispatched via GitHub Actions every 5 minutes
- Incident tracking: opens on 2 consecutive failures, auto-resolves on recovery
- Email and webhook alerts on down/recovery events
- Response time history with charts (retained for 30 days)
- Public status page at `/status/<slug>` — shareable with no auth required
- Manual incident resolution from the Incidents dashboard

---

## Tech Stack

| Layer       | Technology                                    |
|-------------|-----------------------------------------------|
| Frontend    | Next.js 16, React 19, Tailwind CSS 4, Recharts |
| Backend     | Next.js 16 (API routes)                        |
| Database    | MongoDB (Mongoose)                             |
| Auth        | NextAuth 4 (Google OAuth + email magic link)   |
| Email       | Resend                                         |
| Scheduling  | GitHub Actions (cron)                          |

---

## Project Structure

```
uptime-monitor/
├── app/
│   ├── api/                  # API routes (monitors, checks, incidents, alerts, auth)
│   ├── dashboard/            # Authenticated dashboard pages
│   │   ├── monitors/
│   │   ├── incidents/
│   │   └── settings/
│   └── status/[slug]/        # Public status page
├── components/               # Shared UI components
├── lib/                      # Auth, MongoDB, and Mongoose helpers
├── models/                   # Mongoose models (Monitor, CheckResult, Incident, Alert, AlertLog, User)
├── services/                 # Core logic (checkEngine, incidentService, alertService)
├── __tests__/
└── .github/workflows/        # GitHub Actions cron jobs
```

---

## Prerequisites

- Node.js 18 or later
- MongoDB database (Atlas free tier works)
- Google OAuth credentials (Google Cloud Console)
- Resend account (for email alerts and magic links)
- GitHub repository (for Actions cron scheduling)

---

## Installation

```bash
git clone <your-repo-url>
cd uptime-monitor
npm install
```

---

## Environment Variables

```bash
cp .env.example .env.local
```

| Variable              | Description                                                  |
|-----------------------|--------------------------------------------------------------|
| `MONGODB_URI`         | MongoDB connection string                                    |
| `NEXTAUTH_SECRET`     | Random 32-byte secret for session encryption                 |
| `NEXTAUTH_URL`        | Base URL of the app (e.g. `http://localhost:3000`)           |
| `GOOGLE_CLIENT_ID`    | OAuth client ID from Google Cloud Console                    |
| `GOOGLE_CLIENT_SECRET`| OAuth client secret from Google Cloud Console               |
| `RESEND_API_KEY`      | API key from your Resend account                             |
| `EMAIL_FROM`          | Sender address for alert and magic-link emails               |
| `CRON_SECRET`         | Shared secret used to authenticate GitHub Actions cron calls |

---

## Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Troubleshooting

**Monitor not checking at the configured interval**
GitHub Actions has a minimum dispatch frequency of ~5 minutes. Intervals shorter than that will not be honoured. The configured interval controls how often a check result is recorded relative to each dispatch, not how often GitHub fires the workflow.

**Incident not auto-resolving after the monitor recovers**
Auto-resolution only runs for active monitors. If the monitor was paused while the incident was open, resume the monitor — the next successful check will close the incident.

**Monitor marked down despite the endpoint returning a response**
The default expected status code is 200. If your endpoint returns a different 2xx code (e.g. 204), update the expected status code in the monitor settings.

**Webhook alert not firing**
Verify the URL and any custom headers in the alert configuration. Every delivery attempt is written to the `AlertLog` collection in MongoDB — check there for the response status and error details.

**Check results disappearing**
Check results are kept for 30 days by design (TTL index on the `CheckResult` collection). This is intentional to bound storage growth.
