-- Drop the existing "Judges can manage own scores" policy
DROP POLICY IF EXISTS "Judges can manage own scores" ON public.evaluation_scores;

-- Create separate policies for INSERT, UPDATE, DELETE with proper WITH CHECK
CREATE POLICY "Judges can insert own scores"
ON public.evaluation_scores
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM evaluations
    WHERE evaluations.id = evaluation_scores.evaluation_id
      AND evaluations.judge_id = auth.uid()
  )
);

CREATE POLICY "Judges can update own scores"
ON public.evaluation_scores
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM evaluations
    WHERE evaluations.id = evaluation_scores.evaluation_id
      AND evaluations.judge_id = auth.uid()
  )
);

CREATE POLICY "Judges can delete own scores"
ON public.evaluation_scores
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM evaluations
    WHERE evaluations.id = evaluation_scores.evaluation_id
      AND evaluations.judge_id = auth.uid()
  )
);