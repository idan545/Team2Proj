# User Story 7: As a Student, I want to upload a file.
# Role: Student

import unittest
from unittest.mock import MagicMock, patch


class MockSupabaseClient:
    """Mock Supabase client for testing."""
    
    def __init__(self):
        self.projects = MagicMock()
        self.storage = MagicMock()
        self.profiles = MagicMock()
        self.user_roles = MagicMock()
    
    def from_(self, table_name):
        tables = {
            'projects': self.projects,
            'profiles': self.profiles,
            'user_roles': self.user_roles
        }
        return tables.get(table_name, MagicMock())


class MockFile:
    """Mock file object for testing."""
    
    def __init__(self, name, content, size, content_type):
        self.name = name
        self.content = content
        self.size = size
        self.type = content_type


class FileUploadService:
    """Service class representing file upload logic for students."""
    
    ALLOWED_TYPES = ['application/pdf', 'application/vnd.ms-powerpoint', 
                     'application/vnd.openxmlformats-officedocument.presentationml.presentation']
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
    
    def __init__(self, supabase_client, current_user_id, current_user_role):
        self.client = supabase_client
        self.current_user_id = current_user_id
        self.current_user_role = current_user_role
    
    def is_student(self):
        return self.current_user_role == 'student'
    
    def is_team_member(self, project_id):
        # Get user's full name from profile
        profile = self.client.from_('profiles').select(
            'full_name'
        ).eq('user_id', self.current_user_id).single().execute()
        
        if not profile.data:
            return False
        
        user_name = profile.data.get('full_name')
        
        # Get project team members
        project = self.client.from_('projects').select(
            'team_members'
        ).eq('id', project_id).single().execute()
        
        if not project.data:
            return False
        
        team_members = project.data.get('team_members', []) or []
        return user_name in team_members
    
    def validate_file(self, file):
        if not file:
            raise ValueError("No file provided")
        
        if file.type not in self.ALLOWED_TYPES:
            raise ValueError(f"File type not allowed. Allowed types: PDF, PPT, PPTX")
        
        if file.size > self.MAX_FILE_SIZE:
            raise ValueError(f"File too large. Maximum size: 50MB")
        
        if not file.name:
            raise ValueError("File must have a name")
        
        return True
    
    def upload_presentation(self, project_id, file):
        if not self.is_student():
            raise PermissionError("Only students can upload presentations")
        
        if not self.is_team_member(project_id):
            raise PermissionError("Only team members can upload presentations for this project")
        
        self.validate_file(file)
        
        # Generate unique file path
        file_path = f"presentations/{project_id}/{file.name}"
        
        # Upload to storage
        upload_result = self.client.storage.from_('presentations').upload(
            file_path, file.content
        )
        
        if hasattr(upload_result, 'error') and upload_result.error:
            raise RuntimeError("Failed to upload file")
        
        # Get public URL
        public_url = self.client.storage.from_('presentations').get_public_url(file_path)
        
        # Update project with presentation URL
        self.client.from_('projects').update({
            'presentation_url': public_url
        }).eq('id', project_id).execute()
        
        return {
            'file_path': file_path,
            'public_url': public_url
        }
    
    def delete_presentation(self, project_id):
        if not self.is_student():
            raise PermissionError("Only students can delete presentations")
        
        if not self.is_team_member(project_id):
            raise PermissionError("Only team members can delete presentations")
        
        # Get current presentation URL
        project = self.client.from_('projects').select(
            'presentation_url'
        ).eq('id', project_id).single().execute()
        
        if not project.data.get('presentation_url'):
            raise ValueError("No presentation to delete")
        
        # Extract file path from URL
        url = project.data['presentation_url']
        file_path = url.split('/presentations/')[-1] if '/presentations/' in url else None
        
        if file_path:
            self.client.storage.from_('presentations').remove([f"presentations/{file_path}"])
        
        # Clear presentation URL in project
        self.client.from_('projects').update({
            'presentation_url': None
        }).eq('id', project_id).execute()
        
        return True
    
    def get_student_projects(self):
        if not self.is_student():
            raise PermissionError("Only students can view their projects")
        
        # Get user's full name
        profile = self.client.from_('profiles').select(
            'full_name'
        ).eq('user_id', self.current_user_id).single().execute()
        
        if not profile.data:
            return []
        
        user_name = profile.data.get('full_name')
        
        # Get projects where user is a team member
        projects = self.client.from_('projects').select('*').execute()
        
        # Filter projects where user is in team_members
        return [p for p in projects.data if user_name in (p.get('team_members', []) or [])]


