# User Story 3: As a Judge, I want to view presentations uploaded by students.
# Role: Judge

import unittest
from unittest.mock import MagicMock


class MockSupabaseClient:
    """Mock Supabase client for testing."""
    
    def __init__(self):
        self.projects = MagicMock()
        self.judge_assignments = MagicMock()
        self.storage = MagicMock()
    
    def from_(self, table_name):
        if table_name == 'projects':
            return self.projects
        elif table_name == 'judge_assignments':
            return self.judge_assignments
        return MagicMock()


class PresentationViewService:
    """Service class representing presentation viewing logic for judges."""
    
    def __init__(self, supabase_client, current_user_id, current_user_role):
        self.client = supabase_client
        self.current_user_id = current_user_id
        self.current_user_role = current_user_role
    
    def is_judge(self):
        return self.current_user_role == 'judge'
    
    def is_approved(self, is_approved_status):
        return is_approved_status == True
    
    def get_assigned_projects(self):
        if not self.is_judge():
            raise PermissionError("Only judges can view assigned presentations")
        
        assignments = self.client.from_('judge_assignments').select(
            'project_id'
        ).eq('judge_id', self.current_user_id).execute()
        
        project_ids = [a['project_id'] for a in assignments.data]
        
        if not project_ids:
            return []
        
        projects = self.client.from_('projects').select(
            'id, title_he, title_en, description_he, description_en, presentation_url, room, presentation_time, team_members'
        ).in_('id', project_ids).execute()
        
        return projects.data
    
    def get_presentation_url(self, project_id):
        if not self.is_judge():
            raise PermissionError("Only judges can access presentations")
        
        # Check if judge is assigned to this project
        assignment = self.client.from_('judge_assignments').select(
            'id'
        ).eq('judge_id', self.current_user_id).eq('project_id', project_id).execute()
        
        if not assignment.data:
            raise PermissionError("Judge is not assigned to this project")
        
        project = self.client.from_('projects').select(
            'presentation_url'
        ).eq('id', project_id).single().execute()
        
        return project.data.get('presentation_url')
    
    def get_project_details(self, project_id):
        if not self.is_judge():
            raise PermissionError("Only judges can view project details")
        
        # Verify assignment
        assignment = self.client.from_('judge_assignments').select(
            'id'
        ).eq('judge_id', self.current_user_id).eq('project_id', project_id).execute()
        
        if not assignment.data:
            raise PermissionError("Judge is not assigned to this project")
        
        project = self.client.from_('projects').select('*').eq('id', project_id).single().execute()
        
        return project.data


