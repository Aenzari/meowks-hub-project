# Meowks mobile app readiness

Status: preparation only — no native project has been generated and no store build has been produced.

## Current application baseline

- React 19 + TypeScript + Vite single-page application.
- Supabase JavaScript client handles authentication and data access.
- The existing web app is the shared UI and business-logic foundation.
- Responsive navigation and reduced-motion support already exist in the web experience.
- The production web build is verified by the repository's GitHub Actions workflow.

## Recommended path: Capacitor

Use Capacitor to package the existing Vite application for Android and iOS while keeping one React codebase.

1. Confirm the web app builds cleanly and all production routes work.
2. Add compatible @capacitor/core, @capacitor/cli, and platform packages in a dedicated implementation PR.
3. Add a reviewed capacitor.config.ts with the Vite output directory (dist) and a stable app ID selected by the project owner.
4. Generate Android and iOS projects with the Capacitor CLI; commit native project files.
5. Configure app icons, splash screens, status/navigation bars, keyboard behavior, and safe-area handling.
6. Configure Supabase auth redirect/deep-link URLs for the chosen application ID and production domains. Do not put service-role keys in the client.
7. Validate sign-in, session persistence, file/media permissions if later required, external links, and app resume behavior on real devices.
8. Build Android in Android Studio and iOS in Xcode; iOS signing and App Store distribution require Apple tooling/account access.

## Environment and security checklist

- Keep VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY as public client configuration only.
- Never ship Supabase service-role keys or other server secrets in a Vite bundle or native package.
- Confirm Row Level Security policies for every table and RPC used by the app before release.
- Use separate development/staging and production Supabase projects where possible.
- Add platform-specific redirect URLs to Supabase Auth only after the final app ID and URL scheme are chosen.
- Avoid committing .env files or signing credentials.

## Device QA checklist

- [ ] Android small phone, large phone, and tablet layouts
- [ ] iPhone with home-indicator safe area and dynamic island/notch
- [ ] iPad portrait and landscape
- [ ] On-screen keyboard does not cover focused fields or modal actions
- [ ] Back navigation and app resume restore the expected screen
- [ ] Auth redirects return to the app and preserve sessions
- [ ] Reduced-motion preference is respected
- [ ] Touch targets, text scaling, contrast, and screen-reader labels are checked
- [ ] Offline/network-loss and retry states are understandable
- [ ] Store icons, screenshots, privacy disclosures, and release signing are complete

## Not done yet

Capacitor is not installed, native Android/iOS projects are not generated, and no device, simulator, signing, or store validation has been performed. These are intentionally left for the dedicated mobile implementation phase.