# Submit Utsav AI: step by step

Deadline: **1 Nov 2026, 11:59 PM IST**. Aim to submit by **1 Nov, 6 PM**. You get 3 attempts and the latest counts, so send attempt 1 as soon as the live link works, then improve.

## 1. Put the code on GitHub (10 min)

1. github.com → **New repository** → name `utsav-ai` → **Public** → Create.
2. On the repo page: **Add file → Upload files** → drag in everything inside the `utsav-ai` folder (not `node_modules`, not `.env`) → **Commit changes**.
3. Check that `.env` is **not** in the repo. Your keys must never be on GitHub.

## 2. Deploy to Cloud Run from Cloud Shell (15 min)

Open console.cloud.google.com → project `utsav-ai-513215` → click the **>_** (Cloud Shell) icon at the top right. Then run these one by one:

```bash
gcloud config set project utsav-ai-513215
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com firestore.googleapis.com
git clone https://github.com/YOUR-USERNAME/utsav-ai.git
cd utsav-ai
```

Now deploy. Replace the four `PASTE_...` values with your own keys (type them in Cloud Shell only, never in chat):

```bash
gcloud run deploy utsav-ai --source . --region asia-south1 --allow-unauthenticated \
  --set-env-vars "GEMINI_API_KEY=PASTE_GEMINI_KEY,PLACES_API_KEY=PASTE_PLACES_KEY,GOOGLE_CLOUD_PROJECT=utsav-ai-513215,FIREBASE_API_KEY=PASTE_FIREBASE_WEB_API_KEY,FIREBASE_AUTH_DOMAIN=utsav-ai-513215.firebaseapp.com,FIREBASE_APP_ID=PASTE_FIREBASE_APP_ID"
```

- If it asks "create Artifact Registry repository?" → type `Y`.
- When it finishes, it prints `Service URL: https://utsav-ai-xxxx.a.run.app`. **That is your app link.**

Give the app permission to use Firestore (one time):

```bash
PN=$(gcloud projects describe utsav-ai-513215 --format='value(projectNumber)')
gcloud projects add-iam-policy-binding utsav-ai-513215 --member="serviceAccount:${PN}-compute@developer.gserviceaccount.com" --role="roles/datastore.user"
```

Allow Google sign-in on the new link: Firebase console → **Authentication → Settings → Authorized domains → Add domain** → paste `utsav-ai-xxxx.a.run.app` (without https://).

## 3. Test the live link (10 min)

Open the link on your laptop and phone and check:

- [ ] `https://YOUR-LINK/api/health` shows `{"ok":true}`
- [ ] *Try a sample plan* opens the orbit
- [ ] *Start my plan* → wizard → plan is created (Gemini working)
- [ ] Food → Vendors shows real places with **From Google Maps** (Places working)
- [ ] Family → Share link → open it on your phone → 4 tabs work
- [ ] New plan → pick *North Indian* → functions list shows Haldi, Mehendi, Sangeet… → remove one, add your own → Timeline shows the functions
- [ ] Ask Utsav → "Cut budget by 15%" → Apply

If something fails: Cloud Run → `utsav-ai` → **Logs**, and send me the red error line (not your keys).

## 4. Record the demo video (under 4 min)

Use OBS, Loom or Xbox Game Bar (Win+G). Phone screen: open the helper link in Chrome on the laptop with the window narrow, or record the phone.

| Time | Show | Say |
|---|---|---|
| 0:00–0:20 | Landing page | "Indian celebrations are planned by whole families over WhatsApp. Budgets slip, tasks get lost, and relatives don't know what to do. Utsav AI fixes that." |
| 0:20–0:55 | Start my plan → wizard → lamp → orbit | "I describe the event once. Gemini writes the plan: categories, steps, dates, budget caps. The server checks the maths: caps plus a 10% buffer always equals the budget." |
| 0:55–1:20 | Click Food → Vendors | "Real vendors from Google Maps near the venue. Gemini only ranks and explains them. It cannot invent a vendor." |
| 1:20–1:40 | Wizard tradition step → functions list → Timeline functions strip | "No two families celebrate the same way. Pick Tamil, North Indian, Kerala, Muslim, Christian or your own mix. The functions load in order with dates, and each one adds tasks to the right helper." |
| 1:40–2:00 | Family → Share on WhatsApp | "I hand each relative one category. They get a private link. No login, no app." |
| 2:00–2:50 | Helper phone: Today → Steps → Vendors → Ask (Tamil) | "Sana opens the link. She sees one thing to do now, a call script she can hear in Tamil, red flags, and vendors to call. She asks the AI a question about only her task." |
| 2:50–3:10 | Tick a step on phone → host orbit ring fills + toast | "When she finishes, the host sees it live. Sana can see the team's progress but can only change her own task. The server enforces it." |
| 3:10–3:35 | Ask Utsav: "Cut budget by 15%" → diff → Apply | "The host changes the plan in plain words and sees a before-and-after before anything changes." |
| 3:35–3:55 | Share summary → WhatsApp text | "One tap shares the plan with the family. Built on Gemini, Google Places, Firebase, Firestore and Cloud Run." |

Upload to YouTube as **Unlisted** (or Google Drive with *Anyone with the link*).

## 5. Fill the submission form

- **Live app URL:** your `run.app` link
- **GitHub repo:** `https://github.com/YOUR-USERNAME/utsav-ai`
- **Demo video:** your YouTube/Drive link
- **Short description** (paste):

> Utsav AI turns a family celebration into a plan everyone can act on. The host describes the event once and Gemini creates categories, step-by-step tasks, dates and a ₹ budget whose maths the server verifies. Each relative gets one category through a private WhatsApp link (no login) and a phone app that coaches them: one thing to do now, a call script read aloud in Tamil or English, red flags, real vendors from Google Places ranked by Gemini, and a task-only AI assistant. Role-based access is enforced on the server: helpers see the team's progress but can edit only their own task, and the full budget stays private. The host sees progress live on the family orbit, can change the plan in plain words with a before/after diff, and share a summary on WhatsApp. Weddings and festivals follow the family's own tradition: Tamil, Telugu, Kerala, North Indian, Bengali, Christian, Muslim or a custom mix, with each function dated and turned into tasks. Built with Gemini 2.5 Flash, Google Places API (New), Firebase Auth, Cloud Firestore and Cloud Run.

## Never do

- Never paste API keys in chat, GitHub, screenshots or the video.
- Don't click **Upgrade** on the billing page. The free trial credit covers this.
