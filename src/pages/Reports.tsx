import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileText, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProjectScore {
  id: string;
  title_he: string;
  title_en: string;
  room: string | null;
  team_members: string[] | null;
  department_name_he?: string;
  department_name_en?: string;
  evaluations_count: number;
  completed_count: number;
  judges_count: number;
  average_score: number | null;
}

interface Conference {
  id: string;
  name_he: string;
  name_en: string;
}

const Reports = () => {
  const { language } = useLanguage();
  const { roles } = useAuth();
  const { toast } = useToast();

  const [conferences, setConferences] = useState<Conference[]>([]);
  const [selectedConference, setSelectedConference] = useState<string>("");
  const [projectScores, setProjectScores] = useState<ProjectScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalJudges, setTotalJudges] = useState(0);

  const isAdmin = roles?.some(r => r.role === 'department_manager');

  useEffect(() => {
    fetchConferences();
  }, []);

  useEffect(() => {
    if (selectedConference) {
      fetchData();
    }
  }, [selectedConference]);

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

  const fetchData = async () => {
    setLoading(true);

    // Fetch criteria for weighted calculation
    const { data: criteriaData } = await supabase
      .from('evaluation_criteria')
      .select('id, max_score, weight')
      .eq('conference_id', selectedConference);

    // Fetch projects with departments
    const { data: projectsData } = await supabase
      .from('projects')
      .select(`
        id, title_he, title_en, room, team_members, department_id,
        departments(name_he, name_en)
      `)
      .eq('conference_id', selectedConference);

    if (!projectsData || projectsData.length === 0) {
      setProjectScores([]);
      setLoading(false);
      return;
    }

    // Fetch all evaluations for these projects
    const projectIds = projectsData.map(p => p.id);
    const { data: evaluationsData } = await supabase
      .from('evaluations')
      .select('id, project_id, is_complete, judge_id')
      .in('project_id', projectIds);

    // Count unique judges
    const uniqueJudges = new Set(evaluationsData?.map(e => e.judge_id) || []);
    setTotalJudges(uniqueJudges.size);

    // Fetch all scores
    const evaluationIds = evaluationsData?.map(e => e.id) || [];
    const { data: scoresData } = await supabase
      .from('evaluation_scores')
      .select('evaluation_id, criterion_id, score')
      .in('evaluation_id', evaluationIds);

    // Calculate scores per project
    const projectScoresMap = new Map<string, ProjectScore>();

    projectsData.forEach(project => {
      const projectEvaluations = evaluationsData?.filter(e => e.project_id === project.id) || [];
      const completedEvaluations = projectEvaluations.filter(e => e.is_complete);
      const uniqueProjectJudges = new Set(projectEvaluations.map(e => e.judge_id));

      // Calculate weighted average score
      let totalWeightedScore = 0;
      let totalWeight = 0;

      criteriaData?.forEach(criterion => {
        const criterionScores = completedEvaluations.flatMap(eval_ => {
          return scoresData?.filter(s => 
            s.evaluation_id === eval_.id && s.criterion_id === criterion.id
          ) || [];
        });

        if (criterionScores.length > 0) {
          const avgScore = criterionScores.reduce((sum, s) => sum + s.score, 0) / criterionScores.length;
          const normalizedScore = (avgScore / criterion.max_score) * 100;
          totalWeightedScore += normalizedScore * criterion.weight;
          totalWeight += criterion.weight;
        }
      });

      const departments = project.departments as { name_he: string; name_en: string } | null;

      projectScoresMap.set(project.id, {
        id: project.id,
        title_he: project.title_he,
        title_en: project.title_en,
        room: project.room,
        team_members: project.team_members,
        department_name_he: departments?.name_he,
        department_name_en: departments?.name_en,
        evaluations_count: projectEvaluations.length,
        completed_count: completedEvaluations.length,
        judges_count: uniqueProjectJudges.size,
        average_score: totalWeight > 0 ? totalWeightedScore / totalWeight : null,
      });
    });

    const sortedProjects = Array.from(projectScoresMap.values())
      .sort((a, b) => (b.average_score || 0) - (a.average_score || 0));

    setProjectScores(sortedProjects);
    setLoading(false);
  };

  // Stats calculations
  const stats = {
    totalProjects: projectScores.length,
    completedEvaluations: projectScores.reduce((sum, p) => sum + p.completed_count, 0),
    totalJudges: totalJudges,
    pendingEvaluations: projectScores.reduce((sum, p) => sum + (p.evaluations_count - p.completed_count), 0),
  };

  const exportToCSV = () => {
    const headers = language === 'he' 
      ? ['דירוג', 'מצגת', 'מגיש', 'תחום', 'שופטים', 'הערכות', 'ציון ממוצע']
      : ['Rank', 'Presentation', 'Presenter', 'Field', 'Judges', 'Evaluations', 'Average Score'];
    
    const rows = projectScores.map((project, index) => [
      index + 1,
      language === 'he' ? project.title_he : project.title_en,
      project.team_members?.join(', ') || '-',
      language === 'he' ? project.department_name_he : project.department_name_en || '-',
      project.judges_count,
      `${project.completed_count}/${project.evaluations_count}`,
      project.average_score !== null ? project.average_score.toFixed(1) : '-',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reports_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    window.print();
  };

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">
            {language === 'he' ? 'אין לך הרשאה לצפות בדוחות' : 'You do not have permission to view reports'}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              {language === 'he' ? 'תוצאות ודוחות' : 'Results & Reports'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'he' ? 'צפה וייצא תוצאות הערכה' : 'View and export evaluation results'}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={exportToCSV} className="gap-2">
              <Download className="h-4 w-4" />
              {language === 'he' ? 'ייצוא CSV' : 'Export CSV'}
            </Button>
            <Button variant="outline" onClick={exportToPDF} className="gap-2">
              <FileText className="h-4 w-4" />
              {language === 'he' ? 'ייצוא PDF' : 'Export PDF'}
            </Button>
          </div>
        </div>

        {/* Conference Selection */}
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

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            {language === 'he' ? 'טוען...' : 'Loading...'}
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              <Card className="border-t-4 border-t-blue-500">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground mb-1">
                    {language === 'he' ? 'ממתינות להערכה' : 'Pending Evaluations'}
                  </p>
                  <p className="text-3xl font-bold">{stats.pendingEvaluations}</p>
                </CardContent>
              </Card>

              <Card className="border-t-4 border-t-green-500">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground mb-1">
                    {language === 'he' ? 'הערכות שהושלמו' : 'Completed Evaluations'}
                  </p>
                  <p className="text-3xl font-bold">{stats.completedEvaluations}</p>
                </CardContent>
              </Card>

              <Card className="border-t-4 border-t-purple-500">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground mb-1">
                    {language === 'he' ? 'סה״כ שופטים' : 'Total Judges'}
                  </p>
                  <p className="text-3xl font-bold">{stats.totalJudges}</p>
                </CardContent>
              </Card>

              <Card className="border-t-4 border-t-orange-500">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground mb-1">
                    {language === 'he' ? 'סה״כ מצגות' : 'Total Presentations'}
                  </p>
                  <p className="text-3xl font-bold">{stats.totalProjects}</p>
                </CardContent>
              </Card>
            </div>

            {/* Results Table */}
            <Card>
              <CardContent className="pt-6">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold">
                    {language === 'he' ? 'תוצאות מפורטות' : 'Detailed Results'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {language === 'he' ? 'מצגות מדורגות לפי ציון ממוצע' : 'Presentations ranked by average score'}
                  </p>
                </div>

                {projectScores.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16 text-center">
                            {language === 'he' ? 'דירוג' : 'Rank'}
                          </TableHead>
                          <TableHead>
                            {language === 'he' ? 'מצגת' : 'Presentation'}
                          </TableHead>
                          <TableHead>
                            {language === 'he' ? 'מגיש' : 'Presenter'}
                          </TableHead>
                          <TableHead>
                            {language === 'he' ? 'תחום' : 'Field'}
                          </TableHead>
                          <TableHead className="text-center">
                            {language === 'he' ? 'שופטים' : 'Judges'}
                          </TableHead>
                          <TableHead className="text-center">
                            {language === 'he' ? 'הערכות' : 'Evaluations'}
                          </TableHead>
                          <TableHead className="w-40">
                            {language === 'he' ? 'ציון ממוצע' : 'Average Score'}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {projectScores.map((project, index) => (
                          <TableRow key={project.id}>
                            <TableCell className="text-center">
                              <Badge 
                                variant={index === 0 ? "default" : index < 3 ? "secondary" : "outline"}
                                className={
                                  index === 0 
                                    ? "bg-green-500 hover:bg-green-600" 
                                    : index === 1 
                                      ? "bg-blue-500 hover:bg-blue-600 text-white" 
                                      : index === 2 
                                        ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                                        : ""
                                }
                              >
                                {index + 1}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              {language === 'he' ? project.title_he : project.title_en}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {project.team_members?.slice(0, 1).join(', ') || '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="bg-primary/10 text-primary">
                                {language === 'he' ? project.department_name_he : project.department_name_en || '-'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-muted-foreground">
                                {language === 'he' ? `שופטים ${project.judges_count}` : `${project.judges_count} Judges`}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge 
                                variant={project.completed_count === project.evaluations_count && project.evaluations_count > 0 
                                  ? "default" 
                                  : "outline"
                                }
                                className={
                                  project.completed_count === project.evaluations_count && project.evaluations_count > 0
                                    ? "bg-green-500 hover:bg-green-600"
                                    : project.completed_count > 0
                                      ? "bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500"
                                      : "text-red-500 border-red-500"
                                }
                              >
                                {project.completed_count} / {project.evaluations_count}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {project.average_score !== null ? (
                                <div className="flex items-center gap-3">
                                  <span className="font-bold text-lg min-w-[50px]">
                                    {project.average_score.toFixed(1)}
                                  </span>
                                  <Progress 
                                    value={project.average_score} 
                                    className="h-2 flex-1"
                                  />
                                </div>
                              ) : (
                                <span className="text-muted-foreground">
                                  {language === 'he' ? 'אין נתונים' : 'No data'}
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {language === 'he' ? 'אין פרויקטים בכנס זה' : 'No projects in this conference'}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Reports;
