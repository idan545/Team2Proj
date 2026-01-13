import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Search,
  Mail,
  Phone,
  Building,
  Briefcase,
  Tag,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Key,
  UserCog,
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  company: string | null;
  job_title: string | null;
  expertise_areas: string[];
  is_approved: boolean;
  created_at: string;
}

const EXPERTISE_LABELS: Record<string, { he: string; en: string }> = {
  frontend: { he: 'Frontend', en: 'Frontend' },
  backend: { he: 'Backend', en: 'Backend' },
  fullstack: { he: 'Full Stack', en: 'Full Stack' },
  mobile: { he: 'מובייל', en: 'Mobile' },
  devops: { he: 'DevOps', en: 'DevOps' },
  security: { he: 'אבטחה', en: 'Security' },
  ai_ml: { he: 'AI/ML', en: 'AI/ML' },
  data: { he: 'Data Science', en: 'Data Science' },
  cloud: { he: 'ענן', en: 'Cloud' },
  ux_ui: { he: 'UX/UI', en: 'UX/UI' },
  database: { he: 'בסיסי נתונים', en: 'Databases' },
  testing: { he: 'בדיקות', en: 'Testing' },
};

const ROLE_OPTIONS = [
  { value: 'student', he: 'סטודנט', en: 'Student' },
  { value: 'judge', he: 'שופט', en: 'Judge' },
  { value: 'department_manager', he: 'מנהל כנס', en: 'Conference Manager' },
];

