import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Judges from "./pages/Judges";
import Students from "./pages/Students";
import UserManagement from "./pages/UserManagement";
import Projects from "./pages/Projects";
import Evaluate from "./pages/Evaluate";
import ViewEvaluation from "./pages/ViewEvaluation";
import Criteria from "./pages/Criteria";
import Evaluations from "./pages/Evaluations";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Conferences from "./pages/Conferences";
import ProjectManagement from "./pages/ProjectManagement";
import ResetPassword from "./pages/ResetPassword";
import StudentPresentations from "./pages/StudentPresentations";
import StudentGrades from "./pages/StudentGrades";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/judges" element={<Judges />} />
              <Route path="/students" element={<Students />} />
              <Route path="/user-management" element={<UserManagement />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/evaluate/:projectId" element={<Evaluate />} />
              <Route path="/view-evaluation/:evaluationId" element={<ViewEvaluation />} />
              <Route path="/criteria" element={<Criteria />} />
              <Route path="/evaluations" element={<Evaluations />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/conferences" element={<Conferences />} />
              <Route path="/project-management" element={<ProjectManagement />} />
              <Route path="/student-presentations" element={<StudentPresentations />} />
              <Route path="/student-grades" element={<StudentGrades />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
