-- Create custom_assignments table
CREATE TABLE public.custom_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  due_at timestamp with time zone,
  course_name text,
  description text,
  links text,
  priority text DEFAULT 'medium',
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own custom assignments" 
ON public.custom_assignments 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own custom assignments" 
ON public.custom_assignments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom assignments" 
ON public.custom_assignments 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom assignments" 
ON public.custom_assignments 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_custom_assignments_updated_at
BEFORE UPDATE ON public.custom_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();