# User Story 8: As a Student, I want to view the grade assigned to me.
# Role: Student

import unittest
from unittest.mock import MagicMock


class MockSupabaseClient:
    """Mock Supabase client for testing."""
    
    def __init__(self):
        self.projects = MagicMock()
        self.profiles = MagicMock()
        self.evaluations = MagicMock()
        self.evaluation_scores = MagicMock()
        self.evaluation_criteria = MagicMock()
    
    def from_(self, table_name):
        tables = {
            'projects': self.projects,
            'profiles': self.profiles,
            'evaluations': self.evaluations,
            'evaluation_scores': self.evaluation_scores,
            'evaluation_criteria': self.evaluation_criteria
        }
        return tables.get(table_name, MagicMock())


class StudentGradeService:
    """Service class representing grade viewing logic for students."""
    
    def __init__(self, supabase_client, current_user_id, current_user_role):
        self.client = supabase_client
        self.current_user_id = current_user_id
        self.current_user_role = current_user_role
    
    def is_student(self):
        return self.current_user_role == 'student'
    
    def get_user_full_name(self):
        profile = self.client.from_('profiles').select(
            'full_name'
        ).eq('user_id', self.current_user_id).single().execute()
        
        return profile.data.get('full_name') if profile.data else None
    
    def get_student_projects(self):
        if not self.is_student():
            raise PermissionError("Only students can view their projects")
        
        user_name = self.get_user_full_name()
        if not user_name:
            return []
        
        projects = self.client.from_('projects').select('*').execute()
        
        return [p for p in projects.data if user_name in (p.get('team_members', []) or [])]
    
    def get_project_grade(self, project_id):
        if not self.is_student():
            raise PermissionError("Only students can view their grades")
        
        # Verify student is part of this project
        user_name = self.get_user_full_name()
        project = self.client.from_('projects').select(
            'team_members, title_en, title_he'
        ).eq('id', project_id).single().execute()
        
        if not project.data:
            raise ValueError("Project not found")
        
        team_members = project.data.get('team_members', []) or []
        if user_name not in team_members:
            raise PermissionError("You are not a member of this project")
        
        # Get completed evaluations for this project
        evaluations = self.client.from_('evaluations').select(
            '*, evaluation_scores(*)'
        ).eq('project_id', project_id).eq('is_complete', True).execute()
        
        if not evaluations.data:
            return {
                'project_id': project_id,
                'title_en': project.data.get('title_en'),
                'title_he': project.data.get('title_he'),
                'has_grade': False,
                'average_score': None,
                'evaluation_count': 0,
                'message': 'No evaluations completed yet'
            }
        
        # Calculate average score
        all_scores = []
        for evaluation in evaluations.data:
            scores = evaluation.get('evaluation_scores', [])
            for score in scores:
                all_scores.append(score.get('score', 0))
        
        avg_score = sum(all_scores) / len(all_scores) if all_scores else 0
        
        return {
            'project_id': project_id,
            'title_en': project.data.get('title_en'),
            'title_he': project.data.get('title_he'),
            'has_grade': True,
            'average_score': round(avg_score, 2),
            'evaluation_count': len(evaluations.data)
        }
    
    def get_all_grades(self):
        if not self.is_student():
            raise PermissionError("Only students can view their grades")
        
        projects = self.get_student_projects()
        
        grades = []
        for project in projects:
            grade = self.get_project_grade(project['id'])
            grades.append(grade)
        
        return grades
    
    def get_detailed_scores(self, project_id):
        """Get detailed breakdown of scores by criteria (if allowed)."""
        if not self.is_student():
            raise PermissionError("Only students can view their scores")
        
        # Verify student is part of this project
        user_name = self.get_user_full_name()
        project = self.client.from_('projects').select(
            'team_members, conference_id'
        ).eq('id', project_id).single().execute()
        
        if not project.data:
            raise ValueError("Project not found")
        
        team_members = project.data.get('team_members', []) or []
        if user_name not in team_members:
            raise PermissionError("You are not a member of this project")
        
        # Get criteria for the conference
        criteria = self.client.from_('evaluation_criteria').select(
            '*'
        ).eq('conference_id', project.data['conference_id']).order('sort_order').execute()
        
        # Get all completed evaluation scores
        evaluations = self.client.from_('evaluations').select(
            'evaluation_scores(*)'
        ).eq('project_id', project_id).eq('is_complete', True).execute()
        
        # Calculate average per criterion
        criteria_scores = {}
        for criterion in criteria.data:
            criterion_id = criterion['id']
            scores_for_criterion = []
            
            for evaluation in evaluations.data:
                for score in evaluation.get('evaluation_scores', []):
                    if score.get('criterion_id') == criterion_id:
                        scores_for_criterion.append(score.get('score', 0))
            
            avg = sum(scores_for_criterion) / len(scores_for_criterion) if scores_for_criterion else None
            
            criteria_scores[criterion_id] = {
                'name_en': criterion.get('name_en'),
                'name_he': criterion.get('name_he'),
                'max_score': criterion.get('max_score', 10),
                'weight': criterion.get('weight', 1),
                'average_score': round(avg, 2) if avg is not None else None,
                'evaluation_count': len(scores_for_criterion)
            }
        
        return criteria_scores


