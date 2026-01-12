-- Allow students to update presentation_url for projects they are team members of
CREATE POLICY "Students can update presentation_url of their projects"
ON public.projects
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON ur.user_id = p.user_id
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'student'
    AND p.full_name = ANY(projects.team_members)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON ur.user_id = p.user_id
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'student'
    AND p.full_name = ANY(projects.team_members)
  )
);