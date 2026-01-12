import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Save,
  Send,
  MapPin,
  Clock,
  Users,
  Tag,
  AlertCircle,
  CheckCircle,
  Info,
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
  conference_id: string;
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

interface Score {
  criterion_id: string;
  score: number;
  notes: string;
}

interface Evaluation {
  id: string;
  is_complete: boolean;
  general_notes: string | null;
}

export default function Evaluate() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user, isApproved, isLoading: authLoading } = useAuth();
  const { t, language, dir } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [scores, setScores] = useState<Record<string, Score>>({});
  const [generalNotes, setGeneralNotes] = useState('');
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const BackArrow = dir === 'rtl' ? ArrowRight : ArrowLeft;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && isApproved && projectId) {
      fetchData();
    } else {
      setIsLoading(false);
    }
  }, [user, isApproved, projectId]);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Fetch project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .maybeSingle();

      if (projectError) throw projectError;
      if (!projectData) {
        navigate('/projects');
        return;
      }

      setProject(projectData as Project);

      // Fetch criteria for this conference
      const { data: criteriaData, error: criteriaError } = await supabase
        .from('evaluation_criteria')
        .select('*')
        .eq('conference_id', projectData.conference_id)
        .order('sort_order', { ascending: true });

      if (criteriaError) throw criteriaError;
      setCriteria(criteriaData as Criterion[]);

      // Initialize scores
      const initialScores: Record<string, Score> = {};
      criteriaData?.forEach((c) => {
        initialScores[c.id] = {
          criterion_id: c.id,
          score: Math.floor(c.max_score / 2),
          notes: '',
        };
      });

      // Fetch existing evaluation if any
      const { data: evalData, error: evalError } = await supabase
        .from('evaluations')
        .select('*')
        .eq('project_id', projectId)
        .eq('judge_id', user!.id)
        .maybeSingle();

      if (evalError) throw evalError;

      if (evalData) {
        setEvaluation(evalData as Evaluation);
        setGeneralNotes(evalData.general_notes || '');

        // Fetch existing scores
        const { data: scoresData } = await supabase
          .from('evaluation_scores')
          .select('*')
          .eq('evaluation_id', evalData.id);

        scoresData?.forEach((s) => {
          if (initialScores[s.criterion_id]) {
            initialScores[s.criterion_id] = {
              criterion_id: s.criterion_id,
              score: s.score,
              notes: s.notes || '',
            };
          }
        });
      }

      setScores(initialScores);
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

  const handleScoreChange = (criterionId: string, value: number[]) => {
    setScores((prev) => ({
      ...prev,
      [criterionId]: {
        ...prev[criterionId],
        score: value[0],
      },
    }));
  };

  const handleNotesChange = (criterionId: string, notes: string) => {
    setScores((prev) => ({
      ...prev,
      [criterionId]: {
        ...prev[criterionId],
        notes,
      },
    }));
  };

  const saveEvaluation = async (complete: boolean = false) => {
    if (complete) {
      setIsSubmitting(true);
    } else {
      setIsSaving(true);
    }

    try {
      let evaluationId = evaluation?.id;

      // Create or update evaluation
      if (!evaluationId) {
        const { data: newEval, error: evalError } = await supabase
          .from('evaluations')
          .insert({
            project_id: projectId,
            judge_id: user!.id,
            general_notes: generalNotes,
            is_complete: complete,
          })
          .select()
          .single();

        if (evalError) throw evalError;
        evaluationId = newEval.id;
        setEvaluation(newEval as Evaluation);
      } else {
        const { error: updateError } = await supabase
          .from('evaluations')
          .update({
            general_notes: generalNotes,
            is_complete: complete,
          })
          .eq('id', evaluationId);

        if (updateError) throw updateError;
      }

      // Upsert scores
      const scoresArray = Object.values(scores).map((s) => ({
        evaluation_id: evaluationId,
        criterion_id: s.criterion_id,
        score: s.score,
        notes: s.notes || null,
      }));

      // Delete existing scores and insert new ones
      await supabase.from('evaluation_scores').delete().eq('evaluation_id', evaluationId);

      if (scoresArray.length > 0) {
        const { error: scoresError } = await supabase
          .from('evaluation_scores')
          .insert(scoresArray);

        if (scoresError) throw scoresError;
      }

      toast({
        title: complete
          ? language === 'he' ? 'ההערכה נשלחה' : 'Evaluation Submitted'
          : language === 'he' ? 'נשמר בהצלחה' : 'Saved Successfully',
        description: complete
          ? language === 'he' ? 'ההערכה שלך הוגשה בהצלחה' : 'Your evaluation has been submitted'
          : language === 'he' ? 'הטיוטה נשמרה' : 'Draft saved',
      });

      if (complete) {
        navigate('/projects');
      }
    } catch (error) {
      console.error('Error saving evaluation:', error);
      toast({
        variant: 'destructive',
        title: language === 'he' ? 'שגיאה' : 'Error',
        description: language === 'he' ? 'לא ניתן לשמור את ההערכה' : 'Failed to save evaluation',
      });
    } finally {
      setIsSaving(false);
      setIsSubmitting(false);
    }
  };

  const getProjectTitle = (p: Project) => (language === 'he' ? p.title_he : p.title_en);
  const getProjectDescription = (p: Project) => (language === 'he' ? p.description_he : p.description_en);
  const getCriterionName = (c: Criterion) => (language === 'he' ? c.name_he : c.name_en);
  const getCriterionDescription = (c: Criterion) => (language === 'he' ? c.description_he : c.description_en);

  const calculateTotalScore = () => {
    let totalWeightedScore = 0;
    let totalWeight = 0;

    criteria.forEach((c) => {
      const score = scores[c.id]?.score || 0;
      const normalizedScore = (score / c.max_score) * 100;
      totalWeightedScore += normalizedScore * c.weight;
      totalWeight += c.weight;
    });

    return totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;
  };

  const getCompletionPercentage = () => {
    const scoredCriteria = Object.values(scores).filter((s) => s.score > 0).length;
    return criteria.length > 0 ? Math.round((scoredCriteria / criteria.length) * 100) : 0;
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

  if (!isApproved) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <AlertCircle className="h-12 w-12 text-warning mb-4" />
          <h2 className="text-2xl font-bold mb-2">{t('auth.pendingApproval')}</h2>
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold mb-2">
            {language === 'he' ? 'הפרויקט לא נמצא' : 'Project not found'}
          </h2>
          <Link to="/projects">
            <Button variant="outline" className="mt-4">
              <BackArrow className="h-4 w-4 me-2" />
              {language === 'he' ? 'חזרה לפרויקטים' : 'Back to Projects'}
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
        <Link to="/projects">
          <Button variant="ghost" className="gap-2">
            <BackArrow className="h-4 w-4" />
            {language === 'he' ? 'חזרה לפרויקטים' : 'Back to Projects'}
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
              {evaluation?.is_complete && (
                <Badge variant="default" className="bg-success shrink-0">
                  <CheckCircle className="h-3 w-3 me-1" />
                  {language === 'he' ? 'הושלם' : 'Completed'}
                </Badge>
              )}
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

        {/* Progress Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                {language === 'he' ? 'התקדמות ההערכה' : 'Evaluation Progress'}
              </span>
              <span className="text-sm text-muted-foreground">{getCompletionPercentage()}%</span>
            </div>
            <Progress value={getCompletionPercentage()} className="h-2" />
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-muted-foreground">
                {language === 'he' ? 'ציון משוקלל כולל' : 'Total Weighted Score'}
              </span>
              <span className="text-2xl font-bold text-primary">{calculateTotalScore()}/100</span>
            </div>
          </CardContent>
        </Card>

        {/* Criteria */}
        {criteria.length === 0 ? (
          <Card className="border-warning/50 bg-warning/5">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-warning mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {language === 'he'
                  ? 'לא ניתן להעריך פרויקט זה'
                  : 'Cannot evaluate this project'}
              </h3>
              <p className="text-muted-foreground max-w-md">
                {language === 'he'
                  ? 'מנהל הכנס טרם הגדיר קריטריוני הערכה. יש לפנות למנהל הכנס כדי שיגדיר קריטריונים לפני שניתן יהיה להעריך פרויקטים.'
                  : 'The conference manager has not defined evaluation criteria yet. Please contact the conference manager to set up criteria before evaluating projects.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">
              {language === 'he' ? 'קריטריוני הערכה' : 'Evaluation Criteria'}
            </h2>

            {criteria.map((criterion, index) => (
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
                <CardContent className="space-y-4">
                  {/* Score Slider */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>{language === 'he' ? 'ציון' : 'Score'}</Label>
                      <span className="text-2xl font-bold text-primary">
                        {scores[criterion.id]?.score || 0}/{criterion.max_score}
                      </span>
                    </div>
                    <Slider
                      value={[scores[criterion.id]?.score || 0]}
                      onValueChange={(value) => handleScoreChange(criterion.id, value)}
                      max={criterion.max_score}
                      min={0}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{language === 'he' ? 'נמוך' : 'Low'}</span>
                      <span>{language === 'he' ? 'גבוה' : 'High'}</span>
                    </div>
                  </div>

                  <Separator />

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label>{language === 'he' ? 'הערות לקריטריון' : 'Criterion Notes'}</Label>
                    <Textarea
                      value={scores[criterion.id]?.notes || ''}
                      onChange={(e) => handleNotesChange(criterion.id, e.target.value)}
                      placeholder={
                        language === 'he'
                          ? 'הוסף הערות לקריטריון זה (אופציונלי)'
                          : 'Add notes for this criterion (optional)'
                      }
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* General Notes */}
        <Card>
          <CardHeader>
            <CardTitle>{t('evaluations.generalNotes')}</CardTitle>
            <CardDescription>
              {language === 'he'
                ? 'הערות כלליות על הפרויקט והמצגת'
                : 'General notes about the project and presentation'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              placeholder={
                language === 'he' ? 'הוסף הערות כלליות...' : 'Add general notes...'
              }
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end sticky bottom-4 bg-background/80 backdrop-blur-lg p-4 rounded-lg border">
          <Button
            variant="outline"
            onClick={() => saveEvaluation(false)}
            disabled={isSaving || isSubmitting}
            className="gap-2"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {t('evaluations.save')}
          </Button>
          <Button
            onClick={() => saveEvaluation(true)}
            disabled={isSaving || isSubmitting || criteria.length === 0}
            className="gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {t('evaluations.submit')}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
