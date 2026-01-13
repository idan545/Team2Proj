import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Award,
  LayoutDashboard,
  FolderKanban,
  ClipboardCheck,
  Users,
  ListChecks,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  Calendar,
  Presentation,
  GraduationCap,
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { profile, isAdmin, roles, signOut } = useAuth();
  const { t, dir, language } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const isStudent = roles.some(r => r.role === 'student');
  const isDepartmentManager = roles.some(r => r.role === 'department_manager');

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
    { href: '/projects', icon: FolderKanban, label: t('nav.projects') },
    ...(!isStudent ? [{ href: '/evaluations', icon: ClipboardCheck, label: t('nav.evaluations') }] : []),
  ];

  const studentNavItems = [
    { href: '/student-presentations', icon: Presentation, label: language === 'he' ? 'ניהול מצגות' : 'Manage Presentations' },
    { href: '/student-grades', icon: GraduationCap, label: language === 'he' ? 'הציונים שלי' : 'My Grades' },
  ];

  const departmentManagerNavItems = [
    { href: '/conferences', icon: Calendar, label: t('nav.conferences') },
    { href: '/project-management', icon: FolderKanban, label: language === 'he' ? 'ניהול פרויקטים' : 'Manage Projects' },
    { href: '/criteria', icon: ListChecks, label: t('nav.criteria') },
    { href: '/reports', icon: BarChart3, label: t('nav.reports') },
  ];

  // Department manager nav items (includes user management)
  const managerNavItems = [
    { href: '/conferences', icon: Calendar, label: t('nav.conferences') },
    { href: '/project-management', icon: FolderKanban, label: language === 'he' ? 'ניהול פרויקטים' : 'Manage Projects' },
    { href: '/user-management', icon: Users, label: language === 'he' ? 'ניהול משתמשים' : 'User Management' },
    { href: '/criteria', icon: ListChecks, label: t('nav.criteria') },
    { href: '/reports', icon: BarChart3, label: t('nav.reports') },
  ];

  const NavLink = ({ href, icon: Icon, label }: { href: string; icon: typeof LayoutDashboard; label: string }) => {
    const isActive = location.pathname === href;
    return (
      <Link
        to={href}
        className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
          isActive
            ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
            : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
        )}
      >
        <Icon className="h-5 w-5" />
        <span>{label}</span>
      </Link>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-sidebar-primary rounded-lg">
            <Award className="h-6 w-6 text-sidebar-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-sidebar-foreground">{t('app.title')}</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}

        {isStudent && (
          <>
            <div className="pt-4 pb-2">
              <span className="px-4 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                {language === 'he' ? 'סטודנט' : 'Student'}
              </span>
            </div>
            {studentNavItems.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </>
        )}

        {isDepartmentManager && (
          <>
            <div className="pt-4 pb-2">
              <span className="px-4 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                {language === 'he' ? 'מנהל כנס' : 'Conference Manager'}
              </span>
            </div>
            {managerNavItems.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </>
        )}
      </nav>

      {/* User Menu */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-4 py-2">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">
              {profile?.full_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {profile?.full_name || 'User'}
            </p>
            <p className="text-xs text-sidebar-foreground/60 truncate">
              {profile?.email}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div dir={dir} className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
        <div className="flex flex-col flex-1 bg-sidebar border-e border-sidebar-border">
          <SidebarContent />
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-card border-b border-border">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side={dir === 'rtl' ? 'right' : 'left'} className="w-72 p-0 bg-sidebar">
            <SidebarContent />
          </SheetContent>
        </Sheet>

        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-primary rounded-lg">
            <Award className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-foreground">{t('app.title')}</span>
        </div>

        <div className="flex items-center gap-2">
          <LanguageToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {profile?.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="h-4 w-4 me-2" />
                {t('nav.settings')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="h-4 w-4 me-2" />
                {t('auth.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Desktop Header */}
      <header className="hidden lg:flex lg:ms-72 sticky top-0 z-50 items-center justify-between px-8 py-4 bg-card/80 backdrop-blur-lg border-b border-border">
        <div />
        <div className="flex items-center gap-4">
          <LanguageToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {profile?.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">{profile?.full_name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="h-4 w-4 me-2" />
                {t('nav.settings')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="h-4 w-4 me-2" />
                {t('auth.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content */}
      <main className="lg:ms-72 min-h-[calc(100vh-4rem)]">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
