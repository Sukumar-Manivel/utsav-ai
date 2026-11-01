# Utsav AI

**Plan it together. Celebrate it together.**
A GenAI celebration planner for Indian families, built for PromptWars Virtual, Challenge 05: Celebration & Event Planner.

Utsav AI turns a wedding, birthday or community event into a full plan in seconds (a rupee budget with 10% kept aside, a timeline, guided steps, vendor picks and ideas). Then it splits the work across the family. Every helper gets a private WhatsApp link with a beginner's guide, a call script in Tamil or English, red flags to avoid and real vendors near them. The host watches the whole celebration fill up on one orbit.

> Built for families, not agencies.

**Live app:** https://utsav-ai-510810666377.asia-south1.run.app · **Demo video:** https://youtu.be/hEyg1QWsZZM

---

## The problem

Indian celebrations involve big budgets, many vendors, many rituals and many relatives who help out. Planning lives in WhatsApp groups and notebooks. The relatives who help often have never booked a caterer or a hall, so tasks slip, quotes get overpaid and nobody knows what is done.

## What it does

|     | Feature                            | How                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **AI plan in seconds**             | 5-step wizard → Gemini writes category steps, budget shares and ideas → the server checks the maths (caps + 10% buffer = total, every date before the event)                                                                                                                                                                                                                                                                                                                                    |
| 2   | **Family orbit**                   | The event is the planet; every category orbits it with its helper, due date, progress ring and next step. Overall "% event ready" in the centre                                                                                                                                                                                                                                                                                                                                                 |
| 3   | **Guided steps**                   | Each category has a step ladder. Tick a step or press _Mark as Complete_ and the orbit updates                                                                                                                                                                                                                                                                                                                                                                                                  |
| 4   | **Real vendors**                   | Google Places (New) finds real businesses near the event city; Gemini only ranks and explains them and can never invent one. Call, WhatsApp, Maps, Shortlist                                                                                                                                                                                                                                                                                                                                    |
| 5   | **Helpers without sign-up**        | Host adds a relative, picks a category and language, and shares a private link on WhatsApp                                                                                                                                                                                                                                                                                                                                                                                                      |
| 6   | **Helper app (4 pages)**           | Phone-first app with a bottom tab bar: **Today** ("Sana, the food is in your hands", one _Do this now_ card, things to watch, family progress), **Steps** (checklist, best quote, notes for the host), **Vendors** (top match + more options, filter by best / lowest price / shortlisted, Call · WhatsApp · Maps · Save), **Ask** (task-only AI chat with voice input). Call script with _Read aloud_ in English and Tamil                                                                     |
| 7   | **Privacy by role**                | Helpers see the team's progress but can change only their own task; the full budget is hidden from them unless the host turns it on. Enforced on the server                                                                                                                                                                                                                                                                                                                                     |
| 8   | **Live updates**                   | When a helper ticks a step, the host's ring fills and a toast appears                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 9   | **Ask Utsav co-pilot**             | "Cut budget by 15%", "Move the event to 28 November", "Add a mehendi function" → before/after diff → _Apply changes_ or _Discard_                                                                                                                                                                                                                                                                                                                                                               |
| 10  | **Budget, Timeline, Family views** | Donut + editable caps + saved quotes; steps grouped Overdue / This week / Next week / Later / Done; helper cards with WhatsApp share, copy link, their view and remove link                                                                                                                                                                                                                                                                                                                     |
| 11  | **Share**                          | WhatsApp-ready summary, copy, and save as PDF                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 12  | **Every family's own flow**        | Pick a tradition (Tamil, Telugu, Kerala, North Indian, Bengali, Christian, Muslim, or your own mix; kids, first, milestone or 60th birthdays; Pongal, temple festival, Ganesh Chaturthi, Christmas, Eid, college fest). Its functions load in order with dates (e.g. Haldi 2 days before, Walima 1 day after). Remove any, add from other traditions, or type your own. Each function adds tasks to the right helper, due the day before, and shows on the timeline and the helper's Today page |
| 13  | **India first**                    | ₹ with Indian grouping (12,00,000), rituals and food per event type, Tamil for helpers                                                                                                                                                                                                                                                                                                                                                                                                          |

