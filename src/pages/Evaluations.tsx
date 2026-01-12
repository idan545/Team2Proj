import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { ClipboardList, CheckCircle, Clock, Eye, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Evaluation {
  id: string;
  project_id: string;
  judge_id: string;
  is_complete: boolean;
  general_notes: string | null;
  created_at: string;
  updated_at: string;
  project?: {
    title_he: string;
    title_en: string;
    room: string | null;
  };
  judge_profile?: {
    full_name: string;
    email: string;
  };
  scores?: {
    criterion_id: string;
    score: number;
    criterion?: {
      name_he: string;
      name_en: string;
      max_score: number;
      weight: number;
    };
  }[];
}

interface Conference {
  id: string;
  name_he: string;
  name_en: string;
}

const Evaluations = () => {
  const { t, language } = useLanguage();
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [selectedConference, setSelectedConference] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const isAdmin = roles?.some(r => r.role === 'department_manager');

  useEffect(() => {
    fetchConferences();
  }, []);

  useEffect(() => {
    if (selectedConference) {
      fetchEvaluations();
    }
  }, [selectedConference, user, isAdmin]);

  const fetchConferences = async () => {
    const { data, error } = await supabase
      .from('conferences')
      .select('id, name_he, name_en')
      .eq('is_active', true)
      .order('event_date', { ascending: false });

    if (error) {
      toast({
        title: language === 'he' ? 'שגיאה' : 'Error',
        description: language === 'he' ? 'שגיאה בטעינת כנסים' : 'Error loading conferences',
        variant: 'destructive',
      });
      return;
    }

    setConferences(data || []);
    if (data && data.length > 0) {
      setSelectedConference(data[0].id);
    }
  };

  const fetchEvaluations = async () => {
    if (!user) return;
    
    setLoading(true);
    
    // First, get evaluations
    let query = supabase
      .from('evaluations')
      .select(`
        id,
        project_id,
        judge_id,
        is_complete,
        general_notes,
        created_at,
        updated_at
      `);

    // If not admin, only show own evaluations
    if (!isAdmin) {
      query = query.eq('judge_id', user.id);
    }

    const { data: evaluationsData, error: evaluationsError } = await query;

    if (evaluationsError) {
      toast({
        title: language === 'he' ? 'שגיאה' : 'Error',
        description: language === 'he' ? 'שגיאה בטעינת הערכות' : 'Error loading evaluations',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    if (!evaluationsData || evaluationsData.length === 0) {
      setEvaluations([]);
      setLoading(false);
      return;
    }

    // Get project details
    const projectIds = [...new Set(evaluationsData.map(e => e.project_id))];
    const { data: projectsData } = await supabase
      .from('projects')
      .select('id, title_he, title_en, room, conference_id')
      .in('id', projectIds)
      .eq('conference_id', selectedConference);

    // Get judge profiles for admin view
    let profilesData: any[] = [];
    if (isAdmin) {
      const judgeIds = [...new Set(evaluationsData.map(e => e.judge_id))];
      const { data } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', judgeIds);
      profilesData = data || [];
    }

    // Get scores for each evaluation
    const evaluationIds = evaluationsData.map(e => e.id);
    const { data: scoresData } = await supabase
      .from('evaluation_scores')
      .select(`
        evaluation_id,
        criterion_id,
        score
      `)
      .in('evaluation_id', evaluationIds);

    // Get criteria details
    const { data: criteriaData } = await supabase
      .from('evaluation_criteria')
      .select('id, name_he, name_en, max_score, weight')
      .eq('conference_id', selectedConference);

    // Combine all data
    const projectsMap = new Map(projectsData?.map(p => [p.id, p]) || []);
    const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);
    const criteriaMap = new Map(criteriaData?.map(c => [c.id, c]) || []);

    const enrichedEvaluations = evaluationsData
      .filter(e => projectsMap.has(e.project_id))
      .map(evaluation => {
        const evalScores = scoresData?.filter(s => s.evaluation_id === evaluation.id) || [];
        return {
          ...evaluation,
          project: projectsMap.get(evaluation.project_id),
          judge_profile: profilesMap.get(evaluation.judge_id),
          scores: evalScores.map(s => ({
            ...s,
            criterion: criteriaMap.get(s.criterion_id),
          })),
        };
      });

    setEvaluations(enrichedEvaluations);
    setLoading(false);
  };

  const calculateTotalScore = (evaluation: Evaluation) => {
    if (!evaluation.scores || evaluation.scores.length === 0) return null;
    
    let weightedSum = 0;
    let totalWeight = 0;
    
    evaluation.scores.forEach(score => {
      if (score.criterion) {
        const normalizedScore = (score.score / score.criterion.max_score) * 100;
        weightedSum += normalizedScore * score.criterion.weight;
        totalWeight += score.criterion.weight;
      }
    });
    
    return totalWeight > 0 ? (weightedSum / totalWeight).toFixed(1) : null;
  };

  const filteredEvaluations = evaluations.filter(e => {
    if (statusFilter === "complete") return e.is_complete;
    if (statusFilter === "pending") return !e.is_complete;
    return true;
  });

  const stats = {
    total: evaluations.length,
    complete: evaluations.filter(e => e.is_complete).length,
    pending: evaluations.filter(e => !e.is_complete).length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              {language === 'he' ? 'הערכות' : 'Evaluations'}
            </h1>
            <p className="text-muted-foreground">
              {isAdmin 
                ? (language === 'he' ? 'צפייה בכל ההערכות של הכנס' : 'View all conference evaluations')
                : (language === 'he' ? 'ההערכות שלי' : 'My evaluations')
              }
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Select value={selectedConference} onValueChange={setSelectedConference}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder={language === 'he' ? 'בחר כנס' : 'Select conference'} />
            </SelectTrigger>
            <SelectContent>
              {conferences.map(conf => (
                <SelectItem key={conf.id} value={conf.id}>
                  {language === 'he' ? conf.name_he : conf.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="h-4 w-4 me-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {language === 'he' ? 'הכל' : 'All'}
              </SelectItem>
              <SelectItem value="complete">
                {language === 'he' ? 'הושלמו' : 'Completed'}
              </SelectItem>
              <SelectItem value="pending">
                {language === 'he' ? 'ממתינים' : 'Pending'}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {language === 'he' ? 'סה"כ הערכות' : 'Total Evaluations'}
              </CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {language === 'he' ? 'הושלמו' : 'Completed'}
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.complete}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {language === 'he' ? 'ממתינים' : 'Pending'}
              </CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>
        </div>

        {/* Evaluations Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {language === 'he' ? 'רשימת הערכות' : 'Evaluations List'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                {language === 'he' ? 'טוען...' : 'Loading...'}
              </div>
            ) : filteredEvaluations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {language === 'he' ? 'לא נמצאו הערכות' : 'No evaluations found'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'he' ? 'פרויקט' : 'Project'}</TableHead>
                      {isAdmin && (
                        <TableHead>{language === 'he' ? 'שופט' : 'Judge'}</TableHead>
                      )}
                      <TableHead>{language === 'he' ? 'חדר' : 'Room'}</TableHead>
                      <TableHead>{language === 'he' ? 'סטטוס' : 'Status'}</TableHead>
                      <TableHead>{language === 'he' ? 'ציון משוקלל' : 'Weighted Score'}</TableHead>
                      <TableHead>{language === 'he' ? 'עודכן' : 'Updated'}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEvaluations.map(evaluation => {
                      const totalScore = calculateTotalScore(evaluation);
                      return (
                        <TableRow key={evaluation.id}>
                          <TableCell className="font-medium">
                            {language === 'he' 
                              ? evaluation.project?.title_he 
                              : evaluation.project?.title_en
                            }
                          </TableCell>
                          {isAdmin && (
                            <TableCell>
                              <div>
                                <div className="font-medium">{evaluation.judge_profile?.full_name}</div>
                                <div className="text-sm text-muted-foreground">{evaluation.judge_profile?.email}</div>
                              </div>
                            </TableCell>
                          )}
                          <TableCell>{evaluation.project?.room || '-'}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={evaluation.is_complete ? "default" : "secondary"}
                              className={evaluation.is_complete ? "bg-green-500 hover:bg-green-600 text-white" : ""}
                            >
                              {evaluation.is_complete 
                                ? (language === 'he' ? 'הושלם' : 'Completed')
                                : (language === 'he' ? 'טיוטה' : 'Draft')
                              }
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {totalScore ? (
                              <span className="font-semibold">{totalScore}%</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(evaluation.updated_at).toLocaleDateString(
                              language === 'he' ? 'he-IL' : 'en-US'
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (isAdmin) {
                                  navigate(`/view-evaluation/${evaluation.id}`);
                                } else {
                                  navigate(`/evaluate/${evaluation.project_id}`);
                                }
                              }}
                            >
                              <Eye className="h-4 w-4 me-1" />
                              {language === 'he' ? 'צפה' : 'View'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Evaluations;