class TestStudentUploadFile(unittest.TestCase):
    """Test cases for User Story 7: Student uploads file."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.mock_client = MockSupabaseClient()
        self.test_student_id = 'student-uuid-123'
        self.test_project_id = 'project-uuid-456'
        
        # Setup common mocks
        self.mock_client.profiles.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={'full_name': 'John Student'}
        )
        self.mock_client.projects.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={'team_members': ['John Student', 'Jane Partner']}
        )
    
    def _create_mock_file(self, name='presentation.pdf', size=1024, 
                          content_type='application/pdf'):
        return MockFile(name, b'file content', size, content_type)
    
    # Happy Path Tests
    
    def test_student_can_upload_pdf(self):
        """Student team member should be able to upload PDF."""
        service = FileUploadService(self.mock_client, self.test_student_id, 'student')
        
        self.mock_client.storage.from_.return_value.upload.return_value = MagicMock(error=None)
        self.mock_client.storage.from_.return_value.get_public_url.return_value = 'https://storage.example.com/file.pdf'
        self.mock_client.projects.update.return_value.eq.return_value.execute.return_value = MagicMock()
        
        file = self._create_mock_file()
        result = service.upload_presentation(self.test_project_id, file)
        
        self.assertIn('public_url', result)
        self.assertIn('file_path', result)
    
    def test_student_can_upload_pptx(self):
        """Student should be able to upload PowerPoint files."""
        service = FileUploadService(self.mock_client, self.test_student_id, 'student')
        
        self.mock_client.storage.from_.return_value.upload.return_value = MagicMock(error=None)
        self.mock_client.storage.from_.return_value.get_public_url.return_value = 'https://storage.example.com/file.pptx'
        self.mock_client.projects.update.return_value.eq.return_value.execute.return_value = MagicMock()
        
        file = self._create_mock_file(
            name='slides.pptx',
            content_type='application/vnd.openxmlformats-officedocument.presentationml.presentation'
        )
        result = service.upload_presentation(self.test_project_id, file)
        
        self.assertIsNotNone(result)
    
    def test_student_can_delete_presentation(self):
        """Student should be able to delete their presentation."""
        service = FileUploadService(self.mock_client, self.test_student_id, 'student')
        
        self.mock_client.projects.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={
                'team_members': ['John Student'],
                'presentation_url': 'https://storage.example.com/presentations/proj-1/file.pdf'
            }
        )
        self.mock_client.storage.from_.return_value.remove.return_value = MagicMock()
        self.mock_client.projects.update.return_value.eq.return_value.execute.return_value = MagicMock()
        
        result = service.delete_presentation(self.test_project_id)
        
        self.assertTrue(result)
    
    def test_student_can_view_own_projects(self):
        """Student should be able to view their projects."""
        service = FileUploadService(self.mock_client, self.test_student_id, 'student')
        
        self.mock_client.projects.select.return_value.execute.return_value = MagicMock(
            data=[
                {'id': 'proj-1', 'title_en': 'My Project', 'team_members': ['John Student']},
                {'id': 'proj-2', 'title_en': 'Other Project', 'team_members': ['Someone Else']}
            ]
        )
        
        projects = service.get_student_projects()
        
        self.assertEqual(len(projects), 1)
        self.assertEqual(projects[0]['title_en'], 'My Project')
    
    def test_validate_file_passes_for_valid_pdf(self):
        """Validation should pass for valid PDF files."""
        service = FileUploadService(self.mock_client, self.test_student_id, 'student')
        file = self._create_mock_file()
        
        self.assertTrue(service.validate_file(file))
    
    def test_is_team_member_returns_true_for_member(self):
        """is_team_member should return True for actual team members."""
        service = FileUploadService(self.mock_client, self.test_student_id, 'student')
        
        result = service.is_team_member(self.test_project_id)
        
        self.assertTrue(result)
    
    # Edge Cases
    
    def test_upload_replaces_existing_presentation(self):
        """Uploading should work even if presentation already exists."""
        service = FileUploadService(self.mock_client, self.test_student_id, 'student')
        
        self.mock_client.storage.from_.return_value.upload.return_value = MagicMock(error=None)
        self.mock_client.storage.from_.return_value.get_public_url.return_value = 'https://storage.example.com/new-file.pdf'
        self.mock_client.projects.update.return_value.eq.return_value.execute.return_value = MagicMock()
        
        file = self._create_mock_file(name='new-presentation.pdf')
        result = service.upload_presentation(self.test_project_id, file)
        
        self.assertIn('new-presentation.pdf', result['file_path'])
    
    def test_student_with_no_projects_gets_empty_list(self):
        """Student with no projects should get empty list."""
        service = FileUploadService(self.mock_client, self.test_student_id, 'student')
        
        self.mock_client.projects.select.return_value.execute.return_value = MagicMock(data=[])
        
        projects = service.get_student_projects()
        
        self.assertEqual(projects, [])
    
    def test_file_at_max_size_limit(self):
        """File at exactly max size should be valid."""
        service = FileUploadService(self.mock_client, self.test_student_id, 'student')
        file = self._create_mock_file(size=50 * 1024 * 1024)  # Exactly 50MB
        
        self.assertTrue(service.validate_file(file))
    
    # Invalid/Unauthorized Actions
    
    def test_judge_cannot_upload_file(self):
        """Judge should not be able to upload files."""
        service = FileUploadService(self.mock_client, 'judge-id', 'judge')
        file = self._create_mock_file()
        
        with self.assertRaises(PermissionError) as context:
            service.upload_presentation(self.test_project_id, file)
        
        self.assertIn("Only students", str(context.exception))
    
    def test_manager_cannot_upload_file(self):
        """Manager should not be able to upload files via student upload."""
        service = FileUploadService(self.mock_client, 'manager-id', 'department_manager')
        file = self._create_mock_file()
        
        with self.assertRaises(PermissionError):
            service.upload_presentation(self.test_project_id, file)
    
    def test_non_team_member_cannot_upload(self):
        """Student who is not a team member cannot upload."""
        service = FileUploadService(self.mock_client, self.test_student_id, 'student')
        
        # Override to make user not a team member
        self.mock_client.projects.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={'team_members': ['Other Person']}
        )
        
        file = self._create_mock_file()
        
        with self.assertRaises(PermissionError) as context:
            service.upload_presentation(self.test_project_id, file)
        
        self.assertIn("Only team members", str(context.exception))
    
    def test_invalid_file_type_raises_error(self):
        """Invalid file type should raise ValueError."""
        service = FileUploadService(self.mock_client, self.test_student_id, 'student')
        file = self._create_mock_file(name='malware.exe', content_type='application/x-msdownload')
        
        with self.assertRaises(ValueError) as context:
            service.validate_file(file)
        
        self.assertIn("File type not allowed", str(context.exception))
    
    def test_file_too_large_raises_error(self):
        """File exceeding max size should raise ValueError."""
        service = FileUploadService(self.mock_client, self.test_student_id, 'student')
        file = self._create_mock_file(size=51 * 1024 * 1024)  # 51MB
        
        with self.assertRaises(ValueError) as context:
            service.validate_file(file)
        
        self.assertIn("File too large", str(context.exception))
    
    def test_empty_file_raises_error(self):
        """Empty/null file should raise ValueError."""
        service = FileUploadService(self.mock_client, self.test_student_id, 'student')
        
        with self.assertRaises(ValueError) as context:
            service.validate_file(None)
        
        self.assertIn("No file provided", str(context.exception))
    
    def test_delete_nonexistent_presentation_raises_error(self):
        """Deleting non-existent presentation should raise ValueError."""
        service = FileUploadService(self.mock_client, self.test_student_id, 'student')
        
        self.mock_client.projects.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={'team_members': ['John Student'], 'presentation_url': None}
        )
        
        with self.assertRaises(ValueError) as context:
            service.delete_presentation(self.test_project_id)
        
        self.assertIn("No presentation to delete", str(context.exception))
    
    def test_non_student_cannot_view_projects(self):
        """Non-student should not be able to use student project view."""
        service = FileUploadService(self.mock_client, 'manager-id', 'department_manager')
        
        with self.assertRaises(PermissionError):
            service.get_student_projects()


if __name__ == '__main__':
    unittest.main()
