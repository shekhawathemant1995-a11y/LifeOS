-- Add missing columns to tasks
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS priority TEXT,
ADD COLUMN IF NOT EXISTS time TEXT,
ADD COLUMN IF NOT EXISTS date TEXT;

-- Add missing columns to habits
ALTER TABLE public.habits
ADD COLUMN IF NOT EXISTS time TEXT,
ADD COLUMN IF NOT EXISTS unit TEXT,
ADD COLUMN IF NOT EXISTS icon TEXT,
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE;

-- Add missing columns to goals
ALTER TABLE public.goals
ADD COLUMN IF NOT EXISTS status TEXT,
ADD COLUMN IF NOT EXISTS next_milestone TEXT,
ADD COLUMN IF NOT EXISTS icon TEXT;

-- Add missing columns to transactions
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS merchant TEXT,
ADD COLUMN IF NOT EXISTS time TEXT,
ADD COLUMN IF NOT EXISTS icon TEXT;

-- Add missing columns to ai_messages
ALTER TABLE public.ai_messages
ADD COLUMN IF NOT EXISTS time TEXT,
ADD COLUMN IF NOT EXISTS insights BOOLEAN;

-- Update ai_messages role check constraint to allow 'ai'
ALTER TABLE public.ai_messages DROP CONSTRAINT IF EXISTS ai_messages_role_check;
ALTER TABLE public.ai_messages ADD CONSTRAINT ai_messages_role_check CHECK (role IN ('user', 'assistant', 'ai'));
