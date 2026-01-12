import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'he' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  dir: 'rtl' | 'ltr';
}

const translations: Record<Language, Record<string, string>> = {
  he: {
    // General
    'app.title': 'מערכת הערכת פרויקטים',
    'app.subtitle': 'מערכת לניהול שיפוט מצגות בכנסים',
    'signIn': 'התחברות',
    'register': 'הרשמה',
    
    // Auth
    'auth.login': 'התחברות',
    'auth.signup': 'הרשמה',
    'auth.logout': 'התנתקות',
    'auth.email': 'דוא"ל',
    'auth.password': 'סיסמה',
    'auth.confirmPassword': 'אישור סיסמה',
    'auth.fullName': 'שם מלא',
    'auth.phone': 'טלפון',
    'auth.company': 'חברה/ארגון',
    'auth.jobTitle': 'תפקיד',
    'auth.expertiseAreas': 'תחומי התמחות',
    'auth.forgotPassword': 'שכחתי סיסמה',
    'auth.noAccount': 'אין לך חשבון?',
    'auth.hasAccount': 'יש לך חשבון?',
    'auth.registerAsJudge': 'הרשמה כשופט',
    'auth.loginError': 'שגיאה בהתחברות',
    'auth.signupError': 'שגיאה בהרשמה',
    'auth.pendingApproval': 'הבקשה שלך ממתינה לאישור',
    'auth.invitationCode': 'קוד הזמנה (אופציונלי)',
    
    // Navigation
    'nav.dashboard': 'לוח בקרה',
    'nav.projects': 'פרויקטים',
    'nav.evaluations': 'הערכות',
    'nav.judges': 'שופטים',
    'nav.criteria': 'קריטריונים',
    'nav.reports': 'דוחות',
    'nav.settings': 'הגדרות',
    'nav.conferences': 'כנסים',
    
    // Dashboard
    'dashboard.welcome': 'ברוך הבא',
    'dashboard.assignedProjects': 'פרויקטים שהוקצו לך',
    'dashboard.completedEvaluations': 'הערכות שהושלמו',
    'dashboard.pendingEvaluations': 'הערכות בהמתנה',
    'dashboard.upcomingConference': 'הכנס הקרוב',
    
    // Projects
    'projects.title': 'פרויקטים',
    'projects.noProjects': 'אין פרויקטים להצגה',
    'projects.team': 'צוות',
    'projects.expertise': 'תחומי התמחות',
    'projects.room': 'חדר',
    'projects.time': 'שעה',
    'projects.evaluate': 'הערך',
    'projects.viewDetails': 'צפה בפרטים',
    
    // Evaluations
    'evaluations.title': 'הערכות',
    'evaluations.score': 'ציון',
    'evaluations.notes': 'הערות',
    'evaluations.submit': 'שלח הערכה',
    'evaluations.save': 'שמור טיוטה',
    'evaluations.complete': 'הושלם',
    'evaluations.incomplete': 'לא הושלם',
    'evaluations.generalNotes': 'הערות כלליות',
    
    // Admin
    'admin.manageJudges': 'ניהול שופטים',
    'admin.manageProjects': 'ניהול פרויקטים',
    'admin.manageCriteria': 'ניהול קריטריונים',
    'admin.inviteJudge': 'הזמן שופט',
    'admin.approveJudge': 'אשר שופט',
    'admin.assignProject': 'הקצה פרויקט',
    'admin.pendingApprovals': 'ממתינים לאישור',
    
    // Common
    'common.save': 'שמור',
    'common.cancel': 'ביטול',
    'common.delete': 'מחק',
    'common.edit': 'ערוך',
    'common.add': 'הוסף',
    'common.search': 'חיפוש',
    'common.filter': 'סינון',
    'common.loading': 'טוען...',
    'common.error': 'שגיאה',
    'common.success': 'הצלחה',
    'common.noData': 'אין נתונים',
    'common.actions': 'פעולות',
    'common.status': 'סטטוס',
    'common.date': 'תאריך',
    'common.name': 'שם',
    'common.description': 'תיאור',
  },
  en: {
    // General
    'app.title': 'Project Evaluation System',
    'app.subtitle': 'Conference presentation judging management system',
    'signIn': 'Sign In',
    'register': 'Register',
    
    // Auth
    'auth.login': 'Login',
    'auth.signup': 'Sign Up',
    'auth.logout': 'Logout',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.confirmPassword': 'Confirm Password',
    'auth.fullName': 'Full Name',
    'auth.phone': 'Phone',
    'auth.company': 'Company/Organization',
    'auth.jobTitle': 'Job Title',
    'auth.expertiseAreas': 'Areas of Expertise',
    'auth.forgotPassword': 'Forgot Password',
    'auth.noAccount': "Don't have an account?",
    'auth.hasAccount': 'Already have an account?',
    'auth.registerAsJudge': 'Register as Judge',
    'auth.loginError': 'Login Error',
    'auth.signupError': 'Signup Error',
    'auth.pendingApproval': 'Your request is pending approval',
    'auth.invitationCode': 'Invitation Code (optional)',
    
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.projects': 'Projects',
    'nav.evaluations': 'Evaluations',
    'nav.judges': 'Judges',
    'nav.criteria': 'Criteria',
    'nav.reports': 'Reports',
    'nav.settings': 'Settings',
    'nav.conferences': 'Conferences',
    
    // Dashboard
    'dashboard.welcome': 'Welcome',
    'dashboard.assignedProjects': 'Assigned Projects',
    'dashboard.completedEvaluations': 'Completed Evaluations',
    'dashboard.pendingEvaluations': 'Pending Evaluations',
    'dashboard.upcomingConference': 'Upcoming Conference',
    
    // Projects
    'projects.title': 'Projects',
    'projects.noProjects': 'No projects to display',
    'projects.team': 'Team',
    'projects.expertise': 'Expertise Areas',
    'projects.room': 'Room',
    'projects.time': 'Time',
    'projects.evaluate': 'Evaluate',
    'projects.viewDetails': 'View Details',
    
    // Evaluations
    'evaluations.title': 'Evaluations',
    'evaluations.score': 'Score',
    'evaluations.notes': 'Notes',
    'evaluations.submit': 'Submit Evaluation',
    'evaluations.save': 'Save Draft',
    'evaluations.complete': 'Complete',
    'evaluations.incomplete': 'Incomplete',
    'evaluations.generalNotes': 'General Notes',
    
    // Admin
    'admin.manageJudges': 'Manage Judges',
    'admin.manageProjects': 'Manage Projects',
    'admin.manageCriteria': 'Manage Criteria',
    'admin.inviteJudge': 'Invite Judge',
    'admin.approveJudge': 'Approve Judge',
    'admin.assignProject': 'Assign Project',
    'admin.pendingApprovals': 'Pending Approvals',
    
    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.noData': 'No Data',
    'common.actions': 'Actions',
    'common.status': 'Status',
    'common.date': 'Date',
    'common.name': 'Name',
    'common.description': 'Description',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem('language');
    return (stored as Language) || 'he';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  const dir = language === 'he' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
  }, [dir, language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
