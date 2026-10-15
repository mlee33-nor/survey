# The Myles Survey 💌

A cute six-question survey about Myles. Anyone with the link can answer, and every answer is saved for Myles to read.

## Deploy on Railway

1. In Railway, click **New Project → Deploy from GitHub repo** and pick `mlee33-nor/survey`.
2. In the service's **Variables** tab, add `RESULTS_KEY` with a secret password of your choice.
3. Add storage so answers survive redeploys (pick one):
   - **Postgres (recommended):** in the project, click **New → Database → Postgres**, then in the survey service's Variables add `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`.
   - **Volume:** right-click the service → **Attach Volume**, mount path `/data`.
4. In **Settings → Networking**, click **Generate Domain**. That URL is the survey link to send her.

## Reading the answers

Open `https://YOUR-DOMAIN/results?key=YOUR_RESULTS_KEY`. Newest answers are at the top.

## Run locally

```
npm install
RESULTS_KEY=test npm start
```

Then open http://localhost:3000.

## GitHub Pages (no server)

In the repo, go to **Settings → Pages**, set **Source** to **Deploy from a branch**, then pick
branch `main` and folder `/docs`, and click **Save**. Every push to `main` updates the site.
The site lives at https://mlee33-nor.github.io/survey/

Answers are emailed to mylesn760@gmail.com through FormSubmit. The very first submission
sends an activation email instead; click **Activate Form** in it, and every answer after that
arrives as an email. If an email ever fails, she sees a copy screen to text the answers instead.
