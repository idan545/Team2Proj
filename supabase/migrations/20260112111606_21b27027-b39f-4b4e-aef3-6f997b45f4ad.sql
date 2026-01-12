-- Allow students to view evaluations for projects they are team members of
CREATE POLICY "Students can view evaluations for their projects"
ON public.evaluations
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM projects p
    JOIN user_roles ur ON ur.user_id = auth.uid()
    JOIN profiles pr ON pr.user_id = auth.uid()
    WHERE p.id = evaluations.project_id
      AND ur.role = 'student'
      AND pr.full_name = ANY(p.team_members)
  )
);

-- Allow students to view evaluation scores for projects they are team members of
CREATE POLICY "Students can view scores for their projects"
ON public.evaluation_scores
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM evaluations e
    JOIN projects p ON p.id = e.project_id
    JOIN user_roles ur ON ur.user_id = auth.uid()
    JOIN profiles pr ON pr.user_id = auth.uid()
    WHERE e.id = evaluation_scores.evaluation_id
      AND ur.role = 'student'
      AND pr.full_name = ANY(p.team_members)
  )
);