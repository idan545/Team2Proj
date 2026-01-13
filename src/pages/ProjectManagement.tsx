import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  Search,
  Loader2,
  Edit,
  Trash2,
  UserPlus,
  Users,
  FolderKanban,
  X,
  CheckCircle,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

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
  conference_id: string;
  department_id: string | null;
}

interface Conference {
  id: string;
  name_he: string;
  name_en: string;
  is_active: boolean;
}

interface Judge {
  user_id: string;
  full_name: string;
  email: string;
  expertise_areas: string[];
}

interface Student {
  user_id: string;
  full_name: string;
  email: string;
}

interface Assignment {
  judge_id: string;
  project_id: string;
}

export default function ProjectManagement() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [projects, setProjects] = useState<Project[]>([]);
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [judges, setJudges] = useState<Judge[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConference, setSelectedConference] = useState<string>('all');

  // Dialog states
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedJudges, setSelectedJudges] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title_he: '',
    title_en: '',
    description_he: '',
    description_en: '',
    room: '',
    presentation_time: '',
    expertise_tags: '',
    conference_id: '',
  });
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (!authLoading && !isAdmin) {
      navigate('/dashboard');
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      fetchData();
    }
  }, [user, isAdmin]);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Fetch all data including students (users with 'student' role) and judge/department_manager roles
      const [projectsRes, conferencesRes, assignmentsRes, studentRolesRes, judgeRolesRes] = await Promise.all([
        supabase.from('projects').select('*').order('created_at', { ascending: false }),
        supabase.from('conferences').select('*').order('event_date', { ascending: false }),
        supabase.from('judge_assignments').select('judge_id, project_id'),
        supabase.from('user_roles').select('user_id').eq('role', 'student'),
        supabase.from('user_roles').select('user_id, role').in('role', ['judge', 'department_manager']),
      ]);

      if (projectsRes.error) throw projectsRes.error;
      if (conferencesRes.error) throw conferencesRes.error;
      if (assignmentsRes.error) throw assignmentsRes.error;
      if (studentRolesRes.error) throw studentRolesRes.error;
      if (judgeRolesRes.error) throw judgeRolesRes.error;

      // Fetch student profiles
      const studentUserIds = studentRolesRes.data.map(r => r.user_id);
      let studentsData: Student[] = [];
      if (studentUserIds.length > 0) {
        const { data: studentProfiles, error: studentProfilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', studentUserIds)
          .eq('is_approved', true);
        
        if (studentProfilesError) throw studentProfilesError;
        studentsData = studentProfiles as Student[];
      }

      // Fetch judge and department_manager profiles
      const judgeUserIds = judgeRolesRes.data.map(r => r.user_id);
      let judgesData: Judge[] = [];
      if (judgeUserIds.length > 0) {
        const { data: judgeProfiles, error: judgeProfilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name, email, expertise_areas')
          .in('user_id', judgeUserIds)
          .eq('is_approved', true);
        
        if (judgeProfilesError) throw judgeProfilesError;
        judgesData = judgeProfiles as Judge[];
      }

      setProjects(projectsRes.data as Project[]);
      setConferences(conferencesRes.data as Conference[]);
      setJudges(judgesData);
      setStudents(studentsData);
      setAssignments(assignmentsRes.data as Assignment[]);
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

  const handleCreateProject = () => {
    setSelectedProject(null);
    setFormData({
      title_he: '',
      title_en: '',
      description_he: '',
      description_en: '',
      room: '',
      presentation_time: '',
      expertise_tags: '',
      conference_id: selectedConference !== 'all' ? selectedConference : '',
    });
    setSelectedTeamMembers([]);
    setIsProjectDialogOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setFormData({
      title_he: project.title_he,
      title_en: project.title_en,
      description_he: project.description_he || '',
      description_en: project.description_en || '',
      room: project.room || '',
      presentation_time: project.presentation_time || '',
      expertise_tags: project.expertise_tags?.join(', ') || '',
      conference_id: project.conference_id,
    });
    // Match team members by name to student user_ids
    const teamMemberIds = (project.team_members || [])
      .map(name => students.find(s => s.full_name === name)?.user_id)
      .filter(Boolean) as string[];
    setSelectedTeamMembers(teamMemberIds);
    setIsProjectDialogOpen(true);
  };

  const handleSaveProject = async () => {
    if (!formData.title_he || !formData.title_en || !formData.conference_id) {
      toast({
        variant: 'destructive',
        title: language === 'he' ? 'שגיאה' : 'Error',
        description: language === 'he' ? 'יש למלא את כל השדות הנדרשים' : 'Please fill all required fields',
      });
      return;
    }

    setIsSaving(true);
    try {
      // Convert selected student user_ids to names for storage
      const teamMemberNames = selectedTeamMembers
        .map(id => students.find(s => s.user_id === id)?.full_name)
        .filter(Boolean) as string[];

      const projectData = {
        title_he: formData.title_he,
        title_en: formData.title_en,
        description_he: formData.description_he || null,
        description_en: formData.description_en || null,
        room: formData.room || null,
        presentation_time: formData.presentation_time || null,
        team_members: teamMemberNames,
        expertise_tags: formData.expertise_tags.split(',').map(t => t.trim()).filter(Boolean),
        conference_id: formData.conference_id,
      };

      if (selectedProject) {
        const { error } = await supabase
          .from('projects')
          .update(projectData)
          .eq('id', selectedProject.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('projects').insert(projectData);
        if (error) throw error;
      }

      toast({
        title: language === 'he' ? 'נשמר בהצלחה' : 'Saved Successfully',
      });

      setIsProjectDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving project:', error);
      toast({
        variant: 'destructive',
        title: language === 'he' ? 'שגיאה' : 'Error',
        description: language === 'he' ? 'לא ניתן לשמור את הפרויקט' : 'Failed to save project',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;

    setIsSaving(true);
    try {
      const { error } = await supabase.from('projects').delete().eq('id', selectedProject.id);
      if (error) throw error;

      toast({
        title: language === 'he' ? 'הפרויקט נמחק' : 'Project Deleted',
      });

      setIsDeleteDialogOpen(false);
      setSelectedProject(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        variant: 'destructive',
        title: language === 'he' ? 'שגיאה' : 'Error',
        description: language === 'he' ? 'לא ניתן למחוק את הפרויקט' : 'Failed to delete project',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenAssignDialog = (project: Project) => {
    setSelectedProject(project);
    const projectAssignments = assignments.filter(a => a.project_id === project.id);
    setSelectedJudges(projectAssignments.map(a => a.judge_id));
    setIsAssignDialogOpen(true);
  };

  const handleSaveAssignments = async () => {
    if (!selectedProject) return;

    setIsSaving(true);
    try {
      // Delete existing assignments for this project
      await supabase
        .from('judge_assignments')
        .delete()
        .eq('project_id', selectedProject.id);

      // Insert new assignments
      if (selectedJudges.length > 0) {
        const newAssignments = selectedJudges.map(judgeId => ({
          project_id: selectedProject.id,
          judge_id: judgeId,
          assigned_by: user!.id,
        }));

        const { error } = await supabase.from('judge_assignments').insert(newAssignments);
        if (error) throw error;
      }

      toast({
        title: language === 'he' ? 'השיוך נשמר' : 'Assignments Saved',
      });

      setIsAssignDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving assignments:', error);
      toast({
        variant: 'destructive',
        title: language === 'he' ? 'שגיאה' : 'Error',
        description: language === 'he' ? 'לא ניתן לשמור את השיוכים' : 'Failed to save assignments',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleJudgeSelection = (judgeId: string) => {
    setSelectedJudges(prev =>
      prev.includes(judgeId)
        ? prev.filter(id => id !== judgeId)
        : [...prev, judgeId]
    );
  };

  const getConferenceName = (conferenceId: string) => {
    const conf = conferences.find(c => c.id === conferenceId);
    if (!conf) return '';
    return language === 'he' ? conf.name_he : conf.name_en;
  };

  const getProjectAssignedJudgesCount = (projectId: string) => {
    return assignments.filter(a => a.project_id === projectId).length;
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch =
      !searchQuery ||
      project.title_he.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.title_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.team_members?.some(m => m.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesConference =
      selectedConference === 'all' || project.conference_id === selectedConference;

    return matchesSearch && matchesConference;
  });

  if (authLoading || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">
              {language === 'he' ? 'ניהול פרויקטים' : 'Project Management'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {language === 'he'
                ? 'הוספה, עריכה והקצאת פרויקטים לשופטים'
                : 'Add, edit and assign projects to judges'}
            </p>
          </div>
          <Button onClick={handleCreateProject} className="gap-2">
            <Plus className="h-4 w-4" />
            {language === 'he' ? 'פרויקט חדש' : 'New Project'}
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={language === 'he' ? 'חיפוש פרויקטים...' : 'Search projects...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-10"
            />
          </div>
          <Select value={selectedConference} onValueChange={setSelectedConference}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder={language === 'he' ? 'בחר כנס' : 'Select conference'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === 'he' ? 'כל הכנסים' : 'All Conferences'}</SelectItem>
              {conferences.map((conf) => (
                <SelectItem key={conf.id} value={conf.id}>
                  {language === 'he' ? conf.name_he : conf.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
              <div className="text-2xl font-bold">{filteredProjects.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'he' ? 'שופטים זמינים' : 'Available Judges'}
              </CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{judges.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'he' ? 'סה"כ שיוכים' : 'Total Assignments'}
              </CardTitle>
              <UserPlus className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assignments.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Projects Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === 'he' ? 'פרויקט' : 'Project'}</TableHead>
                  <TableHead>{language === 'he' ? 'כנס' : 'Conference'}</TableHead>
                  <TableHead>{language === 'he' ? 'חדר' : 'Room'}</TableHead>
                  <TableHead>{language === 'he' ? 'שופטים' : 'Judges'}</TableHead>
                  <TableHead className="text-end">{language === 'he' ? 'פעולות' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <FolderKanban className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        {language === 'he' ? 'לא נמצאו פרויקטים' : 'No projects found'}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProjects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {language === 'he' ? project.title_he : project.title_en}
                          </p>
                          {project.team_members && project.team_members.length > 0 && (
                            <p className="text-sm text-muted-foreground">
                              {project.team_members.slice(0, 2).join(', ')}
                              {project.team_members.length > 2 && ` +${project.team_members.length - 2}`}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getConferenceName(project.conference_id)}</Badge>
                      </TableCell>
                      <TableCell>{project.room || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={getProjectAssignedJudgesCount(project.id) > 0 ? 'default' : 'secondary'}>
                          {getProjectAssignedJudgesCount(project.id)} {language === 'he' ? 'שופטים' : 'judges'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenAssignDialog(project)}
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditProject(project)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedProject(project);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Project Dialog */}
      <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedProject
                ? language === 'he' ? 'עריכת פרויקט' : 'Edit Project'
                : language === 'he' ? 'פרויקט חדש' : 'New Project'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'he' ? 'כותרת (עברית) *' : 'Title (Hebrew) *'}</Label>
                <Input
                  value={formData.title_he}
                  onChange={(e) => setFormData({ ...formData, title_he: e.target.value })}
                  dir="rtl"
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'he' ? 'כותרת (אנגלית) *' : 'Title (English) *'}</Label>
                <Input
                  value={formData.title_en}
                  onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                  dir="ltr"
                />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'he' ? 'תיאור (עברית)' : 'Description (Hebrew)'}</Label>
                <Textarea
                  value={formData.description_he}
                  onChange={(e) => setFormData({ ...formData, description_he: e.target.value })}
                  dir="rtl"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'he' ? 'תיאור (אנגלית)' : 'Description (English)'}</Label>
                <Textarea
                  value={formData.description_en}
                  onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                  dir="ltr"
                  rows={3}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{language === 'he' ? 'כנס *' : 'Conference *'}</Label>
              <Select
                value={formData.conference_id}
                onValueChange={(value) => setFormData({ ...formData, conference_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={language === 'he' ? 'בחר כנס' : 'Select conference'} />
                </SelectTrigger>
                <SelectContent>
                  {conferences.map((conf) => (
                    <SelectItem key={conf.id} value={conf.id}>
                      {language === 'he' ? conf.name_he : conf.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'he' ? 'חדר' : 'Room'}</Label>
                <Input
                  value={formData.room}
                  onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'he' ? 'שעת הצגה' : 'Presentation Time'}</Label>
                <Input
                  type="time"
                  value={formData.presentation_time}
                  onChange={(e) => setFormData({ ...formData, presentation_time: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{language === 'he' ? 'חברי צוות (סטודנטים)' : 'Team Members (Students)'}</Label>
              {students.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {language === 'he' ? 'אין סטודנטים מאושרים במערכת' : 'No approved students in the system'}
                </p>
              ) : (
                <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                  {students.map((student) => (
                    <div key={student.user_id} className="flex items-center gap-2">
                      <Checkbox
                        id={`student-${student.user_id}`}
                        checked={selectedTeamMembers.includes(student.user_id)}
                        onCheckedChange={(checked) => {
                          setSelectedTeamMembers(prev =>
                            checked
                              ? [...prev, student.user_id]
                              : prev.filter(id => id !== student.user_id)
                          );
                        }}
                      />
                      <label
                        htmlFor={`student-${student.user_id}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {student.full_name}
                        <span className="text-muted-foreground ms-2">({student.email})</span>
                      </label>
                    </div>
                  ))}
                </div>
              )}
              {selectedTeamMembers.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {language === 'he' ? `נבחרו ${selectedTeamMembers.length} סטודנטים` : `${selectedTeamMembers.length} students selected`}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{language === 'he' ? 'תגיות מומחיות (מופרדות בפסיק)' : 'Expertise Tags (comma separated)'}</Label>
              <Input
                value={formData.expertise_tags}
                onChange={(e) => setFormData({ ...formData, expertise_tags: e.target.value })}
                placeholder={language === 'he' ? 'AI, Machine Learning' : 'AI, Machine Learning'}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProjectDialogOpen(false)}>
              {language === 'he' ? 'ביטול' : 'Cancel'}
            </Button>
            <Button onClick={handleSaveProject} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {language === 'he' ? 'שמור' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Judges Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {language === 'he' ? 'הקצאת שופטים' : 'Assign Judges'}
            </DialogTitle>
            <DialogDescription>
              {selectedProject && (language === 'he' ? selectedProject.title_he : selectedProject.title_en)}
            </DialogDescription>
          </DialogHeader>
          
          {/* Project expertise tags for reference */}
          {selectedProject?.expertise_tags && selectedProject.expertise_tags.length > 0 && (
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-sm font-medium mb-2">
                {language === 'he' ? 'תחומי הפרויקט:' : 'Project Fields:'}
              </p>
              <div className="flex flex-wrap gap-1">
                {selectedProject.expertise_tags.map((tag) => (
                  <Badge key={tag} variant="default" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2 py-2">
            <p className="text-sm text-muted-foreground mb-2">
              {language === 'he' ? 'בחר שופטים לפי תחום התמחות:' : 'Select judges by expertise:'}
            </p>
            {judges.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {language === 'he' ? 'אין שופטים מאושרים' : 'No approved judges'}
              </p>
            ) : (
              judges.map((judge) => {
                // Check if judge expertise matches project tags
                const hasMatchingExpertise = selectedProject?.expertise_tags?.some(tag =>
                  judge.expertise_areas?.some(area => 
                    area.toLowerCase().includes(tag.toLowerCase()) || 
                    tag.toLowerCase().includes(area.toLowerCase())
                  )
                );
                
                return (
                  <div
                    key={judge.user_id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors ${
                      hasMatchingExpertise ? 'border-primary/50 bg-primary/5' : ''
                    }`}
                    onClick={() => toggleJudgeSelection(judge.user_id)}
                  >
                    <Checkbox
                      checked={selectedJudges.includes(judge.user_id)}
                      onCheckedChange={() => toggleJudgeSelection(judge.user_id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{judge.full_name}</p>
                        {hasMatchingExpertise && (
                          <Badge variant="outline" className="text-xs border-primary text-primary">
                            {language === 'he' ? 'מתאים' : 'Match'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{judge.email}</p>
                      {judge.expertise_areas && judge.expertise_areas.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {judge.expertise_areas.map((area) => (
                            <Badge 
                              key={area} 
                              variant="secondary" 
                              className={`text-xs ${
                                selectedProject?.expertise_tags?.some(tag => 
                                  area.toLowerCase().includes(tag.toLowerCase()) || 
                                  tag.toLowerCase().includes(area.toLowerCase())
                                ) ? 'bg-primary/20 text-primary' : ''
                              }`}
                            >
                              {area}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1">
                          {language === 'he' ? 'אין תחומי התמחות' : 'No expertise areas'}
                        </p>
                      )}
                    </div>
                    {selectedJudges.includes(judge.user_id) && (
                      <CheckCircle className="h-5 w-5 text-success shrink-0" />
                    )}
                  </div>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              {language === 'he' ? 'ביטול' : 'Cancel'}
            </Button>
            <Button onClick={handleSaveAssignments} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {language === 'he' ? `שמור (${selectedJudges.length} שופטים)` : `Save (${selectedJudges.length} judges)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{language === 'he' ? 'מחיקת פרויקט' : 'Delete Project'}</DialogTitle>
            <DialogDescription>
              {language === 'he'
                ? 'האם אתה בטוח שברצונך למחוק את הפרויקט הזה? פעולה זו לא ניתנת לביטול.'
                : 'Are you sure you want to delete this project? This action cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              {language === 'he' ? 'ביטול' : 'Cancel'}
            </Button>
            <Button variant="destructive" onClick={handleDeleteProject} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {language === 'he' ? 'מחק' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
