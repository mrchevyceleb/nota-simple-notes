# Nota - Simple Notes

Clean, minimal note-taking PWA with folders, canvas drawing, and real-time Supabase sync.

## Stack

- React 19 + TypeScript + Vite 6
- Tailwind CSS v4 (via `@tailwindcss/postcss`) + `@tailwindcss/typography`
- Supabase JS 2.44 (auth + realtime + storage)
- `dompurify` for sanitizing rich text, `sharp` for image processing
- PWA via `vite-plugin-pwa`
- Express (`server.js`) for serving the production build (`npm start`)

## Layout

```
App.tsx               Root component, routing, auth gate
components/
  Auth.tsx            Login / signup
  Sidebar.tsx         Folder tree + nav
  NoteEditor.tsx      Rich text editor
  NoteStream.tsx      List view of notes
  NoteCanvas.tsx      Drawing canvas view
  DrawingCanvas.tsx   Canvas primitive
  editor/             Editor subcomponents
hooks/                useTheme, useNoteTaker, useAudioRecorder, etc.
services/contentMigration.ts   One-off content shape migrations
supabaseClient.ts     Supabase client singleton
constants.tsx         Default folders / icons / labels
types.ts              Shared TS types
server.js             Express static server for prod
vite.config.ts        Vite config (PWA, React)
vercel.json           Vercel config (SPA rewrites, security headers)
```

## Commands

```bash
npm install
npm run dev       # Vite dev server
npm run build     # Production build to dist/
npm run preview   # Preview built bundle
npm start         # Node/Express serve of dist/ (used when self-hosting)
```

## Env / Secrets

`.env.example` lists `VITE_SB_URL` and `VITE_SB_ANON_KEY`. Source from Doppler (the `SB_` prefix convention dodges Vercel's "supabase" filter).

## Deploy

Vercel. `vercel.json` builds with Vite, output `dist/`, SPA rewrites for non-`/assets/` paths. Auto-deploys from `main` via Git Action.

## Quirks

- Tailwind v4 means config lives in CSS (`index.css`) via `@theme`, not `tailwind.config.js`.
- `server.js` exists for non-Vercel hosting paths; not used in normal Vercel deploys.
- `MIGRATION_NOTES.md` documents schema/content migrations. Read before touching `services/contentMigration.ts`.
