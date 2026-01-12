-- Allow admins to delete profiles (for rejecting pending users)
CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
USING (is_admin(auth.uid()));