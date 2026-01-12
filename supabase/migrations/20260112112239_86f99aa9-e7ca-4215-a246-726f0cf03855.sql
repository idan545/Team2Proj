-- Allow students to view profiles of judges who evaluated their projects
CREATE POLICY "Students can view judge profiles for their project evaluations"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM evaluations e
    JOIN projects p ON p.id = e.project_id
    JOIN user_roles ur ON ur.user_id = auth.uid()
    JOIN profiles student_profile ON student_profile.user_id = auth.uid()
    WHERE e.judge_id = profiles.user_id
      AND e.is_complete = true
      AND ur.role = 'student'
      AND student_profile.full_name = ANY(p.team_members)
  )
);