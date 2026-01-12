import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Award, Loader2, Mail, Lock, User, Building, Briefcase, Phone, Tag, ArrowLeft, ArrowRight, X, Ticket, CheckCircle, Clock } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

const loginSchema = z.object({
  email: z.string().trim().email({ message: 'כתובת דוא"ל לא תקינה / Invalid email address' }).max(255),
  password: z.string().min(6, { message: 'הסיסמה חייבת להכיל לפחות 6 תווים / Password must be at least 6 characters' }),
});

const signupSchema = z.object({
  email: z.string().trim().email({ message: 'כתובת דוא"ל לא תקינה / Invalid email address' }).max(255),
  password: z.string().min(6, { message: 'הסיסמה חייבת להכיל לפחות 6 תווים / Password must be at least 6 characters' }),
  confirmPassword: z.string(),
  fullName: z.string().trim().min(2, { message: 'השם חייב להכיל לפחות 2 תווים / Name must be at least 2 characters' }).max(100),
  phone: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  expertiseAreas: z.array(z.string()).min(1, { message: 'יש לבחור לפחות תחום התמחות אחד / Select at least one expertise area' }),
  invitationCode: z.string().optional(),
  selectedRole: z.string().min(1, { message: 'יש לבחור תפקיד / Please select a role' }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'הסיסמאות אינן תואמות / Passwords do not match',
  path: ['confirmPassword'],
});

const EXPERTISE_OPTIONS = [
  { value: 'frontend', labelHe: 'פיתוח Frontend', labelEn: 'Frontend Development' },
  { value: 'backend', labelHe: 'פיתוח Backend', labelEn: 'Backend Development' },
  { value: 'fullstack', labelHe: 'פיתוח Full Stack', labelEn: 'Full Stack Development' },
  { value: 'mobile', labelHe: 'פיתוח מובייל', labelEn: 'Mobile Development' },
  { value: 'devops', labelHe: 'DevOps', labelEn: 'DevOps' },
  { value: 'security', labelHe: 'אבטחת מידע', labelEn: 'Cybersecurity' },
  { value: 'ai_ml', labelHe: 'בינה מלאכותית / למידת מכונה', labelEn: 'AI / Machine Learning' },
  { value: 'data', labelHe: 'מדעי הנתונים', labelEn: 'Data Science' },
  { value: 'cloud', labelHe: 'תשתיות ענן', labelEn: 'Cloud Infrastructure' },
  { value: 'ux_ui', labelHe: 'עיצוב UX/UI', labelEn: 'UX/UI Design' },
  { value: 'database', labelHe: 'בסיסי נתונים', labelEn: 'Databases' },
  { value: 'testing', labelHe: 'בדיקות תוכנה', labelEn: 'Software Testing' },
];

const ROLE_OPTIONS = [
  { value: 'student', labelHe: 'סטודנט', labelEn: 'Student' },
  { value: 'judge', labelHe: 'שופט', labelEn: 'Judge' },
  { value: 'department_manager', labelHe: 'מנהל כנס', labelEn: 'Conference Manager' },
];

export default function Auth() {
  const { user, signIn, signUp, isLoading, profile, isApproved } = useAuth();
  const { t, dir, language } = useLanguage();
  const navigate = useNavigate();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  
  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Signup form
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [expertiseAreas, setExpertiseAreas] = useState<string[]>([]);
  const [invitationCode, setInvitationCode] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  const ArrowIcon = dir === 'rtl' ? ArrowLeft : ArrowRight;

  useEffect(() => {
    if (user && !isLoading) {
      navigate('/dashboard');
    }
  }, [user, isLoading, navigate]);

  const toggleExpertise = (value: string) => {
    setExpertiseAreas(prev => 
      prev.includes(value) 
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const validation = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }
    
    setIsSubmitting(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsSubmitting(false);
    
    if (!error) {
      navigate('/dashboard');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    if (!forgotPasswordEmail || !z.string().email().safeParse(forgotPasswordEmail).success) {
      setErrors({ forgotEmail: language === 'he' ? 'כתובת דוא"ל לא תקינה' : 'Invalid email address' });
      return;
    }
    
    setIsSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsSubmitting(false);
    
    if (error) {
      setErrors({ forgotEmail: error.message });
    } else {
      setForgotPasswordSuccess(true);
    }
  };

  const validateInvitationCode = async (code: string): Promise<boolean> => {
    if (!code) return true; // Optional field
    
    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', code)
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    
    if (error || !data) {
      return false;
    }
    
    return true;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const validation = signupSchema.safeParse({
      email: signupEmail,
      password: signupPassword,
      confirmPassword,
      fullName,
      phone,
      company,
      jobTitle,
      expertiseAreas,
      invitationCode,
      selectedRole,
    });
    
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    // Validate invitation code if provided
    if (invitationCode) {
      const isValidCode = await validateInvitationCode(invitationCode);
      if (!isValidCode) {
        setErrors({ invitationCode: language === 'he' ? 'קוד הזמנה לא תקין או פג תוקף' : 'Invalid or expired invitation code' });
        return;
      }
    }
    
    setIsSubmitting(true);
    const { data: authData, error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: fullName,
          phone,
          company,
          job_title: jobTitle,
          expertise_areas: expertiseAreas,
          preferred_language: language,
        },
      },
    });

    if (error) {
      setIsSubmitting(false);
      setErrors({ email: error.message });
      return;
    }

    // If signup successful, add the user role
    if (authData.user) {
      // Check if invitation code was provided and valid for conference manager role
      let shouldAutoApprove = false;
      if (invitationCode && selectedRole === 'department_manager') {
        const { data: invitationData } = await supabase
          .from('invitations')
          .select('*')
          .eq('token', invitationCode)
          .eq('is_used', false)
          .eq('role', 'department_manager')
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();
        
        if (invitationData) {
          shouldAutoApprove = true;
          // Mark invitation as used
          await supabase
            .from('invitations')
            .update({ is_used: true })
            .eq('token', invitationCode);
        }
      }

      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: selectedRole as 'student' | 'judge' | 'department_manager',
        });

      if (roleError) {
        console.error('Error assigning role:', roleError);
      }

      // Auto-approve conference manager if valid invitation code
      if (shouldAutoApprove) {
        await supabase
          .from('profiles')
          .update({ is_approved: true })
          .eq('user_id', authData.user.id);
      }
    }

    // If invitation code provided for other roles, mark it as used
    if (!error && invitationCode && selectedRole !== 'department_manager') {
      await supabase
        .from('invitations')
        .update({ is_used: true })
        .eq('token', invitationCode);
    }

    setIsSubmitting(false);
    
    if (!error) {
      setSignupSuccess(true);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show pending approval state after signup
  if (signupSuccess) {
    return (
      <div dir={dir} className="min-h-screen hero-gradient flex flex-col">
        <header className="p-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3">
            <div className="p-2 bg-secondary rounded-lg">
              <Award className="h-6 w-6 text-secondary-foreground" />
            </div>
            <span className="text-xl font-bold text-primary-foreground">{t('app.title')}</span>
          </Link>
          <LanguageToggle />
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md glass-card text-center">
            <CardHeader className="space-y-4">
              <div className="mx-auto p-4 bg-success/10 rounded-full w-fit">
                <CheckCircle className="h-12 w-12 text-success" />
              </div>
              <CardTitle className="text-2xl">
                {language === 'he' ? 'ההרשמה הושלמה בהצלחה!' : 'Registration Successful!'}
              </CardTitle>
              <CardDescription className="text-base">
                {language === 'he' 
                  ? 'בקשתך נשלחה לאישור. תקבל הודעה כאשר חשבונך יאושר.'
                  : 'Your request has been submitted for approval. You will be notified when your account is approved.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center gap-2 p-4 bg-muted rounded-lg">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {language === 'he' ? 'ממתין לאישור מנהל' : 'Pending Admin Approval'}
                </span>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Link to="/" className="w-full">
                <Button variant="outline" className="w-full gap-2">
                  {dir === 'rtl' ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
                  {language === 'he' ? 'חזרה לדף הבית' : 'Back to Home'}
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div dir={dir} className="min-h-screen hero-gradient flex flex-col">
      {/* Header */}
      <header className="p-4 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="p-2 bg-secondary rounded-lg">
            <Award className="h-6 w-6 text-secondary-foreground" />
          </div>
          <span className="text-xl font-bold text-primary-foreground">{t('app.title')}</span>
        </Link>
        <LanguageToggle />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg glass-card animate-fade-in">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto p-3 bg-primary/10 rounded-full w-fit">
              <Award className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">{t('app.title')}</CardTitle>
            <CardDescription>{t('app.subtitle')}</CardDescription>
          </CardHeader>
          
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mx-4" style={{ width: 'calc(100% - 2rem)' }}>
              <TabsTrigger value="login">{t('auth.login')}</TabsTrigger>
              <TabsTrigger value="signup">{t('auth.signup')}</TabsTrigger>
            </TabsList>
            
            {/* Login Tab */}
            <TabsContent value="login">
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {t('auth.email')}
                    </Label>
                    <Input
                      id="login-email"
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="email@example.com"
                      className={errors.email ? 'border-destructive' : ''}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      {t('auth.password')}
                    </Label>
                    <Input
                      id="login-password"
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className={errors.password ? 'border-destructive' : ''}
                    />
                    {errors.password && (
                      <p className="text-sm text-destructive">{errors.password}</p>
                    )}
                  </div>
                </CardContent>
                
                <CardFooter className="flex flex-col gap-4">
                  <Button 
                    type="submit" 
                    className="w-full gap-2"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        {t('auth.login')}
                        <ArrowIcon className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="link" 
                    className="text-sm"
                    onClick={() => setShowForgotPassword(true)}
                  >
                    {language === 'he' ? 'שכחתי סיסמה' : 'Forgot Password'}
                  </Button>
                </CardFooter>
              </form>

              {/* Forgot Password Dialog */}
              {showForgotPassword && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <Card className="w-full max-w-md">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        {language === 'he' ? 'איפוס סיסמה' : 'Reset Password'}
                        <Button variant="ghost" size="icon" onClick={() => {
                          setShowForgotPassword(false);
                          setForgotPasswordSuccess(false);
                          setForgotPasswordEmail('');
                          setErrors({});
                        }}>
                          <X className="h-4 w-4" />
                        </Button>
                      </CardTitle>
                      <CardDescription>
                        {language === 'he' 
                          ? 'הזן את כתובת הדוא"ל שלך ונשלח לך קישור לאיפוס הסיסמה'
                          : 'Enter your email address and we will send you a password reset link'}
                      </CardDescription>
                    </CardHeader>
                    {forgotPasswordSuccess ? (
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-center gap-2 p-4 bg-green-100 dark:bg-green-900/20 rounded-lg">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="text-green-700 dark:text-green-400">
                            {language === 'he' 
                              ? 'קישור לאיפוס סיסמה נשלח לכתובת הדוא"ל שלך'
                              : 'Password reset link has been sent to your email'}
                          </span>
                        </div>
                        <Button 
                          className="w-full" 
                          onClick={() => {
                            setShowForgotPassword(false);
                            setForgotPasswordSuccess(false);
                            setForgotPasswordEmail('');
                          }}
                        >
                          {language === 'he' ? 'סגור' : 'Close'}
                        </Button>
                      </CardContent>
                    ) : (
                      <form onSubmit={handleForgotPassword}>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="forgot-email" className="flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              {t('auth.email')}
                            </Label>
                            <Input
                              id="forgot-email"
                              type="email"
                              value={forgotPasswordEmail}
                              onChange={(e) => setForgotPasswordEmail(e.target.value)}
                              placeholder="email@example.com"
                              className={errors.forgotEmail ? 'border-destructive' : ''}
                            />
                            {errors.forgotEmail && (
                              <p className="text-sm text-destructive">{errors.forgotEmail}</p>
                            )}
                          </div>
                        </CardContent>
                        <CardFooter>
                          <Button 
                            type="submit" 
                            className="w-full gap-2"
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              language === 'he' ? 'שלח קישור לאיפוס' : 'Send Reset Link'
                            )}
                          </Button>
                        </CardFooter>
                      </form>
                    )}
                  </Card>
                </div>
              )}
            </TabsContent>
            
            {/* Signup Tab */}
            <TabsContent value="signup">
              <form onSubmit={handleSignup}>
                <CardContent className="space-y-4 max-h-[60vh] overflow-y-auto">
                  {/* Basic Info */}
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {t('auth.fullName')} *
                    </Label>
                    <Input
                      id="signup-name"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={errors.fullName ? 'border-destructive' : ''}
                    />
                    {errors.fullName && (
                      <p className="text-sm text-destructive">{errors.fullName}</p>
                    )}
                  </div>

                  {/* Role Selection */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      {language === 'he' ? 'תפקיד' : 'Role'} *
                    </Label>
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger className={errors.selectedRole ? 'border-destructive' : ''}>
                        <SelectValue placeholder={language === 'he' ? 'בחר תפקיד' : 'Select role'} />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {language === 'he' ? option.labelHe : option.labelEn}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.selectedRole && (
                      <p className="text-sm text-destructive">{errors.selectedRole}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {t('auth.email')} *
                    </Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="email@example.com"
                      className={errors.email ? 'border-destructive' : ''}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email}</p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        {t('auth.password')} *
                      </Label>
                      <Input
                        id="signup-password"
                        type="password"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        placeholder="••••••••"
                        className={errors.password ? 'border-destructive' : ''}
                      />
                      {errors.password && (
                        <p className="text-sm text-destructive">{errors.password}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password" className="flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        {t('auth.confirmPassword')} *
                      </Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className={errors.confirmPassword ? 'border-destructive' : ''}
                      />
                      {errors.confirmPassword && (
                        <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-phone" className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {t('auth.phone')}
                      </Label>
                      <Input
                        id="signup-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-company" className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        {t('auth.company')}
                      </Label>
                      <Input
                        id="signup-company"
                        type="text"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Expertise Areas */}
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      {t('auth.expertiseAreas')} *
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {EXPERTISE_OPTIONS.map((option) => (
                        <Badge
                          key={option.value}
                          variant={expertiseAreas.includes(option.value) ? 'default' : 'outline'}
                          className={`cursor-pointer transition-all ${
                            expertiseAreas.includes(option.value) 
                              ? 'bg-primary hover:bg-primary/90' 
                              : 'hover:bg-primary/10'
                          }`}
                          onClick={() => toggleExpertise(option.value)}
                        >
                          {language === 'he' ? option.labelHe : option.labelEn}
                          {expertiseAreas.includes(option.value) && (
                            <X className="h-3 w-3 ms-1" />
                          )}
                        </Badge>
                      ))}
                    </div>
                    {errors.expertiseAreas && (
                      <p className="text-sm text-destructive">{errors.expertiseAreas}</p>
                    )}
                  </div>

                  {/* Invitation Code */}
                  <div className="space-y-2">
                    <Label htmlFor="invitation-code" className="flex items-center gap-2">
                      <Ticket className="h-4 w-4" />
                      {t('auth.invitationCode')}
                    </Label>
                    <Input
                      id="invitation-code"
                      type="text"
                      value={invitationCode}
                      onChange={(e) => setInvitationCode(e.target.value)}
                      placeholder={language === 'he' ? 'הזן קוד הזמנה אם יש לך' : 'Enter invitation code if you have one'}
                      className={errors.invitationCode ? 'border-destructive' : ''}
                    />
                    {errors.invitationCode && (
                      <p className="text-sm text-destructive">{errors.invitationCode}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {language === 'he' 
                        ? 'קוד הזמנה יזרז את תהליך האישור שלך'
                        : 'An invitation code will expedite your approval process'}
                    </p>
                  </div>
                </CardContent>
                
                <CardFooter className="flex flex-col gap-4">
                  <Button 
                    type="submit" 
                    className="w-full gap-2"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        {language === 'he' ? 'הרשמה' : 'Register'}
                        <ArrowIcon className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                  <p className="text-sm text-muted-foreground text-center">
                    {language === 'he'
                      ? 'לאחר ההרשמה, בקשתך תועבר לאישור מנהל המחלקה'
                      : 'After registration, your request will be sent to the department manager for approval'}
                  </p>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </main>
    </div>
  );
}
