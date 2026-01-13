import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  FolderKanban,
  Upload,
  Presentation,
  Loader2,
  AlertCircle,
  CheckCircle,
  Trash2,
  Download,
  Search,
  Lock,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Project {
  id: string;
  title_he: string;
  title_en: string;
  description_he: string | null;
  description_en: string | null;
  team_members: string[];
  presentation_url: string | null;
  conference_id: string;
}

interface Conference {
  id: string;
  name_he: string;
  name_en: string;
}

export default function StudentPresentations() {
  const { user, roles, isLoading: authLoading } = useAuth();
  const { language, dir } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [projects, setProjects] = useState<Project[]>([]);
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [evaluatedProjectIds, setEvaluatedProjectIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadingProjectId, setUploadingProjectId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

  const isStudent = roles.some((r) => r.role === "student");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Get student's profile to match by name
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user?.id)
        .single();

      const [projectsRes, conferencesRes] = await Promise.all([
        supabase.from("projects").select("*"),
        supabase.from("conferences").select("id, name_he, name_en"),
      ]);

      if (projectsRes.error) throw projectsRes.error;
      if (conferencesRes.error) throw conferencesRes.error;

      // Filter projects where student is a team member
      const studentName = profileData?.full_name?.toLowerCase() || "";
      const studentProjects = (projectsRes.data || []).filter((project) =>
        project.team_members?.some((member: string) => member.toLowerCase() === studentName),
      );

      // Check which projects have been evaluated
      const projectIds = studentProjects.map((p) => p.id);
      if (projectIds.length > 0) {
        const { data: evaluationsData } = await supabase
          .from("evaluations")
          .select("project_id")
          .in("project_id", projectIds)
          .eq("is_complete", true);

        const evaluatedIds = new Set((evaluationsData || []).map((e) => e.project_id));
        setEvaluatedProjectIds(evaluatedIds);
      }

      setProjects(studentProjects);
      setConferences(conferencesRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        variant: "destructive",
        title: language === "he" ? "שגיאה" : "Error",
        description: language === "he" ? "שגיאה בטעינת הנתונים" : "Error loading data",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadClick = (project: Project) => {
    setSelectedProject(project);
    setIsUploadDialogOpen(true);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedProject) return;

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast({
        variant: "destructive",
        title: language === "he" ? "סוג קובץ לא נתמך" : "Unsupported file type",
        description: language === "he" ? "נא להעלות קובץ PDF או PowerPoint" : "Please upload a PDF or PowerPoint file",
      });
      return;
    }

    // Validate file size (50MB max)
    if (file.size > 52428800) {
      toast({
        variant: "destructive",
        title: language === "he" ? "הקובץ גדול מדי" : "File too large",
        description: language === "he" ? "גודל הקובץ המקסימלי הוא 50MB" : "Maximum file size is 50MB",
      });
      return;
    }

    setUploadingProjectId(selectedProject.id);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${selectedProject.id}/${Date.now()}.${fileExt}`;

      // Delete old file if exists
      if (selectedProject.presentation_url) {
        const oldPath = selectedProject.presentation_url.split("/presentations/")[1];
        if (oldPath) {
          await supabase.storage.from("presentations").remove([oldPath]);
        }
      }

      // Upload new file
      const { error: uploadError } = await supabase.storage.from("presentations").upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("presentations").getPublicUrl(fileName);

      // Update project with presentation URL
      const { error: updateError } = await supabase
        .from("projects")
        .update({ presentation_url: publicUrl })
        .eq("id", selectedProject.id);

      if (updateError) throw updateError;

      toast({
        title: language === "he" ? "הועלה בהצלחה" : "Upload successful",
        description: language === "he" ? "המצגת הועלתה בהצלחה" : "Presentation uploaded successfully",
      });

      setIsUploadDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        variant: "destructive",
        title: language === "he" ? "שגיאה בהעלאה" : "Upload error",
        description: language === "he" ? "שגיאה בהעלאת הקובץ" : "Error uploading file",
      });
    } finally {
      setUploadingProjectId(null);
    }
  };

  const handleDeletePresentation = async (project: Project) => {
    if (!project.presentation_url) return;

    try {
      const filePath = project.presentation_url.split("/presentations/")[1];
      if (filePath) {
        await supabase.storage.from("presentations").remove([filePath]);
      }

      const { error } = await supabase.from("projects").update({ presentation_url: null }).eq("id", project.id);

      if (error) throw error;

      toast({
        title: language === "he" ? "נמחק בהצלחה" : "Deleted successfully",
        description: language === "he" ? "המצגת נמחקה" : "Presentation deleted",
      });

      fetchData();
    } catch (error) {
      console.error("Error deleting presentation:", error);
      toast({
        variant: "destructive",
        title: language === "he" ? "שגיאה במחיקה" : "Delete error",
        description: language === "he" ? "שגיאה במחיקת המצגת" : "Error deleting presentation",
      });
    }
  };

  const getProjectTitle = (project: Project) => (language === "he" ? project.title_he : project.title_en);

  const getProjectDescription = (project: Project) =>
    language === "he" ? project.description_he : project.description_en;

  const getConferenceName = (conferenceId: string) => {
    const conference = conferences.find((c) => c.id === conferenceId);
    if (!conference) return "";
    return language === "he" ? conference.name_he : conference.name_en;
  };

  const filteredProjects = projects.filter((p) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      p.title_he.toLowerCase().includes(query) ||
      p.title_en.toLowerCase().includes(query) ||
      p.team_members?.some((m) => m.toLowerCase().includes(query))
    );
  });

  const projectsWithPresentations = projects.filter((p) => p.presentation_url).length;

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
          <h2 className="text-2xl font-bold mb-2">{language === "he" ? "אין הרשאה" : "Access Denied"}</h2>
          <p className="text-muted-foreground">
            {language === "he" ? "עמוד זה מיועד לסטודנטים בלבד" : "This page is for students only"}
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
          <h1 className="text-3xl font-bold">{language === "he" ? "ניהול מצגות" : "Manage Presentations"}</h1>
          <p className="text-muted-foreground mt-1">
            {language === "he" ? "הוסף, ערוך ושייך מצגות לפרויקטים" : "Add, edit and assign presentations to projects"}
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === "he" ? 'סה"כ פרויקטים' : "Total Projects"}
              </CardTitle>
              <FolderKanban className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projects.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === "he" ? "מצגות הועלו" : "Presentations Uploaded"}
              </CardTitle>
              <Presentation className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{projectsWithPresentations}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={language === "he" ? "חיפוש פרויקטים..." : "Search projects..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-10"
          />
        </div>

        {/* Projects List */}
        <Card>
          <CardHeader>
            <CardTitle>{language === "he" ? "רשימת מצגות" : "Presentations List"}</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FolderKanban className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">{language === "he" ? "לא נמצאו פרויקטים" : "No projects found"}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredProjects.map((project) => {
                  const isEvaluated = evaluatedProjectIds.has(project.id);

                  return (
                    <div
                      key={project.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border bg-card"
                    >
                      <div className="space-y-1 flex-1">
                        <h3 className="font-semibold text-primary">{getProjectTitle(project)}</h3>
                        {project.team_members && project.team_members.length > 0 && (
                          <p className="text-sm text-muted-foreground">
                            {language === "he" ? "מגיש: " : "Presenter: "}
                            {project.team_members.join(", ")}
                          </p>
                        )}
                        {getProjectDescription(project) && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{getProjectDescription(project)}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {project.presentation_url && (
                            <Badge variant="outline" className="text-success border-success">
                              <CheckCircle className="h-3 w-3 me-1" />
                              {language === "he" ? "מצגת הועלתה" : "Presentation uploaded"}
                            </Badge>
                          )}
                          {isEvaluated && (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
                              <Lock className="h-3 w-3 me-1" />
                              {language === "he" ? "נבדק - לא ניתן לעריכה" : "Evaluated - Cannot edit"}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {project.presentation_url ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(project.presentation_url!, "_blank")}
                            >
                              <Download className="h-4 w-4 me-1" />
                              {language === "he" ? "צפייה" : "View"}
                            </Button>
                            {!isEvaluated && (
                              <>
                                <Button variant="outline" size="sm" onClick={() => handleUploadClick(project)}>
                                  <Upload className="h-4 w-4 me-1" />
                                  {language === "he" ? "החלף" : "Replace"}
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeletePresentation(project)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleUploadClick(project)}
                            disabled={uploadingProjectId === project.id || isEvaluated}
                          >
                            {uploadingProjectId === project.id ? (
                              <Loader2 className="h-4 w-4 animate-spin me-1" />
                            ) : (
                              <Upload className="h-4 w-4 me-1" />
                            )}
                            {language === "he" ? "העלה מצגת" : "Upload Presentation"}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upload Dialog */}
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{language === "he" ? "העלאת מצגת" : "Upload Presentation"}</DialogTitle>
              <DialogDescription>
                {language === "he"
                  ? "בחר קובץ PDF או PowerPoint להעלאה (עד 50MB)"
                  : "Select a PDF or PowerPoint file to upload (up to 50MB)"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedProject && (
                <div className="p-3 rounded-lg bg-muted">
                  <p className="font-medium">{getProjectTitle(selectedProject)}</p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="file">{language === "he" ? "בחר קובץ" : "Select file"}</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,.ppt,.pptx"
                  onChange={handleFileUpload}
                  disabled={uploadingProjectId !== null}
                />
              </div>
              {uploadingProjectId && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {language === "he" ? "מעלה..." : "Uploading..."}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
