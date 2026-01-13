import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import {
  FolderKanban,
  Search,
  Clock,
  MapPin,
  Users,
  Tag,
  Loader2,
  ClipboardCheck,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

interface Project {
  id: string;
  title_he: string;
  title_en: string;
  description_he: string | null;
  description_en: string | null;
  room: string | null;
  presentation_time: string | null;
  team_members: string[];
  expertise_tags: string[];
  department_id: string | null;
  conference_id: string;
}

interface Assignment {
  project_id: string;
  project: Project;
  evaluation?: {
    id: string;
    is_complete: boolean;
  } | null;
}

export default function Projects() {
  const { user, profile, roles, isApproved, isLoading: authLoading, refreshProfile } = useAuth();
  const { t, language, dir } = useLanguage();
  const navigate = useNavigate();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const ChevronIcon = dir === 'rtl' ? ChevronLeft : ChevronRight;

  const isStudent = roles.some(r => r.role === 'student');
  const isJudge = roles.some(r => r.role === 'judge');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
    // Refresh profile to get latest approval status
    if (user) {
      refreshProfile();
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && isApproved) {
      fetchAssignments();
    } else {
      setIsLoading(false);
    }
  }, [user, isApproved, roles]);

  const fetchAssignments = async () => {
    try {
      setIsLoading(true);

      if (isStudent && profile?.full_name) {
        // For students: fetch projects where they are team members
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select('*')
          .contains('team_members', [profile.full_name]);

        if (projectsError) throw projectsError;

        // Fetch evaluations for these projects
        const projectIds = projectsData?.map(p => p.id) || [];
        
        let evaluationsMap: Record<string, { id: string; is_complete: boolean }> = {};
        
        if (projectIds.length > 0) {
          const { data: evaluationsData } = await supabase
            .from('evaluations')
            .select('id, project_id, is_complete')
            .in('project_id', projectIds);

          evaluationsData?.forEach(e => {
            // For students, show if any evaluation is complete
            if (!evaluationsMap[e.project_id] || e.is_complete) {
              evaluationsMap[e.project_id] = { id: e.id, is_complete: e.is_complete || false };
            }
          });
        }

        const formattedAssignments = projectsData?.map(p => ({
          project_id: p.id,
          project: p as Project,
          evaluation: evaluationsMap[p.id] || null,
        })) || [];

        setAssignments(formattedAssignments);
      } else if (isJudge) {
        // For judges: fetch projects assigned to them
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from('judge_assignments')
          .select(`
            project_id,
            project:projects(*)
          `)
          .eq('judge_id', user!.id);

        if (assignmentsError) throw assignmentsError;

        // Fetch evaluations for these projects
        const projectIds = assignmentsData?.map(a => a.project_id) || [];
        
        let evaluationsMap: Record<string, { id: string; is_complete: boolean }> = {};
        
        if (projectIds.length > 0) {
          const { data: evaluationsData } = await supabase
            .from('evaluations')
            .select('id, project_id, is_complete')
            .eq('judge_id', user!.id)
            .in('project_id', projectIds);

          evaluationsData?.forEach(e => {
            evaluationsMap[e.project_id] = { id: e.id, is_complete: e.is_complete || false };
          });
        }

        const formattedAssignments = assignmentsData?.map(a => ({
          project_id: a.project_id,
          project: a.project as unknown as Project,
          evaluation: evaluationsMap[a.project_id] || null,
        })) || [];

        setAssignments(formattedAssignments);
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getProjectTitle = (project: Project) =>
    language === 'he' ? project.title_he : project.title_en;

  const getProjectDescription = (project: Project) =>
    language === 'he' ? project.description_he : project.description_en;

  const filteredAssignments = assignments.filter(a => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      a.project.title_he.toLowerCase().includes(query) ||
      a.project.title_en.toLowerCase().includes(query) ||
      a.project.team_members?.some(m => m.toLowerCase().includes(query)) ||
      a.project.expertise_tags?.some(t => t.toLowerCase().includes(query))
    );
  });

  const pendingCount = assignments.filter(a => !a.evaluation?.is_complete).length;
  const completedCount = assignments.filter(a => a.evaluation?.is_complete).length;

  if (authLoading || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isApproved) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <AlertCircle className="h-12 w-12 text-warning mb-4" />
          <h2 className="text-2xl font-bold mb-2">{t('auth.pendingApproval')}</h2>
          <p className="text-muted-foreground">
            {language === 'he'
              ? 'יש להמתין לאישור כדי לצפות בפרויקטים'
              : 'Please wait for approval to view projects'}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">{t('nav.projects')}</h1>
          <p className="text-muted-foreground mt-1">
            {isStudent
              ? language === 'he'
                ? 'הפרויקטים שאתה חבר בצוות שלהם'
                : 'Projects you are a team member of'
              : language === 'he'
              ? 'הפרויקטים שהוקצו לך להערכה'
              : 'Projects assigned to you for evaluation'}
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'he' ? 'סה"כ פרויקטים' : 'Total Projects'}
              </CardTitle>
              <FolderKanban className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assignments.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'he' ? 'ממתינים להערכה' : 'Pending Evaluation'}
              </CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{pendingCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'he' ? 'הושלמו' : 'Completed'}
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{completedCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={language === 'he' ? 'חיפוש פרויקטים...' : 'Search projects...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-10"
          />
        </div>

        {/* Projects List */}
        {filteredAssignments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FolderKanban className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {assignments.length === 0
                  ? language === 'he'
                    ? 'לא הוקצו לך פרויקטים עדיין'
                    : 'No projects assigned to you yet'
                  : language === 'he'
                  ? 'לא נמצאו תוצאות'
                  : 'No results found'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredAssignments.map(({ project, evaluation }) => (
              <Card key={project.id} className={`hover-lift ${!isStudent ? 'cursor-pointer' : ''} group`} onClick={() => !isStudent && navigate(`/evaluate/${project.id}`)}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg line-clamp-2">
                      {getProjectTitle(project)}
                    </CardTitle>
                    {evaluation?.is_complete ? (
                      <Badge variant="default" className="bg-success shrink-0">
                        <CheckCircle className="h-3 w-3 me-1" />
                        {language === 'he' ? 'הושלם' : 'Done'}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="shrink-0">
                        <Clock className="h-3 w-3 me-1" />
                        {language === 'he' ? 'ממתין' : 'Pending'}
                      </Badge>
                    )}
                  </div>
                  {getProjectDescription(project) && (
                    <CardDescription className="line-clamp-2 mt-2">
                      {getProjectDescription(project)}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Room & Time */}
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    {project.room && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {project.room}
                      </span>
                    )}
                    {project.presentation_time && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {project.presentation_time}
                      </span>
                    )}
                  </div>

                  {/* Team */}
                  {project.team_members && project.team_members.length > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground truncate">
                        {project.team_members.join(', ')}
                      </span>
                    </div>
                  )}

                  {/* Tags */}
                  {project.expertise_tags && project.expertise_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {project.expertise_tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {project.expertise_tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{project.expertise_tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Action - Only for judges */}
                  {!isStudent && (
                    <Button
                      variant={evaluation?.is_complete ? 'outline' : 'default'}
                      className="w-full gap-2 mt-2 group-hover:gap-3 transition-all"
                    >
                      {evaluation?.is_complete ? (
                        <>
                          {language === 'he' ? 'צפה בהערכה' : 'View Evaluation'}
                          <ChevronIcon className="h-4 w-4" />
                        </>
                      ) : (
                        <>
                          <ClipboardCheck className="h-4 w-4" />
                          {language === 'he' ? 'הערך פרויקט' : 'Evaluate Project'}
                          <ChevronIcon className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  )}
                  {/* Status for students */}
                  {isStudent && (
                    <div className="mt-2 text-sm text-muted-foreground text-center">
                      {evaluation?.is_complete
                        ? language === 'he' ? 'יש הערכות שהושלמו' : 'Has completed evaluations'
                        : language === 'he' ? 'ממתין להערכות' : 'Awaiting evaluations'}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