export default function Judges() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const { t, language, dir } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [pendingJudges, setPendingJudges] = useState<Profile[]>([]);
  const [approvedJudges, setApprovedJudges] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJudge, setSelectedJudge] = useState<Profile | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [userRoles, setUserRoles] = useState<Record<string, string>>({});
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (!authLoading && !isAdmin) {
      navigate('/dashboard');
    }
  }, [user, authLoading, isAdmin, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      fetchJudges();
      fetchUserRoles();
    }
  }, [user, isAdmin]);

  const fetchJudges = async () => {
    try {
      setIsLoading(true);

      // Fetch pending judges (not approved)
      const { data: pending, error: pendingError } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_approved', false)
        .order('created_at', { ascending: false });

      if (pendingError) throw pendingError;

      // Fetch approved judges
      const { data: approved, error: approvedError } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      if (approvedError) throw approvedError;

      setPendingJudges(pending || []);
      setApprovedJudges(approved || []);
    } catch (error) {
      console.error('Error fetching judges:', error);
      toast({
        variant: 'destructive',
        title: language === 'he' ? 'שגיאה' : 'Error',
        description: language === 'he' ? 'לא ניתן לטעון את רשימת השופטים' : 'Failed to load judges list',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (error) throw error;
      
      const rolesMap: Record<string, string> = {};
      data?.forEach((r) => {
        rolesMap[r.user_id] = r.role;
      });
      setUserRoles(rolesMap);
    } catch (error) {
      console.error('Error fetching user roles:', error);
    }
  };

  const getRoleLabel = (roleValue: string) => {
    const role = ROLE_OPTIONS.find(r => r.value === roleValue);
    if (!role) return roleValue;
    return language === 'he' ? role.he : role.en;
  };

  const openRoleDialog = (judge: Profile) => {
    setSelectedJudge(judge);
    setSelectedRole(userRoles[judge.user_id] || '');
    setIsRoleDialogOpen(true);
  };

  const handleChangeRole = async () => {
    if (!selectedJudge || !selectedRole) return;

    setIsActionLoading(true);

    try {
      // First, delete existing role
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', selectedJudge.user_id);

      // Then insert new role
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: selectedJudge.user_id, role: selectedRole as any });

      if (error) throw error;

      toast({
        title: language === 'he' ? 'התפקיד עודכן' : 'Role Updated',
        description: language === 'he'
          ? `התפקיד של ${selectedJudge.full_name} עודכן ל${getRoleLabel(selectedRole)}`
          : `${selectedJudge.full_name}'s role has been updated to ${getRoleLabel(selectedRole)}`,
      });

      // Refresh data
      await fetchUserRoles();
      setIsRoleDialogOpen(false);
    } catch (error: any) {
      console.error('Error changing role:', error);
      toast({
        variant: 'destructive',
        title: language === 'he' ? 'שגיאה' : 'Error',
        description: error.message || (language === 'he' ? 'לא ניתן לעדכן את התפקיד' : 'Failed to update role'),
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleApprove = async (profile: Profile) => {
    setIsActionLoading(true);
    try {
      // Update profile to approved
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ is_approved: true })
        .eq('id', profile.id);

      if (profileError) throw profileError;

      // Add judge role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: profile.user_id, role: 'judge' });

      if (roleError && !roleError.message.includes('duplicate')) throw roleError;

      toast({
        title: language === 'he' ? 'השופט אושר' : 'Judge Approved',
        description: language === 'he' 
          ? `${profile.full_name} אושר כשופט במערכת`
          : `${profile.full_name} has been approved as a judge`,
      });

      // Refresh data
      fetchJudges();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error approving judge:', error);
      toast({
        variant: 'destructive',
        title: language === 'he' ? 'שגיאה' : 'Error',
        description: language === 'he' ? 'לא ניתן לאשר את השופט' : 'Failed to approve judge',
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReject = async (profile: Profile) => {
    setIsActionLoading(true);
    try {
      // Delete the profile (user will need to re-register)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', profile.id);

      if (error) throw error;

      toast({
        title: language === 'he' ? 'הבקשה נדחתה' : 'Request Rejected',
        description: language === 'he'
          ? `הבקשה של ${profile.full_name} נדחתה`
          : `${profile.full_name}'s request has been rejected`,
      });

      fetchJudges();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error rejecting judge:', error);
      toast({
        variant: 'destructive',
        title: language === 'he' ? 'שגיאה' : 'Error',
        description: language === 'he' ? 'לא ניתן לדחות את הבקשה' : 'Failed to reject request',
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRevoke = async (profile: Profile) => {
    setIsActionLoading(true);
    try {
      // Update profile to not approved
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ is_approved: false })
        .eq('id', profile.id);

      if (profileError) throw profileError;

      // Remove judge role
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', profile.user_id)
        .eq('role', 'judge');

      if (roleError) throw roleError;

      toast({
        title: language === 'he' ? 'ההרשאות בוטלו' : 'Access Revoked',
        description: language === 'he'
          ? `ההרשאות של ${profile.full_name} בוטלו`
          : `${profile.full_name}'s access has been revoked`,
      });

      fetchJudges();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error revoking judge:', error);
      toast({
        variant: 'destructive',
        title: language === 'he' ? 'שגיאה' : 'Error',
        description: language === 'he' ? 'לא ניתן לבטל את ההרשאות' : 'Failed to revoke access',
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const getExpertiseLabel = (key: string) => {
    return EXPERTISE_LABELS[key]?.[language === 'he' ? 'he' : 'en'] || key;
  };

  const filterJudges = (judges: Profile[]) => {
    if (!searchQuery) return judges;
    const query = searchQuery.toLowerCase();
    return judges.filter(
      (j) =>
        j.full_name.toLowerCase().includes(query) ||
        j.email.toLowerCase().includes(query) ||
        j.company?.toLowerCase().includes(query) ||
        j.expertise_areas?.some((e) => e.toLowerCase().includes(query))
    );
  };

  const openJudgeDetails = (judge: Profile) => {
    setSelectedJudge(judge);
    setIsDialogOpen(true);
  };

  const openPasswordDialog = (judge: Profile) => {
    setSelectedJudge(judge);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setIsPasswordDialogOpen(true);
  };

  const handleChangePassword = async () => {
    if (!selectedJudge) return;

    // Validation
    if (newPassword.length < 6) {
      setPasswordError(language === 'he' ? 'הסיסמא חייבת להכיל לפחות 6 תווים' : 'Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(language === 'he' ? 'הסיסמאות לא תואמות' : 'Passwords do not match');
      return;
    }

    setIsActionLoading(true);
    setPasswordError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('admin-update-password', {
        body: {
          userId: selectedJudge.user_id,
          newPassword: newPassword,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast({
        title: language === 'he' ? 'הסיסמא עודכנה' : 'Password Updated',
        description: language === 'he'
          ? `הסיסמא של ${selectedJudge.full_name} עודכנה בהצלחה`
          : `${selectedJudge.full_name}'s password has been updated successfully`,
      });

      setIsPasswordDialogOpen(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast({
        variant: 'destructive',
        title: language === 'he' ? 'שגיאה' : 'Error',
        description: error.message || (language === 'he' ? 'לא ניתן לעדכן את הסיסמא' : 'Failed to update password'),
      });
    } finally {
      setIsActionLoading(false);
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{t('admin.manageJudges')}</h1>
            <p className="text-muted-foreground mt-1">
              {language === 'he'
                ? 'ניהול שופטים ואישור בקשות הצטרפות'
                : 'Manage judges and approve join requests'}
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'he' ? 'ממתינים לאישור' : 'Pending Approval'}
              </CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{pendingJudges.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'he' ? 'שופטים פעילים' : 'Active Judges'}
              </CardTitle>
              <UserCheck className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{approvedJudges.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'he' ? 'סה"כ' : 'Total'}
              </CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingJudges.length + approvedJudges.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={language === 'he' ? 'חיפוש שופטים...' : 'Search judges...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-10"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending" className="w-full">
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              {language === 'he' ? 'ממתינים' : 'Pending'}
              {pendingJudges.length > 0 && (
                <Badge variant="destructive" className="ms-1">
                  {pendingJudges.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved" className="gap-2">
              <UserCheck className="h-4 w-4" />
              {language === 'he' ? 'מאושרים' : 'Approved'}
            </TabsTrigger>
          </TabsList>

          {/* Pending Tab */}
          <TabsContent value="pending">
            <Card>
              <CardContent className="p-0">
                {filterJudges(pendingJudges).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CheckCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">
                      {language === 'he' ? 'אין בקשות ממתינות' : 'No pending requests'}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{language === 'he' ? 'שם' : 'Name'}</TableHead>
                        <TableHead>{language === 'he' ? 'דוא"ל' : 'Email'}</TableHead>
                        <TableHead className="hidden md:table-cell">
                          {language === 'he' ? 'חברה' : 'Company'}
                        </TableHead>
                        <TableHead className="hidden lg:table-cell">
                          {language === 'he' ? 'התמחויות' : 'Expertise'}
                        </TableHead>
                        <TableHead className="hidden sm:table-cell">
                          {language === 'he' ? 'תאריך' : 'Date'}
                        </TableHead>
                        <TableHead>{language === 'he' ? 'פעולות' : 'Actions'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filterJudges(pendingJudges).map((judge) => (
                        <TableRow key={judge.id}>
                          <TableCell className="font-medium">{judge.full_name}</TableCell>
                          <TableCell>{judge.email}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            {judge.company || '-'}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="flex flex-wrap gap-1">
                              {judge.expertise_areas?.slice(0, 2).map((exp) => (
                                <Badge key={exp} variant="secondary" className="text-xs">
                                  {getExpertiseLabel(exp)}
                                </Badge>
                              ))}
                              {(judge.expertise_areas?.length || 0) > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{judge.expertise_areas!.length - 2}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {new Date(judge.created_at).toLocaleDateString(
                              language === 'he' ? 'he-IL' : 'en-US'
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openJudgeDetails(judge)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleApprove(judge)}
                                disabled={isActionLoading}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleReject(judge)}
                                disabled={isActionLoading}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Approved Tab */}
          <TabsContent value="approved">
            <Card>
              <CardContent className="p-0">
                {filterJudges(approvedJudges).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">
                      {language === 'he' ? 'אין שופטים מאושרים' : 'No approved judges'}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{language === 'he' ? 'שם' : 'Name'}</TableHead>
                        <TableHead>{language === 'he' ? 'דוא"ל' : 'Email'}</TableHead>
                        <TableHead className="hidden md:table-cell">
                          {language === 'he' ? 'חברה' : 'Company'}
                        </TableHead>
                        <TableHead className="hidden lg:table-cell">
                          {language === 'he' ? 'התמחויות' : 'Expertise'}
                        </TableHead>
                        <TableHead>{language === 'he' ? 'פעולות' : 'Actions'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filterJudges(approvedJudges).map((judge) => (
                        <TableRow key={judge.id}>
                          <TableCell className="font-medium">{judge.full_name}</TableCell>
                          <TableCell>{judge.email}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            {judge.company || '-'}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="flex flex-wrap gap-1">
                              {judge.expertise_areas?.slice(0, 2).map((exp) => (
                                <Badge key={exp} variant="secondary" className="text-xs">
                                  {getExpertiseLabel(exp)}
                                </Badge>
                              ))}
                              {(judge.expertise_areas?.length || 0) > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{judge.expertise_areas!.length - 2}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openJudgeDetails(judge)}
                                title={language === 'he' ? 'צפה בפרטים' : 'View details'}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openPasswordDialog(judge)}
                                title={language === 'he' ? 'שנה סיסמא' : 'Change password'}
                              >
                                <Key className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openRoleDialog(judge)}
                                title={language === 'he' ? 'שנה תפקיד' : 'Change role'}
                              >
                                <UserCog className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRevoke(judge)}
                                disabled={isActionLoading}
                              >
                                <UserX className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Judge Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md" dir={dir}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {language === 'he' ? 'פרטי שופט' : 'Judge Details'}
            </DialogTitle>
          </DialogHeader>

          {selectedJudge && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xl font-bold text-primary">
                    {selectedJudge.full_name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold">{selectedJudge.full_name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedJudge.job_title || '-'}</p>
                </div>
                <Badge
                  variant={selectedJudge.is_approved ? 'default' : 'secondary'}
                  className="ms-auto"
                >
                  {selectedJudge.is_approved
                    ? language === 'he' ? 'מאושר' : 'Approved'
                    : language === 'he' ? 'ממתין' : 'Pending'}
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedJudge.email}</span>
                </div>

                {selectedJudge.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedJudge.phone}</span>
                  </div>
                )}

                {selectedJudge.company && (
                  <div className="flex items-center gap-3">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedJudge.company}</span>
                  </div>
                )}

                {selectedJudge.job_title && (
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedJudge.job_title}</span>
                  </div>
                )}
              </div>

              {selectedJudge.expertise_areas && selectedJudge.expertise_areas.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Tag className="h-4 w-4" />
                    {language === 'he' ? 'תחומי התמחות' : 'Expertise Areas'}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedJudge.expertise_areas.map((exp) => (
                      <Badge key={exp} variant="secondary">
                        {getExpertiseLabel(exp)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-sm text-muted-foreground">
                {language === 'he' ? 'נרשם בתאריך: ' : 'Registered: '}
                {new Date(selectedJudge.created_at).toLocaleDateString(
                  language === 'he' ? 'he-IL' : 'en-US',
                  { year: 'numeric', month: 'long', day: 'numeric' }
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {selectedJudge && !selectedJudge.is_approved ? (
              <>
                <Button
                  variant="destructive"
                  onClick={() => handleReject(selectedJudge)}
                  disabled={isActionLoading}
                >
                  {isActionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 me-2" />
                      {language === 'he' ? 'דחה' : 'Reject'}
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => handleApprove(selectedJudge)}
                  disabled={isActionLoading}
                >
                  {isActionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 me-2" />
                      {language === 'he' ? 'אשר' : 'Approve'}
                    </>
                  )}
                </Button>
              </>
            ) : selectedJudge ? (
              <Button
                variant="outline"
                onClick={() => handleRevoke(selectedJudge)}
                disabled={isActionLoading}
              >
                {isActionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <UserX className="h-4 w-4 me-2" />
                    {language === 'he' ? 'בטל הרשאות' : 'Revoke Access'}
                  </>
                )}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Change Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="max-w-md" dir={dir}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              {language === 'he' ? 'שינוי סיסמא' : 'Change Password'}
            </DialogTitle>
            <DialogDescription>
              {selectedJudge && (
                language === 'he'
                  ? `שינוי סיסמא עבור ${selectedJudge.full_name}`
                  : `Change password for ${selectedJudge.full_name}`
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">
                {language === 'he' ? 'סיסמא חדשה' : 'New Password'}
              </Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={language === 'he' ? 'הזן סיסמא חדשה' : 'Enter new password'}
                  className="pe-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">
                {language === 'he' ? 'אימות סיסמא' : 'Confirm Password'}
              </Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={language === 'he' ? 'הזן סיסמא שוב' : 'Enter password again'}
                  className="pe-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {passwordError && (
              <p className="text-sm text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {passwordError}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPasswordDialogOpen(false)}
              disabled={isActionLoading}
            >
              {language === 'he' ? 'ביטול' : 'Cancel'}
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={isActionLoading || !newPassword || !confirmPassword}
            >
              {isActionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Key className="h-4 w-4 me-2" />
                  {language === 'he' ? 'שנה סיסמא' : 'Change Password'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Change Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent className="max-w-md" dir={dir}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              {language === 'he' ? 'שינוי תפקיד' : 'Change Role'}
            </DialogTitle>
            <DialogDescription>
              {selectedJudge && (
                language === 'he'
                  ? `שינוי תפקיד עבור ${selectedJudge.full_name}`
                  : `Change role for ${selectedJudge.full_name}`
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>
                {language === 'he' ? 'תפקיד נוכחי' : 'Current Role'}
              </Label>
              <div className="p-3 bg-muted rounded-md">
                {selectedJudge && userRoles[selectedJudge.user_id] 
                  ? getRoleLabel(userRoles[selectedJudge.user_id])
                  : (language === 'he' ? 'לא הוגדר' : 'Not set')}
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                {language === 'he' ? 'תפקיד חדש' : 'New Role'}
              </Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder={language === 'he' ? 'בחר תפקיד' : 'Select role'} />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {language === 'he' ? role.he : role.en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRoleDialogOpen(false)}
              disabled={isActionLoading}
            >
              {language === 'he' ? 'ביטול' : 'Cancel'}
            </Button>
            <Button
              onClick={handleChangeRole}
              disabled={isActionLoading || !selectedRole}
            >
              {isActionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <UserCog className="h-4 w-4 me-2" />
                  {language === 'he' ? 'עדכן תפקיד' : 'Update Role'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