## How a family uses it

**Host**

1. Open the site → _Try a sample plan_ (no sign-up) or _Start my plan_ / _Continue with Google_.
2. Wizard: event type and tradition → city & date → guests & budget → functions (add, remove, your own), food, feel → _Create my plan_. A lamp lights up while Gemini writes it.
3. The orbit appears. Tap a category to open its panel: guided steps, vendor shortlist, next action.
4. _Assign a helper_ → name, relation, language → _Share on WhatsApp_.
5. Watch the orbit fill up. Use _Ask Utsav_ to change the plan. Share the summary with the family.

**Helper (on a phone)**

1. Tap the WhatsApp link. No login.
2. **Today** tab: your category, budget cap and days left. Switch to தமிழ் if you like.
3. Follow _Do this now_ → **Vendors** tab → call the vendors with the script → save the best quote on **Steps**.
4. Stuck? **Ask** tab. Mark the step done. The host sees it instantly.

## Architecture

```mermaid
flowchart LR
  Host((Host)) -->|Google sign-in or browser key| Web[Utsav AI web app]
  Helper((Helper)) -->|private link /h/token| Web
  Web --> API[Express API on Cloud Run]
  API --> Gemini[Gemini Flash]
  API --> Places[Google Places API New]
  API --> FS[(Cloud Firestore)]
  API --> Auth[Firebase Auth token check]
```

- **One container on Google Cloud Run** serves the app and `/api/*`.
- **All writes go through the API.** Firestore is never written from the browser, so permissions live in one place (`lib/plan.js → applyOp`).
- **All keys stay on the server.** Place photos are proxied through `/api/photo`, so the Places key never reaches the browser.
- **Gemini never invents vendors.** It ranks only the place IDs the server sent it; unknown IDs are dropped.
- **Graceful fallback.** Without keys the app still runs: built-in plan templates, rule-based co-pilot, labelled example vendors.

### Security model

| Who         | How they are identified                                                    | Can                                                                                                           |
| ----------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Host        | Firebase ID token (Google) and/or a random per-browser key (stored hashed) | Everything on their own plans                                                                                 |
| Helper      | Random 32-character link token, stored only as a SHA-256 hash              | Read the team board; update steps, notes, quotes and shortlist on **their own** category only (403 otherwise) |
| Anyone else | —                                                                          | Nothing. Revoked links return "This link is no longer active"                                                 |

Rate limits on AI and vendor routes (20/min per IP), input validation on every route, user text always HTML-escaped before rendering, JSON-only errors without stack traces, and security headers: a strict Content-Security-Policy (no inline scripts, only Google hosts that sign-in and fonts need), `nosniff`, `X-Frame-Options: DENY`, `Permissions-Policy`, HSTS on HTTPS and `no-store` on the API. Helper link tokens are 32 random characters and only their SHA-256 hash is stored.

## Tech

Node.js 22 · Express · `@google/genai` (Gemini Flash family, JSON output; `GEMINI_MODEL` picks the model and the app falls back to other Flash models when one is busy or out of quota) · Google Places API (New) · Firebase Auth + Firebase Admin · Cloud Firestore · Google Cloud Run. Frontend is dependency-free HTML, CSS and JavaScript (Cormorant Garamond, Jost, Mrs Saint Delafield, Noto Sans Tamil).

