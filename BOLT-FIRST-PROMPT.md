# Paste this into Bolt.new after importing the repository

You are the lead software engineer migrating my existing **Skinz & Bubbles** event app, a premium daytime foam-party experience in Kingston, Jamaica, scheduled for July 31, 2027. This GitHub repository is my **actual existing app** and must be preserved. 

**First action: inspect the project and report what is implemented. Do not rebuild, redesign, or remove features yet.** It is currently a Vite wrapper around the original HTML, CSS, and classic JavaScript. Read README.md and docs/FEATURE-INVENTORY.md first. Run the existing project and fix only issues that prevent it from compiling or displaying.

Preserve Home, Jamaica, Experience, Tickets, More; under More preserve My Account, Ambassador Hub, Settings, FAQ in that order. Preserve the original Skinz & Bubbles branding, imported images, all legal policies, guest journeys and ambassador/host/manager demo screens for audit.

Use the EXISTING Supabase project defined in public/js/supabase-config.js. The value beginning `sb_publishable_` is a public client key; NEVER use or request a secret or service_role key in client code. Do not create a competing Bolt database without my approval. Verify Supabase Auth configuration and implement RLS before real data.

Treat existing client-side PIN/password login, staff panels, localStorage and simulated ticket purchases as **unsafe demos**, not production systems. Restrict public access to those demo sections until proper authorization exists. Do not mark payment as real without a server-verified Eventin Pro order.

Then propose a phased migration to maintainable React + Vite with reusable components, mobile-first CSS, React Router and Supabase Auth. Convert one feature at a time and compare against original, preserving visual style. Long-term target is Expo/React Native using the same protected Supabase backend.

Ask me for approval before destructive changes to database schema, legal policies, routes or brand assets.
