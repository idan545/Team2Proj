import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Clock,
  Search,
  Mail,
  Phone,
  Loader2,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Key,
  GraduationCap,
} from 'lucide-react';
import { Label } from '@/components/ui/label';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  company: string | null;
  job_title: string | null;
  is_approved: boolean;
  created_at: string;
}

export default function Students() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const { language, dir } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [pendingStudents, setPendingStudents] = useState<Profile[]>([]);
  const [approvedStudents, setApprovedStudents] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Profile | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
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
      fetchStudents();
    }
  }, [user, isAdmin]);

  const fetchStudents = async () => {
    try {
      setIsLoading(true);

      // Get all user_ids that have the 'student' role
      const { data: studentRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'student');

      if (rolesError) throw rolesError;

      const studentUserIds = studentRoles?.map(r => r.user_id) || [];

      if (studentUserIds.length === 0) {
        setPendingStudents([]);
        setApprovedStudents([]);
        setIsLoading(false);
        return;
      }

      // Fetch profiles of students
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', studentUserIds)
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const pending = profiles?.filter(p => !p.is_approved) || [];
      const approved = profiles?.filter(p => p.is_approved) || [];

      setPendingStudents(pending);
      setApprovedStudents(approved);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast({
        variant: 'destructive',
        title: language === 'he' ? 'שגיאה' : 'Error',
        description: language === 'he' ? 'לא ניתן לטעון את רשימת הסטודנטים' : 'Failed to load students list',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (profile: Profile) => {
    setIsActionLoading(true);
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ is_approved: true })
        .eq('id', profile.id);

      if (profileError) throw profileError;

      toast({
        title: language === 'he' ? 'הסטודנט אושר' : 'Student Approved',
        description: language === 'he' 
          ? `${profile.full_name} אושר במערכת`
          : `${profile.full_name} has been approved`,
      });

      fetchStudents();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error approving student:', error);
      toast({
        variant: 'destructive',
        title: language === 'he' ? 'שגיאה' : 'Error',
        description: language === 'he' ? 'לא ניתן לאשר את הסטודנט' : 'Failed to approve student',
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReject = async (profile: Profile) => {
    setIsActionLoading(true);
    try {
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

      fetchStudents();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error rejecting student:', error);
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
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ is_approved: false })
        .eq('id', profile.id);

      if (profileError) throw profileError;

      toast({
        title: language === 'he' ? 'ההרשאות בוטלו' : 'Access Revoked',
        description: language === 'he'
          ? `ההרשאות של ${profile.full_name} בוטלו`
          : `${profile.full_name}'s access has been revoked`,
      });

      fetchStudents();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error revoking student:', error);
      toast({
        variant: 'destructive',
        title: language === 'he' ? 'שגיאה' : 'Error',
        description: language === 'he' ? 'לא ניתן לבטל את ההרשאות' : 'Failed to revoke access',
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const filterStudents = (students: Profile[]) => {
    if (!searchQuery) return students;
    const query = searchQuery.toLowerCase();
    return students.filter(
      (s) =>
        s.full_name.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query)
    );
  };

  const openStudentDetails = (student: Profile) => {
    setSelectedStudent(student);
    setIsDialogOpen(true);
  };

  const openPasswordDialog = (student: Profile) => {
    setSelectedStudent(student);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setIsPasswordDialogOpen(true);
  };

  const handleChangePassword = async () => {
    if (!selectedStudent) return;

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
      const response = await supabase.functions.invoke('admin-update-password', {
        body: {
          userId: selectedStudent.user_id,
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
          ? `הסיסמא של ${selectedStudent.full_name} עודכנה בהצלחה`
          : `${selectedStudent.full_name}'s password has been updated successfully`,
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

  const renderStudentRow = (student: Profile, showApproveReject: boolean) => (
    <TableRow key={student.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openStudentDetails(student)}>
      <TableCell className="font-medium">{student.full_name}</TableCell>
      <TableCell>{student.email}</TableCell>
      <TableCell>{student.phone || '-'}</TableCell>
      <TableCell>
        <Badge variant={student.is_approved ? 'default' : 'secondary'}>
          {student.is_approved
            ? (language === 'he' ? 'מאושר' : 'Approved')
            : (language === 'he' ? 'ממתין' : 'Pending')}
        </Badge>
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-2">
          {showApproveReject ? (
            <>
              <Button
                size="sm"
                variant="default"
                onClick={() => handleApprove(student)}
                disabled={isActionLoading}
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleReject(student)}
                disabled={isActionLoading}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openPasswordDialog(student)}
              >
                <Key className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleRevoke(student)}
                disabled={isActionLoading}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">
              {language === 'he' ? 'ניהול סטודנטים' : 'Manage Students'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {language === 'he'
                ? 'ניהול סטודנטים ואישור בקשות הצטרפות'
                : 'Manage students and approve join requests'}
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
              <div className="text-2xl font-bold text-warning">{pendingStudents.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'he' ? 'סטודנטים מאושרים' : 'Approved Students'}
              </CardTitle>
              <UserCheck className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{approvedStudents.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'he' ? 'סה"כ' : 'Total'}
              </CardTitle>
              <GraduationCap className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingStudents.length + approvedStudents.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground ${dir === 'rtl' ? 'right-3' : 'left-3'}`} />
          <Input
            placeholder={language === 'he' ? 'חיפוש סטודנט...' : 'Search student...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={dir === 'rtl' ? 'pr-10' : 'pl-10'}
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending" className="w-full">
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              {language === 'he' ? 'ממתינים' : 'Pending'}
              {pendingStudents.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {pendingStudents.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved" className="gap-2">
              <UserCheck className="h-4 w-4" />
              {language === 'he' ? 'מאושרים' : 'Approved'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            <Card>
              <CardContent className="p-0">
                {filterStudents(pendingStudents).length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{language === 'he' ? 'אין סטודנטים ממתינים לאישור' : 'No students pending approval'}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{language === 'he' ? 'שם' : 'Name'}</TableHead>
                        <TableHead>{language === 'he' ? 'אימייל' : 'Email'}</TableHead>
                        <TableHead>{language === 'he' ? 'טלפון' : 'Phone'}</TableHead>
                        <TableHead>{language === 'he' ? 'סטטוס' : 'Status'}</TableHead>
                        <TableHead>{language === 'he' ? 'פעולות' : 'Actions'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filterStudents(pendingStudents).map((student) => renderStudentRow(student, true))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="approved" className="mt-4">
            <Card>
              <CardContent className="p-0">
                {filterStudents(approvedStudents).length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{language === 'he' ? 'אין סטודנטים מאושרים' : 'No approved students'}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{language === 'he' ? 'שם' : 'Name'}</TableHead>
                        <TableHead>{language === 'he' ? 'אימייל' : 'Email'}</TableHead>
                        <TableHead>{language === 'he' ? 'טלפון' : 'Phone'}</TableHead>
                        <TableHead>{language === 'he' ? 'סטטוס' : 'Status'}</TableHead>
                        <TableHead>{language === 'he' ? 'פעולות' : 'Actions'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filterStudents(approvedStudents).map((student) => renderStudentRow(student, false))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Student Details Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{language === 'he' ? 'פרטי סטודנט' : 'Student Details'}</DialogTitle>
            </DialogHeader>
            {selectedStudent && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">{selectedStudent.full_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <span>{selectedStudent.email}</span>
                </div>
                {selectedStudent.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <span>{selectedStudent.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Badge variant={selectedStudent.is_approved ? 'default' : 'secondary'}>
                    {selectedStudent.is_approved
                      ? (language === 'he' ? 'מאושר' : 'Approved')
                      : (language === 'he' ? 'ממתין לאישור' : 'Pending Approval')}
                  </Badge>
                </div>
              </div>
            )}
            <DialogFooter className="gap-2">
              {selectedStudent && !selectedStudent.is_approved ? (
                <>
                  <Button
                    variant="default"
                    onClick={() => handleApprove(selectedStudent)}
                    disabled={isActionLoading}
                  >
                    {isActionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {language === 'he' ? 'אשר' : 'Approve'}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleReject(selectedStudent)}
                    disabled={isActionLoading}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    {language === 'he' ? 'דחה' : 'Reject'}
                  </Button>
                </>
              ) : selectedStudent ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      openPasswordDialog(selectedStudent);
                    }}
                  >
                    <Key className="h-4 w-4 mr-2" />
                    {language === 'he' ? 'שנה סיסמא' : 'Change Password'}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleRevoke(selectedStudent)}
                    disabled={isActionLoading}
                  >
                    {isActionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    <XCircle className="h-4 w-4 mr-2" />
                    {language === 'he' ? 'בטל הרשאות' : 'Revoke Access'}
                  </Button>
                </>
              ) : null}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Password Dialog */}
        <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{language === 'he' ? 'שינוי סיסמא' : 'Change Password'}</DialogTitle>
              <DialogDescription>
                {language === 'he'
                  ? `שינוי סיסמא עבור ${selectedStudent?.full_name}`
                  : `Change password for ${selectedStudent?.full_name}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{language === 'he' ? 'סיסמא חדשה' : 'New Password'}</Label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={language === 'he' ? 'הכנס סיסמא חדשה' : 'Enter new password'}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={`absolute top-1/2 -translate-y-1/2 h-8 w-8 p-0 ${dir === 'rtl' ? 'left-1' : 'right-1'}`}
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{language === 'he' ? 'אימות סיסמא' : 'Confirm Password'}</Label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={language === 'he' ? 'הכנס סיסמא שוב' : 'Enter password again'}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={`absolute top-1/2 -translate-y-1/2 h-8 w-8 p-0 ${dir === 'rtl' ? 'left-1' : 'right-1'}`}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              {passwordError && (
                <p className="text-sm text-destructive">{passwordError}</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
                {language === 'he' ? 'ביטול' : 'Cancel'}
              </Button>
              <Button onClick={handleChangePassword} disabled={isActionLoading}>
                {isActionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {language === 'he' ? 'שמור' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