class TestJudgeViewPresentations(unittest.TestCase):
    """Test cases for User Story 3: Judge views presentations."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.mock_client = MockSupabaseClient()
        self.test_judge_id = 'judge-uuid-123'
        self.test_project_id = 'project-uuid-456'
    
    # Happy Path Tests
    
    def test_approved_judge_can_view_assigned_projects(self):
        """An approved judge should be able to view their assigned projects."""
        service = PresentationViewService(self.mock_client, self.test_judge_id, 'judge')
        
        self.mock_client.judge_assignments.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{'project_id': 'proj-1'}, {'project_id': 'proj-2'}]
        )
        self.mock_client.projects.select.return_value.in_.return_value.execute.return_value = MagicMock(
            data=[
                {'id': 'proj-1', 'title_en': 'Project 1', 'presentation_url': 'http://example.com/1'},
                {'id': 'proj-2', 'title_en': 'Project 2', 'presentation_url': 'http://example.com/2'}
            ]
        )
        
        projects = service.get_assigned_projects()
        
        self.assertEqual(len(projects), 2)
        self.assertEqual(projects[0]['title_en'], 'Project 1')
    
    def test_judge_can_get_presentation_url(self):
        """Judge should be able to get presentation URL for assigned project."""
        service = PresentationViewService(self.mock_client, self.test_judge_id, 'judge')
        
        self.mock_client.judge_assignments.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{'id': 'assignment-1'}]
        )
        self.mock_client.projects.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={'presentation_url': 'https://storage.example.com/presentation.pdf'}
        )
        
        url = service.get_presentation_url(self.test_project_id)
        
        self.assertEqual(url, 'https://storage.example.com/presentation.pdf')
    
    def test_judge_can_view_project_details(self):
        """Judge should be able to view full project details."""
        service = PresentationViewService(self.mock_client, self.test_judge_id, 'judge')
        
        self.mock_client.judge_assignments.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{'id': 'assignment-1'}]
        )
        self.mock_client.projects.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={
                'id': self.test_project_id,
                'title_en': 'AI Assistant',
                'title_he': 'עוזר בינה מלאכותית',
                'description_en': 'An AI-powered assistant',
                'team_members': ['John Doe', 'Jane Smith'],
                'room': 'A101',
                'presentation_time': '10:00:00',
                'presentation_url': 'https://example.com/file.pdf'
            }
        )
        
        details = service.get_project_details(self.test_project_id)
        
        self.assertEqual(details['title_en'], 'AI Assistant')
        self.assertEqual(details['room'], 'A101')
        self.assertIn('John Doe', details['team_members'])
    
    # Edge Cases
    
    def test_judge_with_no_assignments_gets_empty_list(self):
        """Judge with no assignments should get an empty list."""
        service = PresentationViewService(self.mock_client, self.test_judge_id, 'judge')
        
        self.mock_client.judge_assignments.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[]
        )
        
        projects = service.get_assigned_projects()
        
        self.assertEqual(projects, [])
    
    def test_project_without_presentation_returns_none(self):
        """Project without uploaded presentation should return None for URL."""
        service = PresentationViewService(self.mock_client, self.test_judge_id, 'judge')
        
        self.mock_client.judge_assignments.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{'id': 'assignment-1'}]
        )
        self.mock_client.projects.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={'presentation_url': None}
        )
        
        url = service.get_presentation_url(self.test_project_id)
        
        self.assertIsNone(url)
    
    def test_is_judge_returns_true_for_judge(self):
        """is_judge should return True for judge role."""
        service = PresentationViewService(self.mock_client, self.test_judge_id, 'judge')
        
        self.assertTrue(service.is_judge())
    
    def test_is_judge_returns_false_for_other_roles(self):
        """is_judge should return False for non-judge roles."""
        service_student = PresentationViewService(self.mock_client, self.test_judge_id, 'student')
        service_manager = PresentationViewService(self.mock_client, self.test_judge_id, 'department_manager')
        
        self.assertFalse(service_student.is_judge())
        self.assertFalse(service_manager.is_judge())
    
    # Invalid/Unauthorized Actions
    
    def test_student_cannot_view_judge_assignments(self):
        """Student should not be able to access judge assignment views."""
        service = PresentationViewService(self.mock_client, 'student-id', 'student')
        
        with self.assertRaises(PermissionError) as context:
            service.get_assigned_projects()
        
        self.assertIn("Only judges", str(context.exception))
    
    def test_department_manager_cannot_use_judge_view(self):
        """Department manager should not be able to use judge-specific view methods."""
        service = PresentationViewService(self.mock_client, 'manager-id', 'department_manager')
        
        with self.assertRaises(PermissionError):
            service.get_assigned_projects()
    
    def test_judge_cannot_view_unassigned_project(self):
        """Judge should not be able to view projects they're not assigned to."""
        service = PresentationViewService(self.mock_client, self.test_judge_id, 'judge')
        
        self.mock_client.judge_assignments.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[]
        )
        
        with self.assertRaises(PermissionError) as context:
            service.get_presentation_url(self.test_project_id)
        
        self.assertIn("not assigned", str(context.exception))
    
    def test_judge_cannot_get_details_of_unassigned_project(self):
        """Judge should not be able to get details of unassigned project."""
        service = PresentationViewService(self.mock_client, self.test_judge_id, 'judge')
        
        self.mock_client.judge_assignments.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[]
        )
        
        with self.assertRaises(PermissionError):
            service.get_project_details('unassigned-project-id')


if __name__ == '__main__':
    unittest.main()
