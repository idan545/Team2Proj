-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Students can view judge profiles for their project evaluations" ON public.profiles;

-- Create a security definer function to check if a student can view a judge profile
-- This avoids infinite recursion by bypassing RLS
CREATE OR REPLACE FUNCTION public.student_can_view_judge_profile(_student_user_id uuid, _judge_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM evaluations e
    JOIN projects p ON p.id = e.project_id
    JOIN user_roles ur ON ur.user_id = _student_user_id
    JOIN profiles student_profile ON student_profile.user_id = _student_user_id
    WHERE e.judge_id = _judge_user_id
      AND e.is_complete = true
      AND ur.role = 'student'
      AND student_profile.full_name = ANY(p.team_members)
  )
$$;

-- Create the fixed policy using the security definer function
CREATE POLICY "Students can view judge profiles for their project evaluations"
ON public.profiles
FOR SELECT
USING (
  public.student_can_view_judge_profile(auth.uid(), user_id)
);