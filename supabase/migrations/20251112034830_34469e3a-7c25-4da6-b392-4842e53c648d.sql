-- Create assignment_completions table to track completed assignments
CREATE TABLE public.assignment_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(assignment_id)
);

-- Enable RLS
ALTER TABLE public.assignment_completions ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read completions (since we don't have auth yet)
CREATE POLICY "Anyone can view completions" 
ON public.assignment_completions 
FOR SELECT 
USING (true);

-- Allow everyone to insert completions
CREATE POLICY "Anyone can create completions" 
ON public.assignment_completions 
FOR INSERT 
WITH CHECK (true);

-- Allow everyone to update completions
CREATE POLICY "Anyone can update completions" 
ON public.assignment_completions 
FOR UPDATE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_assignment_completions_updated_at
BEFORE UPDATE ON public.assignment_completions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();