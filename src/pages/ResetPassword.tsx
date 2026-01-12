import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Award, Loader2, Lock, CheckCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ResetPassword() {
  const { dir, language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const ArrowIcon = dir === 'rtl' ? ArrowRight : ArrowLeft;

  useEffect(() => {
    // Check if we have access token in URL (from email link)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');
    
    if (type === 'recovery' && accessToken) {
      // User came from password reset email
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: hashParams.get('refresh_token') || '',
      });
    }
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError(language === 'he' ? 'הסיסמה חייבת להכיל לפחות 6 תווים' : 'Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError(language === 'he' ? 'הסיסמאות אינן תואמות' : 'Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsSubmitting(false);

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      toast({
        title: language === 'he' ? 'הסיסמה עודכנה בהצלחה' : 'Password updated successfully',
      });
      setTimeout(() => navigate('/auth'), 2000);
    }
  };

  return (
    <div dir={dir} className="min-h-screen hero-gradient flex flex-col">
      <header className="p-4 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="p-2 bg-secondary rounded-lg">
            <Award className="h-6 w-6 text-secondary-foreground" />
          </div>
          <span className="text-xl font-bold text-primary-foreground">
            {language === 'he' ? 'מערכת הערכת פרויקטים' : 'Project Evaluation System'}
          </span>
        </Link>
        <LanguageToggle />
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md glass-card animate-fade-in">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto p-3 bg-primary/10 rounded-full w-fit">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">
              {language === 'he' ? 'איפוס סיסמה' : 'Reset Password'}
            </CardTitle>
            <CardDescription>
              {language === 'he' ? 'הזן את הסיסמה החדשה שלך' : 'Enter your new password'}
            </CardDescription>
          </CardHeader>

          {success ? (
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center gap-4 p-4 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <CheckCircle className="h-12 w-12 text-green-600" />
                <span className="text-green-700 dark:text-green-400 text-center">
                  {language === 'he' 
                    ? 'הסיסמה עודכנה בהצלחה! מעביר אותך לדף ההתחברות...'
                    : 'Password updated successfully! Redirecting to login...'}
                </span>
              </div>
            </CardContent>
          ) : (
            <form onSubmit={handleResetPassword}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    {language === 'he' ? 'סיסמה חדשה' : 'New Password'}
                  </Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={error ? 'border-destructive' : ''}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    {language === 'he' ? 'אימות סיסמה' : 'Confirm Password'}
                  </Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className={error ? 'border-destructive' : ''}
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
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
                    language === 'he' ? 'עדכן סיסמה' : 'Update Password'
                  )}
                </Button>
                <Link to="/auth" className="w-full">
                  <Button variant="outline" className="w-full gap-2">
                    <ArrowIcon className="h-4 w-4" />
                    {language === 'he' ? 'חזרה להתחברות' : 'Back to Login'}
                  </Button>
                </Link>
              </CardFooter>
            </form>
          )}
        </Card>
      </main>
    </div>
  );
}