class TestStudentViewGrade(unittest.TestCase):
    """Test cases for User Story 8: Student views grade."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.mock_client = MockSupabaseClient()
        self.test_student_id = 'student-uuid-123'
        self.test_project_id = 'project-uuid-456'
        
        # Common mock setup
        self.mock_client.profiles.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={'full_name': 'John Student'}
        )
    
    # Happy Path Tests
    
    def test_student_can_view_own_project_grade(self):
        """Student should be able to view their project grade."""
        service = StudentGradeService(self.mock_client, self.test_student_id, 'student')
        
        self.mock_client.projects.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={
                'team_members': ['John Student'],
                'title_en': 'My Project',
                'title_he': 'הפרויקט שלי'
            }
        )
        self.mock_client.evaluations.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[
                {'is_complete': True, 'evaluation_scores': [{'score': 8}, {'score': 9}]},
                {'is_complete': True, 'evaluation_scores': [{'score': 7}, {'score': 8}]}
            ]
        )
        
        grade = service.get_project_grade(self.test_project_id)
        
        self.assertTrue(grade['has_grade'])
        self.assertEqual(grade['average_score'], 8.0)
        self.assertEqual(grade['evaluation_count'], 2)
    
    def test_student_can_view_all_grades(self):
        """Student should be able to view grades for all their projects."""
        service = StudentGradeService(self.mock_client, self.test_student_id, 'student')
        
        self.mock_client.projects.select.return_value.execute.return_value = MagicMock(
            data=[
                {'id': 'proj-1', 'team_members': ['John Student'], 'title_en': 'Project 1'},
                {'id': 'proj-2', 'team_members': ['John Student'], 'title_en': 'Project 2'}
            ]
        )
        self.mock_client.projects.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={'team_members': ['John Student'], 'title_en': 'Test Project'}
        )
        self.mock_client.evaluations.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{'is_complete': True, 'evaluation_scores': [{'score': 8}]}]
        )
        
        grades = service.get_all_grades()
        
        self.assertEqual(len(grades), 2)
    
    def test_student_can_view_detailed_scores(self):
        """Student should be able to view detailed score breakdown."""
        service = StudentGradeService(self.mock_client, self.test_student_id, 'student')
        
        self.mock_client.projects.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={
                'team_members': ['John Student'],
                'conference_id': 'conf-1'
            }
        )
        self.mock_client.evaluation_criteria.select.return_value.eq.return_value.order.return_value.execute.return_value = MagicMock(
            data=[
                {'id': 'crit-1', 'name_en': 'Innovation', 'name_he': 'חדשנות', 'max_score': 10, 'weight': 1.5},
                {'id': 'crit-2', 'name_en': 'Presentation', 'name_he': 'הצגה', 'max_score': 10, 'weight': 1.0}
            ]
        )
        self.mock_client.evaluations.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[
                {'evaluation_scores': [
                    {'criterion_id': 'crit-1', 'score': 9},
                    {'criterion_id': 'crit-2', 'score': 8}
                ]}
            ]
        )
        
        details = service.get_detailed_scores(self.test_project_id)
        
        self.assertIn('crit-1', details)
        self.assertEqual(details['crit-1']['name_en'], 'Innovation')
        self.assertEqual(details['crit-1']['average_score'], 9.0)
    
    def test_grade_includes_project_title(self):
        """Grade response should include project title."""
        service = StudentGradeService(self.mock_client, self.test_student_id, 'student')
        
        self.mock_client.projects.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={
                'team_members': ['John Student'],
                'title_en': 'Amazing AI Project',
                'title_he': 'פרויקט AI מדהים'
            }
        )
        self.mock_client.evaluations.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{'is_complete': True, 'evaluation_scores': [{'score': 8}]}]
        )
        
        grade = service.get_project_grade(self.test_project_id)
        
        self.assertEqual(grade['title_en'], 'Amazing AI Project')
        self.assertEqual(grade['title_he'], 'פרויקט AI מדהים')
    
    # Edge Cases
    
    def test_project_with_no_evaluations(self):
        """Project with no completed evaluations should indicate no grade."""
        service = StudentGradeService(self.mock_client, self.test_student_id, 'student')
        
        self.mock_client.projects.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={'team_members': ['John Student'], 'title_en': 'New Project'}
        )
        self.mock_client.evaluations.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[]
        )
        
        grade = service.get_project_grade(self.test_project_id)
        
        self.assertFalse(grade['has_grade'])
        self.assertIsNone(grade['average_score'])
        self.assertIn('No evaluations', grade['message'])
    
    def test_student_with_no_projects(self):
        """Student with no projects should get empty grades list."""
        service = StudentGradeService(self.mock_client, self.test_student_id, 'student')
        
        self.mock_client.projects.select.return_value.execute.return_value = MagicMock(data=[])
        
        grades = service.get_all_grades()
        
        self.assertEqual(grades, [])
    
    def test_criterion_with_no_scores(self):
        """Criterion with no scores should show None average."""
        service = StudentGradeService(self.mock_client, self.test_student_id, 'student')
        
        self.mock_client.projects.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={'team_members': ['John Student'], 'conference_id': 'conf-1'}
        )
        self.mock_client.evaluation_criteria.select.return_value.eq.return_value.order.return_value.execute.return_value = MagicMock(
            data=[{'id': 'crit-1', 'name_en': 'Test', 'max_score': 10, 'weight': 1}]
        )
        self.mock_client.evaluations.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[]
        )
        
        details = service.get_detailed_scores(self.test_project_id)
        
        self.assertIsNone(details['crit-1']['average_score'])
    
    def test_score_rounded_to_two_decimals(self):
        """Average score should be rounded to 2 decimal places."""
        service = StudentGradeService(self.mock_client, self.test_student_id, 'student')
        
        self.mock_client.projects.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={'team_members': ['John Student'], 'title_en': 'Test'}
        )
        self.mock_client.evaluations.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[
                {'is_complete': True, 'evaluation_scores': [{'score': 7}]},
                {'is_complete': True, 'evaluation_scores': [{'score': 8}]},
                {'is_complete': True, 'evaluation_scores': [{'score': 9}]}
            ]
        )
        
        grade = service.get_project_grade(self.test_project_id)
        
        self.assertEqual(grade['average_score'], 8.0)
    
    # Invalid/Unauthorized Actions
    
    def test_judge_cannot_view_student_grades(self):
        """Judge should not be able to use student grade view."""
        service = StudentGradeService(self.mock_client, 'judge-id', 'judge')
        
        with self.assertRaises(PermissionError) as context:
            service.get_project_grade(self.test_project_id)
        
        self.assertIn("Only students", str(context.exception))
    
    def test_manager_cannot_view_grades_as_student(self):
        """Manager should not be able to use student grade view."""
        service = StudentGradeService(self.mock_client, 'manager-id', 'department_manager')
        
        with self.assertRaises(PermissionError):
            service.get_all_grades()
    
    def test_student_cannot_view_other_team_grade(self):
        """Student should not be able to view grades for projects they're not part of."""
        service = StudentGradeService(self.mock_client, self.test_student_id, 'student')
        
        self.mock_client.projects.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={
                'team_members': ['Other Person', 'Another Person'],
                'title_en': 'Not My Project'
            }
        )
        
        with self.assertRaises(PermissionError) as context:
            service.get_project_grade(self.test_project_id)
        
        self.assertIn("not a member", str(context.exception))
    
    def test_nonexistent_project_raises_error(self):
        """Viewing grade for non-existent project should raise ValueError."""
        service = StudentGradeService(self.mock_client, self.test_student_id, 'student')
        
        self.mock_client.projects.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data=None
        )
        
        with self.assertRaises(ValueError) as context:
            service.get_project_grade('nonexistent-project')
        
        self.assertIn("Project not found", str(context.exception))
    
    def test_student_cannot_view_detailed_scores_of_other_project(self):
        """Student cannot view detailed scores of projects they're not part of."""
        service = StudentGradeService(self.mock_client, self.test_student_id, 'student')
        
        self.mock_client.projects.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={'team_members': ['Someone Else'], 'conference_id': 'conf-1'}
        )
        
        with self.assertRaises(PermissionError):
            service.get_detailed_scores('other-project-id')


if __name__ == '__main__':
    unittest.main()
