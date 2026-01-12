-- Step 1: Update any users with department_head role to department_manager
UPDATE public.user_roles 
SET role = 'department_manager' 
WHERE role = 'department_head';

-- Step 2: Drop all policies that depend on is_admin function
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage departments" ON public.departments;
DROP POLICY IF EXISTS "Admins can manage conferences" ON public.conferences;
DROP POLICY IF EXISTS "Admins can manage projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can manage criteria" ON public.evaluation_criteria;
DROP POLICY IF EXISTS "Admins can view all evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Admins can view all scores" ON public.evaluation_scores;
DROP POLICY IF EXISTS "Admins can manage assignments" ON public.judge_assignments;
DROP POLICY IF EXISTS "Admins can manage invitations" ON public.invitations;

-- Step 3: Drop the student policy that uses role column
DROP POLICY IF EXISTS "Students can update presentation_url of their projects" ON public.projects;

-- Step 4: Drop the existing functions
DROP FUNCTION IF EXISTS public.is_admin(uuid);
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

-- Step 5: Remove default value from invitations.role column
ALTER TABLE public.invitations ALTER COLUMN role DROP DEFAULT;

-- Step 6: Create new enum type without department_head
CREATE TYPE public.app_role_new AS ENUM ('judge', 'department_manager', 'student');

-- Step 7: Update the user_roles table to use new enum
ALTER TABLE public.user_roles 
  ALTER COLUMN role TYPE public.app_role_new 
  USING role::text::public.app_role_new;

-- Step 8: Update invitations table to use new enum
ALTER TABLE public.invitations 
  ALTER COLUMN role TYPE public.app_role_new 
  USING role::text::public.app_role_new;

-- Step 9: Drop old enum and rename new one
DROP TYPE public.app_role;
ALTER TYPE public.app_role_new RENAME TO app_role;

-- Step 10: Set new default for invitations.role
ALTER TABLE public.invitations ALTER COLUMN role SET DEFAULT 'judge'::app_role;

-- Step 11: Recreate is_admin function to only check for department_manager
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'department_manager'
  )
$$;

-- Step 12: Recreate has_role function with new enum type
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Step 13: Recreate all policies
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (is_admin(auth.uid()));

CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage departments" ON public.departments
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage conferences" ON public.conferences
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage projects" ON public.projects
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage criteria" ON public.evaluation_criteria
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admins can view all evaluations" ON public.evaluations
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admins can view all scores" ON public.evaluation_scores
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage assignments" ON public.judge_assignments
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage invitations" ON public.invitations
  FOR ALL USING (is_admin(auth.uid()));

-- Step 14: Recreate the student policy for projects
CREATE POLICY "Students can update presentation_url of their projects" ON public.projects
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM user_roles ur
      JOIN profiles p ON ur.user_id = p.user_id
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'student'
        AND p.full_name = ANY(projects.team_members)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_roles ur
      JOIN profiles p ON ur.user_id = p.user_id
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'student'
        AND p.full_name = ANY(projects.team_members)
    )
  );