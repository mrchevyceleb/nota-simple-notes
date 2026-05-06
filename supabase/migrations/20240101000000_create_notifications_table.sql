-- Migration: Create notifications table
-- Adds a notifications table to store per-user notification messages with an
-- optional read timestamp, full RLS protection, and a user_id index.

CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message    TEXT        NOT NULL,
  read_at    TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast per-user lookups
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications (user_id);

-- Enable Row Level Security so users can only access their own rows
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policy: users can only SELECT their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: users can UPDATE (e.g. mark as read) their own notifications
CREATE POLICY "Users can update own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id);
