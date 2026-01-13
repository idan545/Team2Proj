import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  MapPin,
  Clock,
  Users,
  Tag,
  AlertCircle,
  CheckCircle,
  User,
  FileText,
  ExternalLink,
} from 'lucide-react';

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
  is_complete: boolean;
  general_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface JudgeProfile {
  full_name: string;
  email: string;
}

export default function ViewEvaluation() {
  const { evaluationId } = useParams<{ evaluationId: string }>();
  const { user, roles, isLoading: authLoading } = useAuth();
  const { language, dir } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [scores, setScores] = useState<EvaluationScore[]>([]);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [judgeProfile, setJudgeProfile] = useState<JudgeProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const BackArrow = dir === 'rtl' ? ArrowRight : ArrowLeft;
  const isAdmin = roles?.some(r => r.role === 'department_manager');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && evaluationId) {
      fetchData();
    }
  }, [user, evaluationId]);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Fetch evaluation
      const { data: evalData, error: evalError } = await supabase
        .from('evaluations')
        .select('*')
        .eq('id', evaluationId)
        .maybeSingle();

      if (evalError) throw evalError;
      if (!evalData) {
        navigate('/evaluations');
        return;
      }

      setEvaluation(evalData as Evaluation);

      // Fetch judge profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('user_id', evalData.judge_id)
        .maybeSingle();

      if (profileData) {
        setJudgeProfile(profileData);
      }

      // Fetch project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', evalData.project_id)
        .maybeSingle();

      if (projectError) throw projectError;
      if (projectData) {
        setProject(projectData as Project);

        // Fetch criteria for this conference
        const { data: criteriaData } = await supabase
          .from('evaluation_criteria')
          .select('*')
          .eq('conference_id', projectData.conference_id)
          .order('sort_order', { ascending: true });

        setCriteria((criteriaData || []) as Criterion[]);
      }

      // Fetch scores
      const { data: scoresData } = await supabase
        .from('evaluation_scores')
        .select('*')
        .eq('evaluation_id', evaluationId);

      setScores((scoresData || []) as EvaluationScore[]);

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

  const getProjectTitle = (p: Project) => (language === 'he' ? p.title_he : p.title_en);
  const getProjectDescription = (p: Project) => (language === 'he' ? p.description_he : p.description_en);
  const getCriterionName = (c: Criterion) => (language === 'he' ? c.name_he : c.name_en);
  const getCriterionDescription = (c: Criterion) => (language === 'he' ? c.description_he : c.description_en);

  const getScoreForCriterion = (criterionId: string) => {
    return scores.find(s => s.criterion_id === criterionId);
  };

  const calculateTotalScore = () => {
    let totalWeightedScore = 0;
    let totalWeight = 0;

    criteria.forEach((c) => {
      const score = getScoreForCriterion(c.id)?.score || 0;
      const normalizedScore = (score / c.max_score) * 100;
      totalWeightedScore += normalizedScore * c.weight;
      totalWeight += c.weight;
    });

    return totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;
  };

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    if (percentage >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  if (authLoading || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-xl font-bold mb-2">
            {language === 'he' ? 'אין לך הרשאה לצפות בהערכה זו' : 'You do not have permission to view this evaluation'}
          </h2>
          <Link to="/evaluations">
            <Button variant="outline" className="mt-4">
              <BackArrow className="h-4 w-4 me-2" />
              {language === 'he' ? 'חזרה להערכות' : 'Back to Evaluations'}
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  if (!evaluation || !project) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold mb-2">
            {language === 'he' ? 'ההערכה לא נמצאה' : 'Evaluation not found'}
          </h2>
          <Link to="/evaluations">
            <Button variant="outline" className="mt-4">
              <BackArrow className="h-4 w-4 me-2" />
              {language === 'he' ? 'חזרה להערכות' : 'Back to Evaluations'}
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Back Button */}
        <Link to="/evaluations">
          <Button variant="ghost" className="gap-2">
            <BackArrow className="h-4 w-4" />
            {language === 'he' ? 'חזרה להערכות' : 'Back to Evaluations'}
          </Button>
        </Link>

        {/* Project Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-2xl">{getProjectTitle(project)}</CardTitle>
                {getProjectDescription(project) && (
                  <CardDescription className="mt-2 text-base">
                    {getProjectDescription(project)}
                  </CardDescription>
                )}
              </div>
              <Badge variant={evaluation.is_complete ? "default" : "secondary"} className={evaluation.is_complete ? "bg-green-500 shrink-0" : "shrink-0"}>
                {evaluation.is_complete ? (
                  <>
                    <CheckCircle className="h-3 w-3 me-1" />
                    {language === 'he' ? 'הושלם' : 'Completed'}
                  </>
                ) : (
                  <>
                    <Clock className="h-3 w-3 me-1" />
                    {language === 'he' ? 'טיוטה' : 'Draft'}
                  </>
                )}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
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
              {project.team_members && project.team_members.length > 0 && (
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {project.team_members.join(', ')}
                </span>
              )}
            </div>
            {project.expertise_tags && project.expertise_tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {project.expertise_tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    <Tag className="h-3 w-3 me-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            
            {/* Presentation Link */}
            {project.presentation_url && (
              <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="font-medium">
                      {language === 'he' ? 'מצגת הפרויקט' : 'Project Presentation'}
                    </span>
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => window.open(project.presentation_url!, '_blank')}
                    className="gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {language === 'he' ? 'פתח מצגת' : 'Open Presentation'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Judge Info */}
        {judgeProfile && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{judgeProfile.full_name}</p>
                  <p className="text-sm text-muted-foreground">{judgeProfile.email}</p>
                </div>
                <div className="ms-auto text-sm text-muted-foreground">
                  {language === 'he' ? 'שופט' : 'Judge'}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Total Score Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium">
                {language === 'he' ? 'ציון משוקלל כולל' : 'Total Weighted Score'}
              </span>
              <span className="text-3xl font-bold text-primary">{calculateTotalScore()}/100</span>
            </div>
            <Progress value={calculateTotalScore()} className="h-3 mt-3" />
          </CardContent>
        </Card>

        {/* Scores by Criterion */}
        {criteria.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">
              {language === 'he' ? 'ציונים לפי קריטריון' : 'Scores by Criterion'}
            </h2>

            {criteria.map((criterion, index) => {
              const scoreData = getScoreForCriterion(criterion.id);
              const score = scoreData?.score || 0;
              
              return (
                <Card key={criterion.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-bold">
                            {index + 1}
                          </span>
                          {getCriterionName(criterion)}
                        </CardTitle>
                        {getCriterionDescription(criterion) && (
                          <CardDescription className="mt-1">
                            {getCriterionDescription(criterion)}
                          </CardDescription>
                        )}
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        {language === 'he' ? 'משקל' : 'Weight'}: {criterion.weight}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {language === 'he' ? 'ציון' : 'Score'}
                      </span>
                      <span className={`text-2xl font-bold ${getScoreColor(score, criterion.max_score)}`}>
                        {score}/{criterion.max_score}
                      </span>
                    </div>
                    <Progress 
                      value={(score / criterion.max_score) * 100} 
                      className="h-2" 
                    />
                    
                    {scoreData?.notes && (
                      <div className="mt-3 p-3 rounded-lg bg-muted/50">
                        <p className="text-sm font-medium mb-1">
                          {language === 'he' ? 'הערות:' : 'Notes:'}
                        </p>
                        <p className="text-sm text-muted-foreground">{scoreData.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* General Notes */}
        {evaluation.general_notes && (
          <Card>
            <CardHeader>
              <CardTitle>{language === 'he' ? 'הערות כלליות' : 'General Notes'}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">{evaluation.general_notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Metadata */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
              <div>
                <span className="font-medium">{language === 'he' ? 'נוצר:' : 'Created:'}</span>{' '}
                {new Date(evaluation.created_at).toLocaleString(language === 'he' ? 'he-IL' : 'en-US')}
              </div>
              <div>
                <span className="font-medium">{language === 'he' ? 'עודכן:' : 'Updated:'}</span>{' '}
                {new Date(evaluation.updated_at).toLocaleString(language === 'he' ? 'he-IL' : 'en-US')}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
