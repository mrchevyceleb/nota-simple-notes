# Nota — Simple Notes

A dead-simple, cross-platform note-taking app inspired by Notability and Google Keep. Supports text, handwriting, images, and audio recordings with a clean, paper-like aesthetic.

## Features

- 📝 Unified infinite canvas — type and draw on the same surface
- 🖊️ Pen, highlighter, and eraser tools with pressure-like rendering
- 🗂️ Folders with color labels and drag-to-reorder
- 📌 Pin important notes to the top
- 🌙 Dark mode
- 📴 Offline-ready (PWA)
- ☁️ Synced via Supabase

## Run Locally

**Prerequisites:** Node.js, a [Supabase](https://supabase.com) project

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env.local` file in the project root with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<your-anon-key>
   ```
   You can find these values in your Supabase project under **Settings → API**.

3. Run the development server:
   ```
   npm run dev
   ```

## Deploy

1. Build the project:
   ```
   npm run build
   ```

2. Start the production server:
   ```
   npm start
   ```
   The server serves the built `dist/` folder and handles SPA routing.

   Set the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment variables on your hosting platform before deploying.

## Database Setup

The app expects the following Supabase tables:

- **`folders`** – `id`, `user_id`, `name`, `color_index`, `created_at`
- **`notes`** – `id`, `user_id`, `folder_id`, `title`, `content` (jsonb), `paper_style`, `paper_color`, `font_size`, `is_pinned`, `created_at`, `updated_at`

Row-Level Security (RLS) should be enabled on both tables with policies that restrict access to `auth.uid() = user_id`.
