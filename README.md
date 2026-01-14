**Authors:** Idan Cohen, Almog Atias, Ofir Machluf, Raz Avioz  
**Course:** Software Engineering, SCE

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [User Roles & Instructions](#user-roles--instructions)
  - [Student](#student)
  - [Judge](#judge)
  - [Department Manager](#department-manager)
- [Running Tests](#running-tests)
- [Project Structure](#project-structure)

---

## 🎯 Overview

EvalSystem is a bilingual (Hebrew/English) platform designed to streamline the process of evaluating academic projects during conferences and presentations. It provides role-based access for students, judges, and department managers, enabling efficient project submission, evaluation, and grade management.

---

## ✨ Features

- **Multi-language Support:** Full Hebrew and English interface
- **Role-Based Access Control:** Different capabilities for students, judges, and managers
- **Project Management:** Create, edit, and manage projects with team members
- **Evaluation System:** Structured criteria-based evaluations with weighted scoring
- **Conference Management:** Organize projects by conferences and departments
- **Real-time Updates:** Live data synchronization
- **Report Generation:** Export evaluation results and reports
- **Responsive Design:** Works on desktop and mobile devices

---

## 🛠 Technology Stack

- **Frontend:** React 18, TypeScript, Vite
- **Styling:** Tailwind CSS, shadcn/ui
- **Backend:** Supabase (PostgreSQL, Authentication, Edge Functions)
- **State Management:** TanStack Query
- **Routing:** React Router DOM
- **Forms:** React Hook Form with Zod validation

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or bun package manager

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd <project-folder>
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Access the application:**
   Open your browser and navigate to `http://localhost:8080`

### Build for Production

```bash
npm run build
```

---

## 👥 User Roles & Instructions

### Student

Students can view their assigned projects and check their evaluation grades.

#### Capabilities:
- ✅ View assigned projects and presentations
- ✅ See project details (room, time, team members)
- ✅ View received grades and feedback after evaluation
- ✅ Access evaluation criteria and scores breakdown
- ✅ Switch between Hebrew and English interface

#### How to Use:

1. **Login:** Navigate to the login page and sign in with your credentials
2. **Dashboard:** After login, you'll see your dashboard with assigned projects
3. **View Projects:** Click on "Projects" in the sidebar to see all your presentations
4. **Check Grades:** Navigate to "Student Grades" to view your evaluation results
5. **View Presentations:** Access "Student Presentations" to see your presentation schedule

#### Navigation:
- **Dashboard** - Overview of your activity
- **Projects** - List of your assigned projects
- **Student Grades** - View your evaluation scores
- **Student Presentations** - Your presentation schedule

---

### Judge

Judges evaluate student projects based on defined criteria.

#### Capabilities:
- ✅ View assigned projects for evaluation
- ✅ Submit evaluations with scores for each criterion
- ✅ Add notes and feedback for each project
- ✅ Edit evaluations until marked as complete
- ✅ View evaluation history
- ✅ Filter projects by conference

#### How to Use:

1. **Login:** Sign in with your judge credentials
2. **View Assignments:** Your dashboard shows projects assigned to you
3. **Navigate to Projects:** Click "Projects" to see all assigned projects
4. **Evaluate a Project:**
   - Click "Evaluate Project" button on any project card
   - Score each criterion (typically 1-10 or as defined)
   - Add notes for each criterion if needed
   - Add general comments about the project
   - Click "Submit Evaluation" when complete
5. **Review Evaluations:** Access "Evaluations" to see your submitted evaluations

#### Navigation:
- **Dashboard** - Overview and quick stats
- **Projects** - Projects assigned for evaluation
- **Evaluate** - Active evaluation interface
- **Evaluations** - History of your evaluations
- **Settings** - Profile and expertise areas

#### Tips:
- Complete evaluations during or immediately after presentations
- Use the notes field to provide constructive feedback
- Ensure all criteria are scored before submitting

---

### Department Manager

Department managers oversee the evaluation process and manage projects.

#### Capabilities:
- ✅ Create and manage conferences
- ✅ Create and edit projects
- ✅ Assign judges to projects based on expertise
- ✅ Define evaluation criteria with weights
- ✅ View all evaluation results
- ✅ Generate and export reports
- ✅ Manage user roles and approvals
- ✅ View comprehensive statistics

#### How to Use:

1. **Login:** Sign in with your manager credentials

2. **Conference Management:**
   - Navigate to "Conferences" in the sidebar
   - Create new conferences with dates and locations
   - Add expertise areas for judge matching

3. **Project Management:**
   - Go to "Project Management"
   - Click "New Project" to create a project
   - Fill in project details (title, description, room, time)
   - Add team members
   - Select expertise tags for judge matching
   - Assign judges by clicking the assign button

4. **Criteria Management:**
   - Navigate to "Criteria"
   - Define evaluation criteria for each conference
   - Set weights and maximum scores
   - Arrange criteria order

5. **Judge Assignment:**
   - In Project Management, click the assign icon
   - Select judges based on matching expertise
   - Judges with matching expertise are highlighted

6. **View Results:**
   - Access "Reports" for comprehensive evaluation data
   - Export reports in various formats
   - View individual evaluations in "Evaluations"

7. **User Management:**
   - Navigate to "User Management"
   - Approve pending user registrations
   - Manage user roles and permissions

#### Navigation:
- **Dashboard** - System overview and statistics
- **Conferences** - Manage conferences
- **Project Management** - Create and manage projects
- **Judges** - View and manage judges
- **Criteria** - Define evaluation criteria
- **Evaluations** - View all evaluations
- **Reports** - Generate and export reports
- **User Management** - Manage users and roles
- **Settings** - System settings

#### Best Practices:
- Set up conferences and criteria before creating projects
- Match judges to projects based on expertise areas
- Regularly review evaluation progress
- Export reports for record-keeping

---

## 🧪 Running Tests

The project includes automated tests for user stories. Tests are located in the `tests/` directory.

### Prerequisites

- Python 3.x
- pytest

### Install Test Dependencies

```bash
pip install pytest
```

### Run All Tests

```bash
python tests/run_all_tests.py
```

### Run with Verbose Output

```bash
python tests/run_all_tests.py -v
```

### Run Specific Test

```bash
python -m pytest tests/test_us01_assign_role_to_judge.py -v
```

### Available Test Files

| File | Description |
|------|-------------|
| `test_us01_assign_role_to_judge.py` | Test assigning roles to judges |
| `test_us02_define_expertise_areas.py` | Test defining expertise areas |
| `test_us03_judge_view_presentations.py` | Test judge viewing presentations |
| `test_us04_judge_submit_evaluation.py` | Test judge submitting evaluations |
| `test_us05_manager_view_evaluation_results.py` | Test manager viewing results |
| `test_us06_manager_export_reports.py` | Test manager exporting reports |
| `test_us07_student_upload_file.py` | Test student file upload |
| `test_us08_student_view_grade.py` | Test student viewing grades |

---

## 📁 Project Structure

```
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── layout/         # Layout components (DashboardLayout)
│   │   └── ui/             # shadcn/ui components
│   ├── contexts/           # React contexts (Auth, Language)
│   ├── hooks/              # Custom React hooks
│   ├── integrations/       # Supabase client and types
│   ├── lib/                # Utility functions
│   └── pages/              # Page components
│       ├── Auth.tsx        # Authentication page
│       ├── Dashboard.tsx   # Main dashboard
│       ├── Projects.tsx    # Projects list
│       ├── Evaluate.tsx    # Evaluation form
│       ├── Evaluations.tsx # Evaluation history
│       ├── Reports.tsx     # Reports generation
│       └── ...
├── supabase/
│   ├── functions/          # Edge functions
│   └── migrations/         # Database migrations
├── tests/                  # Python test files
└── public/                 # Static assets
```

---

## 🔐 Security

- Role-based access control (RLS) at database level
- Secure authentication via Supabase Auth
- User roles stored in separate table to prevent privilege escalation
- All API requests authenticated

---

## 🌐 Language Support

Toggle between Hebrew and English using the language button in the header. The interface automatically adjusts text direction (RTL/LTR) based on the selected language.

---

## 📞 Support

For issues or questions, please contact the development team or open an issue in the repository.

---
