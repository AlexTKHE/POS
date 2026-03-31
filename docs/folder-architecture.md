# Folder Architecture

This app keeps Expo Router files thin and pushes product code into `src/`.

## Structure

- `app/`
  - Route entry files only.
  - Keeps navigation discoverable without mixing route definitions with feature code.
- `src/features/`
  - Product-facing slices grouped by domain.
  - `health/` is the first domain so the app can grow from concrete personal hubs before productivity ties them together.
- `src/ui/`
  - Reusable visual building blocks once repeated patterns appear.
  - Avoid adding components here until at least two screens need them.
- `src/theme/`
  - Shared tokens and styling primitives when the visual language is ready to be formalized.
- `src/lib/supabase/`
  - Supabase client setup and query helpers.
  - Keep backend wiring out of screen files.
- `docs/`
  - Short product and architecture notes that explain decisions.

## Guardrails

- Put route files in `app/`, not feature logic.
- Put screen-specific code inside its feature folder first.
- Promote code to `src/ui/` or `src/theme/` only after reuse is real.
- Add new top-level folders sparingly.
