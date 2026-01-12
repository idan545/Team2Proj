-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('judge', 'department_manager', 'department_head');

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    expertise_areas TEXT[] DEFAULT '{}',
    company TEXT,
    job_title TEXT,
    preferred_language TEXT DEFAULT 'he',
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);

-- Create departments table
CREATE TABLE public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_he TEXT NOT NULL,
    name_en TEXT NOT NULL,
    description_he TEXT,
    description_en TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create conferences table
CREATE TABLE public.conferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_he TEXT NOT NULL,
    name_en TEXT NOT NULL,
    description_he TEXT,
    description_en TEXT,
    event_date DATE NOT NULL,
    location_he TEXT,
    location_en TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create projects table (presentations to be judged)
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conference_id UUID REFERENCES public.conferences(id) ON DELETE CASCADE NOT NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    title_he TEXT NOT NULL,
    title_en TEXT NOT NULL,
    description_he TEXT,
    description_en TEXT,
    team_members TEXT[] DEFAULT '{}',
    expertise_tags TEXT[] DEFAULT '{}',
    presentation_time TIME,
    room TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create evaluation criteria table
CREATE TABLE public.evaluation_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conference_id UUID REFERENCES public.conferences(id) ON DELETE CASCADE NOT NULL,
    name_he TEXT NOT NULL,
    name_en TEXT NOT NULL,
    description_he TEXT,
    description_en TEXT,
    max_score INTEGER DEFAULT 10,
    weight DECIMAL(3,2) DEFAULT 1.00,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create evaluations table
CREATE TABLE public.evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    judge_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    is_complete BOOLEAN DEFAULT FALSE,
    general_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (project_id, judge_id)
);

-- Create evaluation scores table (individual criterion scores)
CREATE TABLE public.evaluation_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_id UUID REFERENCES public.evaluations(id) ON DELETE CASCADE NOT NULL,
    criterion_id UUID REFERENCES public.evaluation_criteria(id) ON DELETE CASCADE NOT NULL,
    score INTEGER NOT NULL CHECK (score >= 0),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (evaluation_id, criterion_id)
);

-- Create judge assignments table
CREATE TABLE public.judge_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    judge_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (judge_id, project_id)
);

-- Create invitations table
CREATE TABLE public.invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    conference_id UUID REFERENCES public.conferences(id) ON DELETE CASCADE NOT NULL,
    role app_role DEFAULT 'judge',
    token TEXT UNIQUE DEFAULT gen_random_uuid()::text,
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.judge_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user is manager or head
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('department_manager', 'department_head')
  )
$$;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_evaluations_updated_at
    BEFORE UPDATE ON public.evaluations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all profiles" ON public.profiles
    FOR UPDATE USING (public.is_admin(auth.uid()));

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" ON public.user_roles
    FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage roles" ON public.user_roles
    FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for departments (public read, admin write)
CREATE POLICY "Anyone can view departments" ON public.departments
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage departments" ON public.departments
    FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for conferences
CREATE POLICY "Authenticated users can view conferences" ON public.conferences
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage conferences" ON public.conferences
    FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for projects
CREATE POLICY "Authenticated users can view projects" ON public.projects
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage projects" ON public.projects
    FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for evaluation_criteria
CREATE POLICY "Authenticated users can view criteria" ON public.evaluation_criteria
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage criteria" ON public.evaluation_criteria
    FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for evaluations
CREATE POLICY "Judges can view own evaluations" ON public.evaluations
    FOR SELECT USING (auth.uid() = judge_id);

CREATE POLICY "Judges can create own evaluations" ON public.evaluations
    FOR INSERT WITH CHECK (auth.uid() = judge_id);

CREATE POLICY "Judges can update own evaluations" ON public.evaluations
    FOR UPDATE USING (auth.uid() = judge_id);

CREATE POLICY "Admins can view all evaluations" ON public.evaluations
    FOR SELECT USING (public.is_admin(auth.uid()));

-- RLS Policies for evaluation_scores
CREATE POLICY "Judges can view own scores" ON public.evaluation_scores
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.evaluations
            WHERE id = evaluation_id AND judge_id = auth.uid()
        )
    );

CREATE POLICY "Judges can manage own scores" ON public.evaluation_scores
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.evaluations
            WHERE id = evaluation_id AND judge_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all scores" ON public.evaluation_scores
    FOR SELECT USING (public.is_admin(auth.uid()));

-- RLS Policies for judge_assignments
CREATE POLICY "Judges can view own assignments" ON public.judge_assignments
    FOR SELECT USING (auth.uid() = judge_id);

CREATE POLICY "Admins can manage assignments" ON public.judge_assignments
    FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for invitations
CREATE POLICY "Admins can manage invitations" ON public.invitations
    FOR ALL USING (public.is_admin(auth.uid()));

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name, email, preferred_language)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.email, ''),
        COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'he')
    );
    RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();