import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, Users, ClipboardCheck, BarChart3, ArrowRight, ArrowLeft } from "lucide-react";

const Index = () => {
  const { t, language, dir } = useLanguage();
  const ArrowIcon = dir === 'rtl' ? ArrowLeft : ArrowRight;

  const features = [
    {
      icon: Users,
      title: language === 'he' ? 'ניהול שופטים' : 'Judge Management',
      description: language === 'he' 
        ? 'גיוס והקצאת שופטים מומחים לפי תחומי התמחות'
        : 'Recruit and assign expert judges by expertise areas'
    },
    {
      icon: ClipboardCheck,
      title: language === 'he' ? 'קריטריונים אחידים' : 'Unified Criteria',
      description: language === 'he'
        ? 'סולם הערכה אחיד המוגדר על ידי המחלקה'
        : 'Standardized evaluation scale defined by the department'
    },
    {
      icon: Award,
      title: language === 'he' ? 'הערכת פרויקטים' : 'Project Evaluation',
      description: language === 'he'
        ? 'מערכת הערכה מקיפה לפרויקטי הגמר'
        : 'Comprehensive evaluation system for final projects'
    },
    {
      icon: BarChart3,
      title: language === 'he' ? 'דוחות ותובנות' : 'Reports & Insights',
      description: language === 'he'
        ? 'צפייה בציונים וניתוח נתונים למנהלים'
        : 'View scores and data analysis for managers'
    }
  ];

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg hero-gradient flex items-center justify-center">
              <Award className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">
              {language === 'he' ? 'מערכת הערכה' : 'EvalSystem'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <LanguageToggle />
            <Link to="/auth">
              <Button variant="outline" size="sm">
                {t('signIn')}
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="sm">
                {t('register')}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 hero-gradient text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 pattern-overlay opacity-50" />
        <div className="container mx-auto text-center relative z-10">
          <h1 className="mb-6 text-primary-foreground">
            {language === 'he' 
              ? 'מערכת הערכת פרויקטי גמר'
              : 'Final Project Evaluation System'}
          </h1>
          <p className="text-xl md:text-2xl mb-8 opacity-90 max-w-3xl mx-auto">
            {language === 'he'
              ? 'פלטפורמה מקצועית לניהול והערכת פרויקטי גמר בכנסים אקדמיים'
              : 'Professional platform for managing and evaluating final projects at academic conferences'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth">
              <Button size="lg" variant="secondary" className="gap-2 min-w-[200px]">
                {language === 'he' ? 'התחל עכשיו' : 'Get Started'}
                <ArrowIcon className="w-5 h-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="min-w-[200px] border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
              {language === 'he' ? 'למידע נוסף' : 'Learn More'}
            </Button>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="mb-4">
              {language === 'he' ? 'יכולות המערכת' : 'System Capabilities'}
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {language === 'he'
                ? 'כלים מתקדמים לניהול יעיל של תהליך ההערכה'
                : 'Advanced tools for efficient evaluation process management'}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="hover-lift glass-card">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="mb-4">
              {language === 'he' ? 'למי המערכת מיועדת?' : 'Who Is This For?'}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="text-center hover-lift">
              <CardHeader>
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <CardTitle>
                  {language === 'he' ? 'שופטים' : 'Judges'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {language === 'he'
                    ? 'מומחים מתחום הנדסת תוכנה המעריכים פרויקטים בתחום התמחותם'
                    : 'Software engineering experts evaluating projects in their specialty'}
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover-lift border-primary/50">
              <CardHeader>
                <div className="w-16 h-16 rounded-full accent-gradient flex items-center justify-center mx-auto mb-4">
                  <ClipboardCheck className="w-8 h-8 text-secondary-foreground" />
                </div>
                <CardTitle>
                  {language === 'he' ? 'מנהלי מחלקות' : 'Department Managers'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {language === 'he'
                    ? 'ניהול שופטים, הקצאת פרויקטים וצפייה בהתקדמות ההערכה'
                    : 'Manage judges, assign projects, and monitor evaluation progress'}
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover-lift">
              <CardHeader>
                <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-8 h-8 text-accent" />
                </div>
                <CardTitle>
                  {language === 'he' ? 'אחראי מחלקה' : 'Department Head'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {language === 'he'
                    ? 'גישה מלאה לציונים, דוחות וניהול קריטריוני ההערכה'
                    : 'Full access to scores, reports, and evaluation criteria management'}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 hero-gradient text-primary-foreground">
        <div className="container mx-auto text-center">
          <h2 className="mb-6 text-primary-foreground">
            {language === 'he' ? 'מוכנים להתחיל?' : 'Ready to Get Started?'}
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            {language === 'he'
              ? 'הצטרפו למערכת ההערכה המקצועית שלנו והפכו את תהליך השיפוט ליעיל יותר'
              : 'Join our professional evaluation system and make the judging process more efficient'}
          </p>
          <Link to="/auth">
            <Button size="lg" variant="secondary" className="gap-2">
              {language === 'he' ? 'הרשמה חינם' : 'Sign Up Free'}
              <ArrowIcon className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>
            © {new Date().getFullYear()} {language === 'he' ? 'מערכת הערכה' : 'EvalSystem'}. 
            {language === 'he' ? ' כל הזכויות שמורות.' : ' All rights reserved.'}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
