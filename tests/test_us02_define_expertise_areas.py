# User Story 2: As a Conference Manager, I want to define areas of expertise.
# Role: Conference Manager (department_manager)

import unittest
from unittest.mock import MagicMock


class MockSupabaseClient:
    """Mock Supabase client for testing."""
    
    def __init__(self):
        self.conferences = MagicMock()
        self.profiles = MagicMock()
    
    def from_(self, table_name):
        if table_name == 'conferences':
            return self.conferences
        elif table_name == 'profiles':
            return self.profiles
        return MagicMock()


class ExpertiseAreaService:
    """Service class representing expertise area management logic."""
    
    ADMIN_ROLES = ['department_manager']
    
    def __init__(self, supabase_client, current_user_role):
        self.client = supabase_client
        self.current_user_role = current_user_role
    
    def is_admin(self):
        return self.current_user_role in self.ADMIN_ROLES
    
    def add_expertise_area_to_conference(self, conference_id, expertise_area):
        if not self.is_admin():
            raise PermissionError("Only admins can define expertise areas")
        if not expertise_area or not expertise_area.strip():
            raise ValueError("Expertise area cannot be empty")
        if len(expertise_area) > 100:
            raise ValueError("Expertise area name too long")
        
        # Get current expertise areas
        conference = self.client.from_('conferences').select('expertise_areas').eq('id', conference_id).single().execute()
        current_areas = conference.data.get('expertise_areas', []) or []
        
        if expertise_area in current_areas:
            raise ValueError("Expertise area already exists")
        
        updated_areas = current_areas + [expertise_area]
        result = self.client.from_('conferences').update({
            'expertise_areas': updated_areas
        }).eq('id', conference_id).execute()
        
        return result
    
    def remove_expertise_area_from_conference(self, conference_id, expertise_area):
        if not self.is_admin():
            raise PermissionError("Only admins can modify expertise areas")
        
        conference = self.client.from_('conferences').select('expertise_areas').eq('id', conference_id).single().execute()
        current_areas = conference.data.get('expertise_areas', []) or []
        
        if expertise_area not in current_areas:
            raise ValueError("Expertise area not found")
        
        updated_areas = [area for area in current_areas if area != expertise_area]
        result = self.client.from_('conferences').update({
            'expertise_areas': updated_areas
        }).eq('id', conference_id).execute()
        
        return result
    
    def get_expertise_areas(self, conference_id):
        conference = self.client.from_('conferences').select('expertise_areas').eq('id', conference_id).single().execute()
        return conference.data.get('expertise_areas', []) or []
    
    def assign_expertise_to_judge(self, user_id, expertise_areas):
        if not self.is_admin():
            raise PermissionError("Only admins can assign expertise to judges")
        if not isinstance(expertise_areas, list):
            raise ValueError("Expertise areas must be a list")
        
        result = self.client.from_('profiles').update({
            'expertise_areas': expertise_areas
        }).eq('user_id', user_id).execute()
        
        return result


