import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  MapPin,
  Clock,
  Users,
  Tag,
  AlertCircle,
  CheckCircle,
  Search,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  User,
  FileText,
  ExternalLink,
  Star,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Project {
  id: string;
  title_he: string;
  title_en: string;
  description_he: string | null;
  description_en: string | null;
  room: string | null;
  presentation_time: string | null;
  presentation_url: string | null;
  team_members: string[];
  expertise_tags: string[];
  conference_id: string;
}

interface Conference {
  id: string;
  name_he: string;
  name_en: string;
}

interface Criterion {
  id: string;
  name_he: string;
  name_en: string;
  description_he: string | null;
  description_en: string | null;
  max_score: number;
  weight: number;
  sort_order: number;
}

interface EvaluationScore {
  criterion_id: string;
  score: number;
  notes: string | null;
}

interface Evaluation {
  id: string;
  project_id: string;
  judge_id: string;
  is_complete: boolean;
  general_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface JudgeProfile {
  full_name: string;
}

interface ProjectWithEvaluations {
  project: Project;
  conference: Conference | null;
  evaluations: Array<{
    evaluation: Evaluation;
    judge: JudgeProfile | null;
    scores: EvaluationScore[];
    criteria: Criterion[];
    totalScore: number;
  }>;
  averageScore: number;
}

export default function StudentGrades() {
  const { user, roles, profile, isLoading: authLoading } = useAuth();
  const { language, dir } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [projectsWithEvaluations, setProjectsWithEvaluations] = useState<ProjectWithEvaluations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});

  const isStudent = roles?.some(r => r.role === 'student');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && profile) {
      fetchData();
    }
  }, [user, profile]);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Fetch projects where the student is a team member
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .contains('team_members', [profile?.full_name || '']);

      if (projectsError) throw projectsError;

      const projects = (projectsData || []) as Project[];

      // Fetch conferences
      const conferenceIds = [...new Set(projects.map(p => p.conference_id))];
      const { data: conferencesData } = await supabase
        .from('conferences')
        .select('id, name_he, name_en')
        .in('id', conferenceIds);

      const conferencesMap = new Map<string, Conference>();
      (conferencesData || []).forEach((c) => {
        conferencesMap.set(c.id, c as Conference);
      });

      // Fetch all evaluations for these projects
      const projectIds = projects.map(p => p.id);
      const { data: evaluationsData } = await supabase
        .from('evaluations')
        .select('*')
        .in('project_id', projectIds)
        .eq('is_complete', true);

      const evaluations = (evaluationsData || []) as Evaluation[];

      // Fetch all evaluation scores
      const evaluationIds = evaluations.map(e => e.id);
      const { data: scoresData } = await supabase
        .from('evaluation_scores')
        .select('*')
        .in('evaluation_id', evaluationIds);

      const scores = (scoresData || []) as (EvaluationScore & { evaluation_id: string })[];

      // Fetch all criteria for the conferences
      const { data: criteriaData } = await supabase
        .from('evaluation_criteria')
        .select('*')
        .in('conference_id', conferenceIds)
        .order('sort_order', { ascending: true });

      const criteria = (criteriaData || []) as (Criterion & { conference_id: string })[];

      // Fetch judge profiles
      const judgeIds = [...new Set(evaluations.map(e => e.judge_id))];
      const { data: judgesData } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', judgeIds);

      const judgesMap = new Map<string, JudgeProfile>();
      (judgesData || []).forEach((j) => {
        judgesMap.set(j.user_id, { full_name: j.full_name });
      });

      // Build the data structure
      const result: ProjectWithEvaluations[] = projects.map(project => {
        const projectEvaluations = evaluations.filter(e => e.project_id === project.id);
        const projectCriteria = criteria.filter(c => c.conference_id === project.conference_id);

        const evaluationsWithDetails = projectEvaluations.map(evaluation => {
          const evalScores = scores.filter(s => s.evaluation_id === evaluation.id);
          const totalScore = calculateTotalScore(evalScores, projectCriteria);

          return {
            evaluation,
            judge: judgesMap.get(evaluation.judge_id) || null,
            scores: evalScores,
            criteria: projectCriteria,
            totalScore,
          };
        });

        const averageScore = evaluationsWithDetails.length > 0
          ? Math.round(evaluationsWithDetails.reduce((sum, e) => sum + e.totalScore, 0) / evaluationsWithDetails.length)
          : 0;

        return {
          project,
          conference: conferencesMap.get(project.conference_id) || null,
          evaluations: evaluationsWithDetails,
          averageScore,
        };
      });

      setProjectsWithEvaluations(result);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        variant: 'destructive',
        title: language === 'he' ? 'שגיאה' : 'Error',
        description: language === 'he' ? 'לא ניתן לטעון את הנתונים' : 'Failed to load data',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotalScore = (evalScores: EvaluationScore[], projectCriteria: Criterion[]) => {
    let totalWeightedScore = 0;
    let totalWeight = 0;

    projectCriteria.forEach((c) => {
      const score = evalScores.find(s => s.criterion_id === c.id)?.score || 0;
      const normalizedScore = (score / c.max_score) * 100;
      totalWeightedScore += normalizedScore * c.weight;
      totalWeight += c.weight;
    });

    return totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;
  };

  const getProjectTitle = (p: Project) => (language === 'he' ? p.title_he : p.title_en);
  const getProjectDescription = (p: Project) => (language === 'he' ? p.description_he : p.description_en);
  const getConferenceName = (c: Conference | null) => c ? (language === 'he' ? c.name_he : c.name_en) : '';
  const getCriterionName = (c: Criterion) => (language === 'he' ? c.name_he : c.name_en);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 border-green-200';
    if (score >= 60) return 'bg-yellow-100 border-yellow-200';
    if (score >= 40) return 'bg-orange-100 border-orange-200';
    return 'bg-red-100 border-red-200';
  };

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

  const filteredProjects = projectsWithEvaluations.filter(item => {
    const query = searchQuery.toLowerCase();
    return (
      getProjectTitle(item.project).toLowerCase().includes(query) ||
      item.project.team_members.some(m => m.toLowerCase().includes(query)) ||
      getConferenceName(item.conference).toLowerCase().includes(query)
    );
  });

  const projectsWithGrades = filteredProjects.filter(p => p.evaluations.length > 0);
  const projectsWithoutGrades = filteredProjects.filter(p => p.evaluations.length === 0);

  if (authLoading || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isStudent) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-xl font-bold mb-2">
            {language === 'he' ? 'דף זה זמין לסטודנטים בלבד' : 'This page is only available to students'}
          </h2>
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="mt-4">
            {language === 'he' ? 'חזרה לדשבורד' : 'Back to Dashboard'}
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <GraduationCap className="h-8 w-8 text-primary" />
              {language === 'he' ? 'הציונים שלי' : 'My Grades'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {language === 'he'
                ? 'צפה בהערכות והציונים שקיבלת עבור הפרויקטים שלך'
                : 'View the evaluations and grades you received for your projects'}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{projectsWithEvaluations.length}</p>
                  <p className="text-sm text-muted-foreground">
                    {language === 'he' ? 'פרויקטים' : 'Projects'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{projectsWithGrades.length}</p>
                  <p className="text-sm text-muted-foreground">
                    {language === 'he' ? 'קיבלו הערכה' : 'Received Grades'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-100">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{projectsWithoutGrades.length}</p>
                  <p className="text-sm text-muted-foreground">
                    {language === 'he' ? 'ממתינים להערכה' : 'Pending Evaluation'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={language === 'he' ? 'חיפוש לפי שם פרויקט או כנס...' : 'Search by project or conference name...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-10"
          />
        </div>

        {/* Projects with Grades */}
        {projectsWithGrades.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              {language === 'he' ? 'פרויקטים שהוערכו' : 'Evaluated Projects'}
            </h2>

            {projectsWithGrades.map((item) => (
              <Collapsible
                key={item.project.id}
                open={expandedProjects[item.project.id]}
                onOpenChange={() => toggleProject(item.project.id)}
              >
                <Card className="overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{getProjectTitle(item.project)}</CardTitle>
                          {item.conference && (
                            <CardDescription className="mt-1">
                              {getConferenceName(item.conference)}
                            </CardDescription>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className={`px-4 py-2 rounded-lg border ${getScoreBgColor(item.averageScore)}`}>
                            <span className={`text-2xl font-bold ${getScoreColor(item.averageScore)}`}>
                              {item.averageScore}
                            </span>
                            <span className="text-sm text-muted-foreground">/100</span>
                          </div>
                          <Badge variant="secondary">
                            {item.evaluations.length} {language === 'he' ? 'הערכות' : 'evaluations'}
                          </Badge>
                          {expandedProjects[item.project.id] ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-6">
                      {/* Project Details */}
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {item.project.room && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {item.project.room}
                          </span>
                        )}
                        {item.project.presentation_time && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {item.project.presentation_time}
                          </span>
                        )}
                        {item.project.team_members && item.project.team_members.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {item.project.team_members.join(', ')}
                          </span>
                        )}
                      </div>

                      {/* Evaluations */}
                      <div className="space-y-4">
                        <h3 className="font-medium">
                          {language === 'he' ? 'הערכות שופטים' : 'Judge Evaluations'}
                        </h3>

                        {item.evaluations.map((evalItem, evalIndex) => (
                          <Card key={evalItem.evaluation.id} className="bg-muted/30">
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                                    <User className="h-4 w-4 text-primary" />
                                  </div>
                                  <div>
                                    <p className="font-medium">
                                      {evalItem.judge?.full_name || (language === 'he' ? 'שופט' : 'Judge')} {evalIndex + 1}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(evalItem.evaluation.updated_at).toLocaleDateString(
                                        language === 'he' ? 'he-IL' : 'en-US'
                                      )}
                                    </p>
                                  </div>
                                </div>
                                <div className={`px-3 py-1 rounded-lg border ${getScoreBgColor(evalItem.totalScore)}`}>
                                  <span className={`font-bold ${getScoreColor(evalItem.totalScore)}`}>
                                    {evalItem.totalScore}/100
                                  </span>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              {/* Scores by criterion */}
                              <div className="grid gap-2">
                                {evalItem.criteria.map((criterion) => {
                                  const scoreData = evalItem.scores.find(s => s.criterion_id === criterion.id);
                                  const score = scoreData?.score || 0;
                                  const percentage = (score / criterion.max_score) * 100;

                                  return (
                                    <div key={criterion.id} className="flex items-center gap-3">
                                      <span className="text-sm min-w-[120px] md:min-w-[180px] truncate">
                                        {getCriterionName(criterion)}
                                      </span>
                                      <Progress value={percentage} className="h-2 flex-1" />
                                      <span className={`text-sm font-medium min-w-[50px] text-end ${getScoreColor(percentage)}`}>
                                        {score}/{criterion.max_score}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* General notes */}
                              {evalItem.evaluation.general_notes && (
                                <div className="p-3 rounded-lg bg-background border">
                                  <p className="text-sm font-medium mb-1">
                                    {language === 'he' ? 'הערות כלליות:' : 'General Notes:'}
                                  </p>
                                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                    {evalItem.evaluation.general_notes}
                                  </p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        )}

        {/* Projects without Grades */}
        {projectsWithoutGrades.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              {language === 'he' ? 'ממתינים להערכה' : 'Pending Evaluation'}
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              {projectsWithoutGrades.map((item) => (
                <Card key={item.project.id} className="bg-muted/30">
                  <CardHeader>
                    <CardTitle className="text-lg">{getProjectTitle(item.project)}</CardTitle>
                    {item.conference && (
                      <CardDescription>{getConferenceName(item.conference)}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {language === 'he' ? 'טרם נבדק על ידי שופטים' : 'Not yet evaluated by judges'}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredProjects.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <GraduationCap className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery
                  ? (language === 'he' ? 'לא נמצאו תוצאות' : 'No results found')
                  : (language === 'he' ? 'אין פרויקטים' : 'No projects')}
              </h3>
              <p className="text-muted-foreground max-w-md">
                {searchQuery
                  ? (language === 'he' ? 'נסה לחפש במונחים אחרים' : 'Try searching with different terms')
                  : (language === 'he' ? 'אינך משויך לאף פרויקט כרגע' : 'You are not assigned to any projects yet')}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
