import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import {
  FolderKanban,
  ClipboardCheck,
  Clock,
  Calendar,
  ChevronRight,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface DashboardStats {
  assignedProjects: number;
  completedEvaluations: number;
  pendingEvaluations: number;
}

interface Conference {
  id: string;
  name_he: string;
  name_en: string;
  event_date: string;
  location_he: string | null;
  location_en: string | null;
  expertise_areas: string[] | null;
}

export default function Dashboard() {
  const { user, profile, isApproved, isLoading: authLoading, refreshProfile } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState<DashboardStats>({
    assignedProjects: 0,
    completedEvaluations: 0,
    pendingEvaluations: 0,
  });
  const [matchingConferences, setMatchingConferences] = useState<Conference[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      fetchDashboardData();
    } else {
      setIsLoading(false);
    }
  }, [user, isApproved]);

  const fetchDashboardData = async () => {
    try {
      // Fetch assigned projects count
      const { count: assignedCount } = await supabase
        .from('judge_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('judge_id', user!.id);

      // Fetch completed evaluations count
      const { count: completedCount } = await supabase
        .from('evaluations')
        .select('*', { count: 'exact', head: true })
        .eq('judge_id', user!.id)
        .eq('is_complete', true);

      // Fetch pending evaluations count
      const { count: pendingCount } = await supabase
        .from('evaluations')
        .select('*', { count: 'exact', head: true })
        .eq('judge_id', user!.id)
        .eq('is_complete', false);

      setStats({
        assignedProjects: assignedCount || 0,
        completedEvaluations: completedCount || 0,
        pendingEvaluations: pendingCount || 0,
      });

      // Fetch upcoming conferences - filter by judge's expertise areas if available
      const { data: conferenceData } = await supabase
        .from('conferences')
        .select('*')
        .eq('is_active', true)
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: true });

      // Filter conferences that match judge's expertise areas
      let filteredConferences: Conference[] = [];
      if (conferenceData && conferenceData.length > 0) {
        const judgeExpertise = profile?.expertise_areas || [];
        
        if (judgeExpertise.length > 0) {
          // Find ALL conferences that have at least one overlapping expertise area
          filteredConferences = conferenceData.filter((conf: Conference) => {
            const confExpertise = conf.expertise_areas || [];
            // If conference has no expertise areas defined, show it to all
            if (confExpertise.length === 0) return true;
            // Otherwise, check for at least one matching area
            return confExpertise.some(area => judgeExpertise.includes(area));
          });
        } else {
          // If judge has no expertise, show all conferences
          filteredConferences = conferenceData;
        }
      }

      setMatchingConferences(filteredConferences);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
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
          <div className="p-4 bg-warning/10 rounded-full mb-4">
            <AlertCircle className="h-12 w-12 text-warning" />
          </div>
          <h2 className="text-2xl font-bold mb-2">{t('auth.pendingApproval')}</h2>
          <p className="text-muted-foreground max-w-md">
            {language === 'he' 
              ? 'הבקשה שלך להצטרף כשופט ממתינה לאישור מנהל המחלקה. נודיע לך כאשר הבקשה תאושר.'
              : 'Your request to join as a judge is pending approval from the department manager. We will notify you when approved.'}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const getConferenceName = (conf: Conference) => 
    language === 'he' ? conf.name_he : conf.name_en;
  
  const getConferenceLocation = (conf: Conference) => 
    language === 'he' ? conf.location_he : conf.location_en;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="animate-fade-in">
          <h1 className="text-3xl font-bold mb-2">
            {t('dashboard.welcome')}, {profile?.full_name}
          </h1>
          <p className="text-muted-foreground">
            {language === 'he' 
              ? 'הנה סקירה של הפעילות שלך במערכת'
              : "Here's an overview of your activity"}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="hover-lift animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('dashboard.assignedProjects')}
              </CardTitle>
              <div className="p-2 bg-primary/10 rounded-lg">
                <FolderKanban className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.assignedProjects}</div>
            </CardContent>
          </Card>

          <Card className="hover-lift animate-fade-in animation-delay-100">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('dashboard.completedEvaluations')}
              </CardTitle>
              <div className="p-2 bg-success/10 rounded-lg">
                <ClipboardCheck className="h-5 w-5 text-success" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">{stats.completedEvaluations}</div>
            </CardContent>
          </Card>

          <Card className="hover-lift animate-fade-in animation-delay-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('dashboard.pendingEvaluations')}
              </CardTitle>
              <div className="p-2 bg-warning/10 rounded-lg">
                <Clock className="h-5 w-5 text-warning" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-warning">{stats.pendingEvaluations}</div>
            </CardContent>
          </Card>
        </div>

        {/* Matching Conferences */}
        {matchingConferences.length > 0 && (
          <Card className="animate-fade-in animation-delay-300">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <CardTitle>
                  {language === 'he' ? 'כנסים מתאימים' : 'Matching Conferences'}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {matchingConferences.map((conference) => (
                <div 
                  key={conference.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border rounded-lg"
                >
                  <div>
                    <h3 className="text-lg font-semibold mb-1">
                      {getConferenceName(conference)}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-muted-foreground mb-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(conference.event_date).toLocaleDateString(
                          language === 'he' ? 'he-IL' : 'en-US',
                          { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
                        )}
                      </span>
                      {getConferenceLocation(conference) && (
                        <Badge variant="secondary">
                          {getConferenceLocation(conference)}
                        </Badge>
                      )}
                    </div>
                    {/* Display expertise areas */}
                    {conference.expertise_areas && conference.expertise_areas.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {conference.expertise_areas.map((area) => (
                          <Badge key={area} variant="outline" className="text-xs">
                            {area}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button onClick={() => navigate('/projects')} className="gap-2" size="sm">
                    {t('projects.viewDetails')}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card 
            className="cursor-pointer hover-lift animate-fade-in animation-delay-400"
            onClick={() => navigate('/projects')}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <FolderKanban className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{t('nav.projects')}</h3>
                  <CardDescription>
                    {language === 'he' 
                      ? 'צפה בפרויקטים שהוקצו לך'
                      : 'View your assigned projects'}
                  </CardDescription>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover-lift animate-fade-in animation-delay-400"
            onClick={() => navigate('/evaluations')}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-accent/10 rounded-lg">
                  <ClipboardCheck className="h-6 w-6 text-accent" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{t('nav.evaluations')}</h3>
                  <CardDescription>
                    {language === 'he' 
                      ? 'נהל את ההערכות שלך'
                      : 'Manage your evaluations'}
                  </CardDescription>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
