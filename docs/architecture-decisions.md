# Meowks architecture decisions

## Product shape
Meowks is a student productivity and learning platform with four pillars: Organize, Learn, Connect, and Achieve. The core loop is course setup → notes/resources → practice → peer sharing → progress.

## Initial stack
- React + TypeScript + Vite for the web application.
- Tailwind CSS v4 for styling.
- Supabase Auth, Postgres, Storage, and Realtime as backend services.
- Netlify for the web deployment.
- PWA-first responsive web; evaluate Capacitor for mobile packaging after validating the web product.

## Multi-university model
University membership is optional. A profile may be independent, unverified, or verified. A university is a tenant, not a hard-coded global setting. Test University is fictional development seed data and must never imply a real partnership.

## Security principles
- Enable RLS on every exposed table.
- Never ship a service-role key to the browser.
- Keep XP and verification changes in trusted server-side/database workflows.
- Validate uploads and moderate user-generated content.
- Add auditability, export, deletion, and retention controls before pilot.

## Delivery approach
Build broad architectural foundations but ship incrementally: founder alpha, trusted-classmate alpha, university beta, then public launch. Avoid microservices until there is a demonstrated need.
