# Skinz & Bubbles — Bolt.new Migration (Version 33)

This is a **preserved web-app snapshot** of Version 32 prepared for Bolt.new / GitHub / Vite. It is **not yet a React or Expo app** and is **not production-ready**.

## Run locally

```bash
npm install
npm run dev
```

To build: `npm run build`.

## Import into Bolt

1. Extract this ZIP into a folder on your computer.
2. Create a **private** GitHub repository named `skinz-bubbles-app`.
3. Upload **all the files and folders inside** the extracted folder to that repository; keep `index.html` and `package.json` at the repository root. GitHub's web uploader can be used for a modest folder; GitHub Desktop is preferable for the full directory.
4. Go to https://bolt.new and use the **GitHub** import option to select the private repo.
5. In Bolt, use the prompt in `BOLT-FIRST-PROMPT.md` and ask for an audit before any redesign.

## File map

- `index.html` — complete original interface markup, **not a new React rewrite**.
- `public/js/legacy-app.js` — existing guest UI, Jamaica, Experience, tickets, ambassador and staff demos, navigation, legal/FAQ flows.
- `public/js/supabase-auth.js` — existing guest Supabase authentication integration.
- `public/js/supabase-config.js` — project URL and *publishable* key only.
- `public/css/` — existing CSS in source order.
- `public/assets/` — original extracted embedded brand and event images.
- `docs/FEATURE-INVENTORY.md` — features, current limitations and migration priorities.
- `BOLT-FIRST-PROMPT.md` — copyable instructions for Bolt.

## Security and functionality limitations

- The existing ambassador/host/manager logins are client-side demos and are **not secure**. Do not publicly deploy with them enabled.
- Existing mock ticket orders are **not** confirmed Eventin Pro purchases.
- Guest Supabase auth code uses the project publishable key; working sign-in has **not been tested live** and depends on Supabase Authentication settings and allowed redirect URLs.
- No live customer data was migrated. Old localStorage values live only inside each browser and are not contained in this code ZIP.
- This bundle is not connected to a Bolt account or GitHub repository on your behalf.
- Do **not** paste secret database keys, service_role, or database passwords into Bolt prompts or frontend files.
- Prefer incremental refactor to React/Vite components and secure backend integration, while preserving UI screens and brand images. An Expo mobile app can follow after the web app is stabilized.
