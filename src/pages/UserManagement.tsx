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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Gavel,
  Shield,
  UserCog,
} from 'lucide-react';
import { Label } from '@/components/ui/label';

interface UserWithRole {
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
  role: string | null;
}

const ROLE_OPTIONS = [
  { value: 'student', he: 'סטודנט', en: 'Student', icon: GraduationCap },
  { value: 'judge', he: 'שופט', en: 'Judge', icon: Gavel },
  { value: 'department_manager', he: 'מנהל כנס', en: 'Conference Manager', icon: UserCog },
];

export default function UserManagement() {
  const { user, isAdmin, roles, isLoading: authLoading } = useAuth();
  const { language, dir } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [pendingUsers, setPendingUsers] = useState<UserWithRole[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const isDepartmentManager = roles.some(r => r.role === 'department_manager');
  const canManageUsers = isDepartmentManager;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (!authLoading && !canManageUsers) {
      navigate('/dashboard');
    }
  }, [user, authLoading, canManageUsers, navigate]);

  useEffect(() => {
    if (user && canManageUsers) {
      fetchUsers();
    }
  }, [user, canManageUsers]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);

      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Create a map of user_id to role
      const rolesMap: Record<string, string> = {};
      userRoles?.forEach((r) => {
        rolesMap[r.user_id] = r.role;
      });

      // Combine profiles with roles
      const usersWithRoles: UserWithRole[] = (profiles || []).map(p => ({
        ...p,
        role: rolesMap[p.user_id] || null,
      }));

      // Filter based on current user's permissions
      // Department managers can see all users

      const pending = usersWithRoles.filter(u => !u.is_approved);
      const approved = usersWithRoles.filter(u => u.is_approved);

      setPendingUsers(pending);
      setApprovedUsers(approved);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        variant: 'destructive',
        title: language === 'he' ? 'שגיאה' : 'Error',
        description: language === 'he' ? 'לא ניתן לטעון את רשימת המשתמשים' : 'Failed to load users list',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleLabel = (role: string | null) => {
    if (!role) return language === 'he' ? 'ללא תפקיד' : 'No Role';
    const roleOption = ROLE_OPTIONS.find(r => r.value === role);
    return roleOption ? (language === 'he' ? roleOption.he : roleOption.en) : role;
  };

  const getRoleIcon = (role: string | null) => {
    if (!role) return Users;
    const roleOption = ROLE_OPTIONS.find(r => r.value === role);
    return roleOption?.icon || Users;
  };

  const getRoleBadgeVariant = (role: string | null): "default" | "secondary" | "destructive" | "outline" => {
    switch (role) {
      case 'department_manager': return 'destructive';
      case 'judge': return 'secondary';
      case 'student': return 'outline';
      default: return 'outline';
    }
  };

  const canApproveRole = (role: string | null): boolean => {
    // Department managers can approve everyone
    if (isDepartmentManager) return true;
    return false;
  };

  const handleApprove = async (profile: UserWithRole) => {
    if (!canApproveRole(profile.role)) {
      toast({
        variant: 'destructive',
        title: language === 'he' ? 'אין הרשאה' : 'No Permission',
        description: language === 'he' ? 'אין לך הרשאה לאשר משתמש זה' : 'You do not have permission to approve this user',
      });
      return;
    }

    setIsActionLoading(true);
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ is_approved: true })
        .eq('id', profile.id);

      if (profileError) throw profileError;

      toast({
        title: language === 'he' ? 'המשתמש אושר' : 'User Approved',
        description: language === 'he' 
          ? `${profile.full_name} אושר במערכת`
          : `${profile.full_name} has been approved`,
      });

      fetchUsers();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error approving user:', error);
      toast({
        variant: 'destructive',
        title: language === 'he' ? 'שגיאה' : 'Error',
        description: language === 'he' ? 'לא ניתן לאשר את המשתמש' : 'Failed to approve user',
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReject = async (profile: UserWithRole) => {
    if (!canApproveRole(profile.role)) {
      toast({
        variant: 'destructive',
        title: language === 'he' ? 'אין הרשאה' : 'No Permission',
        description: language === 'he' ? 'אין לך הרשאה לדחות משתמש זה' : 'You do not have permission to reject this user',
      });
      return;
    }

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

      fetchUsers();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error rejecting user:', error);
      toast({
        variant: 'destructive',
        title: language === 'he' ? 'שגיאה' : 'Error',
        description: language === 'he' ? 'לא ניתן לדחות את הבקשה' : 'Failed to reject request',
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRevoke = async (profile: UserWithRole) => {
    if (!canApproveRole(profile.role)) {
      toast({
        variant: 'destructive',
        title: language === 'he' ? 'אין הרשאה' : 'No Permission',
        description: language === 'he' ? 'אין לך הרשאה לבטל הרשאות משתמש זה' : 'You do not have permission to revoke this user',
      });
      return;
    }

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

      fetchUsers();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error revoking user:', error);
      toast({
        variant: 'destructive',
        title: language === 'he' ? 'שגיאה' : 'Error',
        description: language === 'he' ? 'לא ניתן לבטל את ההרשאות' : 'Failed to revoke access',
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const openRoleDialog = (userProfile: UserWithRole) => {
    setSelectedUser(userProfile);
    setSelectedRole(userProfile.role || '');
    setIsRoleDialogOpen(true);
  };

  const handleChangeRole = async () => {
    if (!selectedUser || !selectedRole) return;

    setIsActionLoading(true);

    try {
      // First, delete existing role
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', selectedUser.user_id);

      // Then insert new role
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: selectedUser.user_id, role: selectedRole as any });

      if (error) throw error;

      toast({
        title: language === 'he' ? 'התפקיד עודכן' : 'Role Updated',
        description: language === 'he'
          ? `התפקיד של ${selectedUser.full_name} עודכן ל${getRoleLabel(selectedRole)}`
          : `${selectedUser.full_name}'s role has been updated to ${getRoleLabel(selectedRole)}`,
      });

      await fetchUsers();
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

  const filterUsers = (users: UserWithRole[]) => {
    let filtered = users;
    
    if (roleFilter !== 'all') {
      filtered = filtered.filter(u => u.role === roleFilter || (!u.role && roleFilter === 'none'));
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.full_name.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query) ||
          u.company?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  };

  const openUserDetails = (userProfile: UserWithRole) => {
    setSelectedUser(userProfile);
    setIsDialogOpen(true);
  };

  const openPasswordDialog = (userProfile: UserWithRole) => {
    setSelectedUser(userProfile);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setIsPasswordDialogOpen(true);
  };

  const handleChangePassword = async () => {
    if (!selectedUser) return;

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
          userId: selectedUser.user_id,
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
          ? `הסיסמא של ${selectedUser.full_name} עודכנה בהצלחה`
          : `${selectedUser.full_name}'s password has been updated successfully`,
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

  // Get available roles for the filter
  const getAvailableRolesForFilter = () => {
    return ROLE_OPTIONS;
  };

  // Get available roles for assignment
  const getAvailableRolesForAssignment = () => {
    return ROLE_OPTIONS;
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

  const pendingByRole = {
    student: filterUsers(pendingUsers).filter(u => u.role === 'student').length,
    judge: filterUsers(pendingUsers).filter(u => u.role === 'judge').length,
    department_manager: filterUsers(pendingUsers).filter(u => u.role === 'department_manager').length,
    none: filterUsers(pendingUsers).filter(u => !u.role).length,
  };

  const renderUserRow = (userProfile: UserWithRole, showApproveReject: boolean) => {
    const RoleIcon = getRoleIcon(userProfile.role);
    const canModify = canApproveRole(userProfile.role);
    
    return (
      <TableRow key={userProfile.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openUserDetails(userProfile)}>
        <TableCell className="font-medium">{userProfile.full_name}</TableCell>
        <TableCell>{userProfile.email}</TableCell>
        <TableCell>
          <Badge variant={getRoleBadgeVariant(userProfile.role)} className="gap-1">
            <RoleIcon className="h-3 w-3" />
            {getRoleLabel(userProfile.role)}
          </Badge>
        </TableCell>
        <TableCell>
          <Badge variant={userProfile.is_approved ? 'default' : 'secondary'}>
            {userProfile.is_approved
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
                  onClick={() => handleApprove(userProfile)}
                  disabled={isActionLoading || !canModify}
                  title={!canModify ? (language === 'he' ? 'אין הרשאה' : 'No permission') : ''}
                >
                  <CheckCircle className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleReject(userProfile)}
                  disabled={isActionLoading || !canModify}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                {isDepartmentManager && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openRoleDialog(userProfile)}
                  >
                    <UserCog className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openPasswordDialog(userProfile)}
                  disabled={!canModify}
                >
                  <Key className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleRevoke(userProfile)}
                  disabled={isActionLoading || !canModify}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">
              {language === 'he' ? 'ניהול משתמשים' : 'User Management'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {language === 'he'
                ? 'ניהול משתמשים ואישור בקשות הצטרפות'
                : 'Manage users and approve join requests'}
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'he' ? 'ממתינים לאישור' : 'Pending Approval'}
              </CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{pendingUsers.length}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {pendingByRole.student > 0 && `${pendingByRole.student} ${language === 'he' ? 'סטודנטים' : 'students'}`}
                {pendingByRole.judge > 0 && ` | ${pendingByRole.judge} ${language === 'he' ? 'שופטים' : 'judges'}`}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'he' ? 'משתמשים מאושרים' : 'Approved Users'}
              </CardTitle>
              <UserCheck className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{approvedUsers.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'he' ? 'סטודנטים' : 'Students'}
              </CardTitle>
              <GraduationCap className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {approvedUsers.filter(u => u.role === 'student').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'he' ? 'שופטים' : 'Judges'}
              </CardTitle>
              <Gavel className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {approvedUsers.filter(u => u.role === 'judge').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground ${dir === 'rtl' ? 'right-3' : 'left-3'}`} />
            <Input
              placeholder={language === 'he' ? 'חיפוש משתמש...' : 'Search user...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={dir === 'rtl' ? 'pr-10' : 'pl-10'}
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={language === 'he' ? 'סנן לפי תפקיד' : 'Filter by role'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === 'he' ? 'כל התפקידים' : 'All Roles'}</SelectItem>
              {getAvailableRolesForFilter().map(role => (
                <SelectItem key={role.value} value={role.value}>
                  {language === 'he' ? role.he : role.en}
                </SelectItem>
              ))}
              <SelectItem value="none">{language === 'he' ? 'ללא תפקיד' : 'No Role'}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending" className="w-full">
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              {language === 'he' ? 'ממתינים' : 'Pending'}
              {pendingUsers.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {pendingUsers.length}
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
                {filterUsers(pendingUsers).length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{language === 'he' ? 'אין משתמשים ממתינים לאישור' : 'No users pending approval'}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{language === 'he' ? 'שם' : 'Name'}</TableHead>
                        <TableHead>{language === 'he' ? 'אימייל' : 'Email'}</TableHead>
                        <TableHead>{language === 'he' ? 'תפקיד' : 'Role'}</TableHead>
                        <TableHead>{language === 'he' ? 'סטטוס' : 'Status'}</TableHead>
                        <TableHead>{language === 'he' ? 'פעולות' : 'Actions'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filterUsers(pendingUsers).map((userProfile) => renderUserRow(userProfile, true))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="approved" className="mt-4">
            <Card>
              <CardContent className="p-0">
                {filterUsers(approvedUsers).length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{language === 'he' ? 'אין משתמשים מאושרים' : 'No approved users'}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{language === 'he' ? 'שם' : 'Name'}</TableHead>
                        <TableHead>{language === 'he' ? 'אימייל' : 'Email'}</TableHead>
                        <TableHead>{language === 'he' ? 'תפקיד' : 'Role'}</TableHead>
                        <TableHead>{language === 'he' ? 'סטטוס' : 'Status'}</TableHead>
                        <TableHead>{language === 'he' ? 'פעולות' : 'Actions'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filterUsers(approvedUsers).map((userProfile) => renderUserRow(userProfile, false))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* User Details Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{language === 'he' ? 'פרטי משתמש' : 'User Details'}</DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">{selectedUser.full_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <span>{selectedUser.email}</span>
                </div>
                {selectedUser.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <span>{selectedUser.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Badge variant={getRoleBadgeVariant(selectedUser.role)}>
                    {getRoleLabel(selectedUser.role)}
                  </Badge>
                  <Badge variant={selectedUser.is_approved ? 'default' : 'secondary'}>
                    {selectedUser.is_approved
                      ? (language === 'he' ? 'מאושר' : 'Approved')
                      : (language === 'he' ? 'ממתין לאישור' : 'Pending Approval')}
                  </Badge>
                </div>
              </div>
            )}
            <DialogFooter className="gap-2">
              {selectedUser && !selectedUser.is_approved ? (
                <>
                  <Button
                    variant="default"
                    onClick={() => handleApprove(selectedUser)}
                    disabled={isActionLoading || !canApproveRole(selectedUser.role)}
                  >
                    {isActionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {language === 'he' ? 'אשר' : 'Approve'}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleReject(selectedUser)}
                    disabled={isActionLoading || !canApproveRole(selectedUser.role)}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    {language === 'he' ? 'דחה' : 'Reject'}
                  </Button>
                </>
              ) : selectedUser ? (
                <>
                  {isDepartmentManager && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                        openRoleDialog(selectedUser);
                      }}
                    >
                      <UserCog className="h-4 w-4 mr-2" />
                      {language === 'he' ? 'שנה תפקיד' : 'Change Role'}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      openPasswordDialog(selectedUser);
                    }}
                    disabled={!canApproveRole(selectedUser.role)}
                  >
                    <Key className="h-4 w-4 mr-2" />
                    {language === 'he' ? 'שנה סיסמא' : 'Change Password'}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleRevoke(selectedUser)}
                    disabled={isActionLoading || !canApproveRole(selectedUser.role)}
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

        {/* Role Change Dialog */}
        <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{language === 'he' ? 'שינוי תפקיד' : 'Change Role'}</DialogTitle>
              <DialogDescription>
                {language === 'he'
                  ? `שינוי תפקיד עבור ${selectedUser?.full_name}`
                  : `Change role for ${selectedUser?.full_name}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{language === 'he' ? 'תפקיד חדש' : 'New Role'}</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'he' ? 'בחר תפקיד' : 'Select role'} />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableRolesForAssignment().map(role => (
                      <SelectItem key={role.value} value={role.value}>
                        {language === 'he' ? role.he : role.en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
                {language === 'he' ? 'ביטול' : 'Cancel'}
              </Button>
              <Button onClick={handleChangeRole} disabled={isActionLoading || !selectedRole}>
                {isActionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {language === 'he' ? 'שמור' : 'Save'}
              </Button>
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
                  ? `שינוי סיסמא עבור ${selectedUser?.full_name}`
                  : `Change password for ${selectedUser?.full_name}`}
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
