-- Add category column to user_feedback table
ALTER TABLE public.user_feedback 
ADD COLUMN category TEXT;

-- Add comment explaining categories
COMMENT ON COLUMN public.user_feedback.category IS 'Category of the feedback - different options for feature vs bug types';