class TestDefineExpertiseAreas(unittest.TestCase):
    """Test cases for User Story 2: Define areas of expertise."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.mock_client = MockSupabaseClient()
        self.test_conference_id = 'conf-uuid-123'
        self.test_user_id = 'user-uuid-456'
    
    # Happy Path Tests
    
    def test_department_manager_can_add_expertise_area(self):
        """Department manager should be able to add a new expertise area."""
        service = ExpertiseAreaService(self.mock_client, 'department_manager')
        
        self.mock_client.conferences.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={'expertise_areas': ['AI', 'Machine Learning']}
        )
        self.mock_client.conferences.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[{}])
        
        result = service.add_expertise_area_to_conference(self.test_conference_id, 'Cybersecurity')
        
        self.assertIsNotNone(result)
        self.mock_client.conferences.update.assert_called_once()
    
    def test_admin_can_remove_expertise_area(self):
        """Admin should be able to remove an existing expertise area."""
        service = ExpertiseAreaService(self.mock_client, 'department_manager')
        
        self.mock_client.conferences.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={'expertise_areas': ['AI', 'Machine Learning', 'Cybersecurity']}
        )
        self.mock_client.conferences.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[{}])
        
        result = service.remove_expertise_area_from_conference(self.test_conference_id, 'AI')
        
        self.assertIsNotNone(result)
    
    def test_admin_can_assign_expertise_to_judge(self):
        """Admin should be able to assign expertise areas to a judge."""
        service = ExpertiseAreaService(self.mock_client, 'department_manager')
        
        self.mock_client.profiles.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[{}])
        
        result = service.assign_expertise_to_judge(self.test_user_id, ['AI', 'Machine Learning'])
        
        self.assertIsNotNone(result)
        self.mock_client.profiles.update.assert_called_once()
    
    def test_get_expertise_areas_returns_list(self):
        """Getting expertise areas should return a list."""
        service = ExpertiseAreaService(self.mock_client, 'department_manager')
        
        self.mock_client.conferences.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={'expertise_areas': ['AI', 'Data Science']}
        )
        
        areas = service.get_expertise_areas(self.test_conference_id)
        
        self.assertIsInstance(areas, list)
        self.assertEqual(len(areas), 2)
    
    # Edge Cases
    
    def test_add_to_empty_expertise_list(self):
        """Adding to an empty expertise list should work."""
        service = ExpertiseAreaService(self.mock_client, 'department_manager')
        
        self.mock_client.conferences.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={'expertise_areas': None}
        )
        self.mock_client.conferences.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[{}])
        
        result = service.add_expertise_area_to_conference(self.test_conference_id, 'First Area')
        
        self.assertIsNotNone(result)
    
    def test_get_expertise_areas_empty_returns_empty_list(self):
        """Getting expertise areas when none exist should return empty list."""
        service = ExpertiseAreaService(self.mock_client, 'department_manager')
        
        self.mock_client.conferences.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={'expertise_areas': None}
        )
        
        areas = service.get_expertise_areas(self.test_conference_id)
        
        self.assertEqual(areas, [])
    
    # Invalid/Unauthorized Actions
    
    def test_judge_cannot_add_expertise_area(self):
        """Judge should not be able to add expertise areas."""
        service = ExpertiseAreaService(self.mock_client, 'judge')
        
        with self.assertRaises(PermissionError) as context:
            service.add_expertise_area_to_conference(self.test_conference_id, 'AI')
        
        self.assertIn("Only admins", str(context.exception))
    
    def test_student_cannot_add_expertise_area(self):
        """Student should not be able to add expertise areas."""
        service = ExpertiseAreaService(self.mock_client, 'student')
        
        with self.assertRaises(PermissionError):
            service.add_expertise_area_to_conference(self.test_conference_id, 'AI')
    
    def test_empty_expertise_area_raises_error(self):
        """Adding an empty expertise area should raise ValueError."""
        service = ExpertiseAreaService(self.mock_client, 'department_manager')
        
        with self.assertRaises(ValueError) as context:
            service.add_expertise_area_to_conference(self.test_conference_id, '')
        
        self.assertIn("cannot be empty", str(context.exception))
    
    def test_whitespace_expertise_area_raises_error(self):
        """Adding a whitespace-only expertise area should raise ValueError."""
        service = ExpertiseAreaService(self.mock_client, 'department_manager')
        
        with self.assertRaises(ValueError):
            service.add_expertise_area_to_conference(self.test_conference_id, '   ')
    
    def test_duplicate_expertise_area_raises_error(self):
        """Adding a duplicate expertise area should raise ValueError."""
        service = ExpertiseAreaService(self.mock_client, 'department_manager')
        
        self.mock_client.conferences.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={'expertise_areas': ['AI', 'Machine Learning']}
        )
        
        with self.assertRaises(ValueError) as context:
            service.add_expertise_area_to_conference(self.test_conference_id, 'AI')
        
        self.assertIn("already exists", str(context.exception))
    
    def test_remove_nonexistent_expertise_area_raises_error(self):
        """Removing a non-existent expertise area should raise ValueError."""
        service = ExpertiseAreaService(self.mock_client, 'department_manager')
        
        self.mock_client.conferences.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={'expertise_areas': ['AI']}
        )
        
        with self.assertRaises(ValueError) as context:
            service.remove_expertise_area_from_conference(self.test_conference_id, 'Nonexistent')
        
        self.assertIn("not found", str(context.exception))
    
    def test_too_long_expertise_area_raises_error(self):
        """Adding an expertise area that's too long should raise ValueError."""
        service = ExpertiseAreaService(self.mock_client, 'department_manager')
        
        long_name = 'A' * 101
        with self.assertRaises(ValueError) as context:
            service.add_expertise_area_to_conference(self.test_conference_id, long_name)
        
        self.assertIn("too long", str(context.exception))
    
    def test_assign_expertise_with_invalid_type_raises_error(self):
        """Assigning expertise with non-list type should raise ValueError."""
        service = ExpertiseAreaService(self.mock_client, 'department_manager')
        
        with self.assertRaises(ValueError):
            service.assign_expertise_to_judge(self.test_user_id, 'single string')


if __name__ == '__main__':
    unittest.main()