```
server.js                 starts the app and mounts the routes
routes/public.js          config, health check, Google Places photo proxy
routes/host.js            plans, changes, helper links, co-pilot, vendors, chat
routes/helper.js          the helper's private-link API (/api/h/*)
lib/plan.js               plan building, budget maths, traditions → tasks, permissions, redaction, co-pilot rules
lib/ai.js                 Gemini (with backup models) and Google Places, each with a safe fallback
lib/auth.js               host and helper identity (hashed keys and tokens, Firebase ID tokens)
lib/http.js               JSON errors, per-route rate limits, security headers and CSP
lib/store.js              Cloud Firestore on Cloud Run, memory locally
public/app.js             boots the single-page app
public/js/router.js       hash router, render loop, focus and page titles
public/js/views/*.js      landing, wizard, events, host (orbit, budget, timeline, family), helper (4 tabs)
public/js/overlays.js     dialogs and drawers with focus management
public/js/actions.js      every click, key and form handler (event delegation)
public/js/util.js, i18n.js, state.js, api.js, auth.js, live.js   small focused modules
public/traditions.js      regional traditions and their functions, shared by server and browser
test/                     36 node:test tests (unit + API on the real Express app)
scripts/a11y-check.mjs    axe-core accessibility audit of every screen
```

## Run locally

```bash
npm install
cp .env.example .env      # add your keys (optional: it runs without them)
npm start                 # http://localhost:8080
npm test
```

## Deploy to Google Cloud Run (from Cloud Shell, no installs needed)

1. Push this repo to GitHub (public).
2. Open https://console.cloud.google.com → project `utsav-ai-513215` → click the **Cloud Shell** icon (top right).
3. In Cloud Shell:

```bash
git clone https://github.com/<you>/utsav-ai.git && cd utsav-ai
gcloud config set project utsav-ai-513215
gcloud run deploy utsav-ai --source . --region asia-south1 --allow-unauthenticated \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=utsav-ai-513215,FIREBASE_AUTH_DOMAIN=utsav-ai-513215.firebaseapp.com" \
  --set-env-vars "GEMINI_API_KEY=YOUR_KEY,PLACES_API_KEY=YOUR_KEY,FIREBASE_API_KEY=YOUR_WEB_API_KEY,FIREBASE_APP_ID=YOUR_APP_ID"
```

4. Copy the `https://utsav-ai-....run.app` URL it prints.
5. Firebase console → Authentication → Settings → **Authorized domains** → add that domain (without `https://`).

Firestore (Mumbai, production mode) must exist. Client access is denied by `firestore.rules`; the server uses its service account.

## Accessibility

Checked with axe-core against WCAG 2.1 A/AA on 20 screens (desktop and phone): **0 issues** (`npm run a11y`).

- Skip link, one `<main>` landmark and one `<h1>` per page; page title changes with every view.
- Dialogs use `role="dialog"` and `aria-modal`, move focus inside, keep Tab inside, close on Escape and return focus to the button that opened them.
- Focus stays on the same control after the screen re-renders (ticking a step, switching tabs).
- Every icon button has a text name; decorative SVGs are `aria-hidden`; status is shown in words, not only colour.
- The helper app sets `lang="ta"` when Tamil is chosen, so screen readers switch voice.
- Visible focus rings, large touch targets on the phone app, and `prefers-reduced-motion` turns animations off.

## Tests

```
npm run check          # ESLint + Prettier check + 36 tests
npm run test:coverage  # about 92% line coverage
```

- **Plan logic** (`test/plan.test.js`): caps + 10% buffer always equal the total, due dates, validation, tradition functions and their dated tasks, helper permissions and redaction, co-pilot changes, token length.
- **API** (`test/api.test.js`): the real Express app on a random port: security headers, 401/403/404/422 paths, full host → helper flow, a helper blocked from another task and from host-only actions, revoked links, co-pilot preview vs apply, labelled example vendors.
- **Browser modules** (`test/client.test.js`): HTML escaping, ₹ formatting, progress maths, English/Tamil text parity, every tradition well formed.
- **AI and vendors** (`test/ai.test.js`): a Gemini draft is used but the server keeps the maths; a broken reply falls back to templates; Gemini can only rank places Google returned (a made-up id is dropped); the Places key never reaches a response; vendor results are cached; quota and busy errors switch models.
- **Server parts** (`test/server-parts.test.js`): JSON error shape, no internal details in 500s, per-route rate limits, CSP and security headers, host identity (hashed browser key, Google token, forged token rejected), the store.
