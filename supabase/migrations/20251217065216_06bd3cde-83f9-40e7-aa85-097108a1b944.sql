-- Add type column to custom_assignments table
ALTER TABLE public.custom_assignments 
ADD COLUMN type text NOT NULL DEFAULT 'assignment' 
CHECK (type IN ('assignment', 'event'));