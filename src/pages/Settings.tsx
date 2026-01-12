import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  User,
  Key,
  Mail,
  Phone,
  Building,
  Briefcase,
  Tag,
  Loader2,
  Save,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

const EXPERTISE_OPTIONS = [
  { value: 'frontend', he: 'Frontend', en: 'Frontend' },
  { value: 'backend', he: 'Backend', en: 'Backend' },
  { value: 'fullstack', he: 'Full Stack', en: 'Full Stack' },
  { value: 'mobile', he: 'מובייל', en: 'Mobile' },
  { value: 'devops', he: 'DevOps', en: 'DevOps' },
  { value: 'security', he: 'אבטחה', en: 'Security' },
  { value: 'ai_ml', he: 'AI/ML', en: 'AI/ML' },
  { value: 'data', he: 'Data Science', en: 'Data Science' },
  { value: 'cloud', he: 'ענן', en: 'Cloud' },
  { value: 'ux_ui', he: 'UX/UI', en: 'UX/UI' },
  { value: 'database', he: 'בסיסי נתונים', en: 'Databases' },
  { value: 'testing', he: 'בדיקות', en: 'Testing' },
];

const ROLE_OPTIONS = [
  { value: 'student', he: 'סטודנט', en: 'Student' },
  { value: 'judge', he: 'שופט', en: 'Judge' },
  { value: 'department_manager', he: 'מנהל כנס', en: 'Conference Manager' },
];

export default function Settings() {
  const { user, profile, refreshProfile, isLoading: authLoading } = useAuth();
  const { language, dir } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Profile form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [expertiseAreas, setExpertiseAreas] = useState<string[]>([]);
  const [userRole, setUserRole] = useState<string>('');

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Loading states
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setCompany(profile.company || '');
      setJobTitle(profile.job_title || '');
      setExpertiseAreas(profile.expertise_areas || []);
    }
  }, [profile]);

  // Fetch user role
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user?.id) return;
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (!error && data) {
        setUserRole(data.role);
      }
    };
    
    fetchUserRole();
  }, [user?.id]);

  const getRoleLabel = (roleValue: string) => {
    const role = ROLE_OPTIONS.find(r => r.value === roleValue);
    if (!role) return roleValue;
    return language === 'he' ? role.he : role.en;
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProfileLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone || null,
          company: company || null,
          job_title: jobTitle || null,
          expertise_areas: expertiseAreas,
        })
        .eq('user_id', user?.id);

      if (error) throw error;

      await refreshProfile();

      toast({
        title: language === 'he' ? 'הפרופיל עודכן' : 'Profile Updated',
        description: language === 'he'
          ? 'הפרטים שלך עודכנו בהצלחה'
          : 'Your details have been updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        variant: 'destructive',
        title: language === 'he' ? 'שגיאה' : 'Error',
        description: language === 'he' ? 'לא ניתן לעדכן את הפרופיל' : 'Failed to update profile',
      });
    } finally {
      setIsProfileLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    // Validation
    if (newPassword.length < 6) {
      setPasswordError(language === 'he' ? 'הסיסמא חייבת להכיל לפחות 6 תווים' : 'Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(language === 'he' ? 'הסיסמאות לא תואמות' : 'Passwords do not match');
      return;
    }

    setIsPasswordLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: language === 'he' ? 'הסיסמא עודכנה' : 'Password Updated',
        description: language === 'he'
          ? 'הסיסמא שלך עודכנה בהצלחה'
          : 'Your password has been updated successfully',
      });

      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast({
        variant: 'destructive',
        title: language === 'he' ? 'שגיאה' : 'Error',
        description: error.message || (language === 'he' ? 'לא ניתן לעדכן את הסיסמא' : 'Failed to update password'),
      });
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const toggleExpertise = (value: string) => {
    setExpertiseAreas((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value]
    );
  };

  if (authLoading) {
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
      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">
            {language === 'he' ? 'הגדרות' : 'Settings'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {language === 'he'
              ? 'נהל את הפרופיל והחשבון שלך'
              : 'Manage your profile and account'}
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="profile" className="w-full" dir={dir}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              {language === 'he' ? 'פרופיל' : 'Profile'}
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Key className="h-4 w-4" />
              {language === 'he' ? 'אבטחה' : 'Security'}
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {language === 'he' ? 'פרטים אישיים' : 'Personal Details'}
                </CardTitle>
                <CardDescription>
                  {language === 'he'
                    ? 'עדכן את הפרטים האישיים שלך'
                    : 'Update your personal information'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  {/* Email (readonly) */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {language === 'he' ? 'דוא"ל' : 'Email'}
                    </Label>
                    <Input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      {language === 'he'
                        ? 'לא ניתן לשנות את כתובת הדוא"ל'
                        : 'Email address cannot be changed'}
                    </p>
                  </div>

                  {/* Full Name */}
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {language === 'he' ? 'שם מלא' : 'Full Name'} *
                    </Label>
                    <Input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>

                  {/* Role (readonly) */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      {language === 'he' ? 'תפקיד' : 'Role'}
                    </Label>
                    <Input
                      type="text"
                      value={userRole ? getRoleLabel(userRole) : (language === 'he' ? 'לא הוגדר' : 'Not set')}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      {language === 'he'
                        ? 'לשינוי תפקיד יש לפנות למנהל המערכת'
                        : 'Contact an administrator to change your role'}
                    </p>
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {language === 'he' ? 'טלפון' : 'Phone'}
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  {/* Company */}
                  <div className="space-y-2">
                    <Label htmlFor="company" className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      {language === 'he' ? 'חברה/ארגון' : 'Company/Organization'}
                    </Label>
                    <Input
                      id="company"
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                    />
                  </div>


                  {/* Expertise Areas */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      {language === 'he' ? 'תחומי התמחות' : 'Expertise Areas'}
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {EXPERTISE_OPTIONS.map((option) => (
                        <Badge
                          key={option.value}
                          variant={expertiseAreas.includes(option.value) ? 'default' : 'outline'}
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => toggleExpertise(option.value)}
                        >
                          {language === 'he' ? option.he : option.en}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isProfileLoading || !fullName}
                  >
                    {isProfileLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="h-4 w-4 me-2" />
                        {language === 'he' ? 'שמור שינויים' : 'Save Changes'}
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  {language === 'he' ? 'שינוי סיסמא' : 'Change Password'}
                </CardTitle>
                <CardDescription>
                  {language === 'he'
                    ? 'עדכן את הסיסמא שלך לאבטחה טובה יותר'
                    : 'Update your password for better security'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  {/* New Password */}
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">
                      {language === 'he' ? 'סיסמא חדשה' : 'New Password'}
                    </Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
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

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">
                      {language === 'he' ? 'אימות סיסמא' : 'Confirm Password'}
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
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

                  {/* Error Message */}
                  {passwordError && (
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      {passwordError}
                    </div>
                  )}

                  {/* Password Requirements */}
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p className="font-medium">
                      {language === 'he' ? 'דרישות סיסמא:' : 'Password requirements:'}
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                      <li className={newPassword.length >= 6 ? 'text-success' : ''}>
                        {language === 'he' ? 'לפחות 6 תווים' : 'At least 6 characters'}
                      </li>
                    </ul>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isPasswordLoading || !newPassword || !confirmPassword}
                  >
                    {isPasswordLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Key className="h-4 w-4 me-2" />
                        {language === 'he' ? 'עדכן סיסמא' : 'Update Password'}
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
