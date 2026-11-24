# Skinz & Bubbles feature inventory (from Version 32)

## Bottom navigation
- Home (brand/event overview)
- Jamaica (destination and travel)
- Experience (foam party, activations and VIP)
- Tickets (tiers and calls to action)
- More (My Account, Ambassador Hub, Settings, FAQ)

## More → My Account
- Guest registration and sign-in: Supabase Authentication integration added in V32, requires live testing
- Profile and account settings, notification preferences
- My Tickets: current local mock ticket state and proposed database read; **no verified purchase integration**

## Ambassador Hub
- Application, username/PIN demo, dashboard, content resources, tasks, proofs, rewards, tracking
- Host / Manager dashboards, application review and demo permissions
- **Not yet migrated to secure Supabase Auth + database RLS**

## Settings and legal
- About Us (formerly Skinz & Nipples, rebrand to Skinz & Bubbles)
- Privacy Policy (draft)
- Terms & Conditions (draft)
- Community Guidelines (draft)
- Help & FAQs; Contact Us

## Technology and deployment
- Current artifact is a single-page, classic JavaScript HTML application with extracted assets, Vite wrapper
- Supabase project URL and publishable key configured in `public/js/supabase-config.js`
- `localStorage` still controls multiple demo workflows; not synced across users
- WordPress/Hostinger + Eventin Pro are external, not integrated into this ZIP

## Keep when rebuilding
- Bright Caribbean daytime aesthetic and original image assets
- Brand naming **Skinz & Bubbles**; Kingston, Jamaica event **July 31, 2027**
- Bottom nav sections, mobile-friendly layout, Account → Ambassador Hub → Settings → FAQ menu order
- Do not change copy or remove features before inventory and user approval

## Suggested phased improvements
1. Verify visual parity and fix build errors.
2. Extract classic JS into React components in manageable slices, retaining all routes.
3. Replace guest demos with tested Supabase authentication, user profile tables and RLS.
4. Replace ambassador PIN + staff demo permissions with Supabase-based roles and RLS.
5. Integrate ticket purchase flow with verified Eventin Pro webhooks/server-side reconciliation.
6. Review legal pages and launch checklist before publishing.
7. Create Expo React Native client once backend and workflows are stable.
