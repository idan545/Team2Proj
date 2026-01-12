# User Story 1: As a Conference Manager, I want to assign a role to a judge in the system.
# Role: Conference Manager (department_manager)

import unittest
from unittest.mock import MagicMock, patch


class MockSupabaseClient:
    """Mock Supabase client for testing."""
    
    def __init__(self):
        self.user_roles = MagicMock()
        self.profiles = MagicMock()
    
    def from_(self, table_name):
        if table_name == 'user_roles':
            return self.user_roles
        elif table_name == 'profiles':
            return self.profiles
        return MagicMock()


class RoleAssignmentService:
    """Service class representing the role assignment logic."""
    
    VALID_ROLES = ['judge', 'department_manager', 'student']
    ADMIN_ROLES = ['department_manager']
    
    def __init__(self, supabase_client, current_user_role):
        self.client = supabase_client
        self.current_user_role = current_user_role
    
    def is_admin(self):
        return self.current_user_role in self.ADMIN_ROLES
    
    def can_assign_role(self, target_role):
        if not self.is_admin():
            return False
        # Department manager can assign all roles
        return target_role in self.VALID_ROLES
    
    def assign_role(self, user_id, role):
        if not self.is_admin():
            raise PermissionError("Only admins can assign roles")
        if role not in self.VALID_ROLES:
            raise ValueError(f"Invalid role: {role}")
        if not self.can_assign_role(role):
            raise PermissionError(f"Cannot assign role: {role}")
        
        # Delete existing role
        self.client.from_('user_roles').delete().eq('user_id', user_id).execute()
        # Insert new role
        result = self.client.from_('user_roles').insert({
            'user_id': user_id,
            'role': role
        }).execute()
        return result


class TestAssignRoleToJudge(unittest.TestCase):
    """Test cases for User Story 1: Assign role to judge."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.mock_client = MockSupabaseClient()
        self.test_user_id = 'test-user-uuid-123'
    
    # Happy Path Tests
    
    def test_department_manager_can_assign_judge_role(self):
        """Department manager should be able to assign judge role successfully."""
        service = RoleAssignmentService(self.mock_client, 'department_manager')
        
        self.mock_client.user_roles.delete.return_value.eq.return_value.execute.return_value = MagicMock()
        self.mock_client.user_roles.insert.return_value.execute.return_value = MagicMock(data=[{'role': 'judge'}])
        
        result = service.assign_role(self.test_user_id, 'judge')
        
        self.mock_client.user_roles.insert.assert_called_once()
        self.assertIsNotNone(result)
    
    def test_department_manager_can_assign_student_role(self):
        """Department manager should be able to assign student role."""
        service = RoleAssignmentService(self.mock_client, 'department_manager')
        
        self.mock_client.user_roles.delete.return_value.eq.return_value.execute.return_value = MagicMock()
        self.mock_client.user_roles.insert.return_value.execute.return_value = MagicMock(data=[{'role': 'student'}])
        
        result = service.assign_role(self.test_user_id, 'student')
        
        self.assertIsNotNone(result)
    
    def test_department_manager_can_assign_any_valid_role(self):
        """Department manager should be able to assign any valid role."""
        service = RoleAssignmentService(self.mock_client, 'department_manager')
        
        for role in ['judge', 'student', 'department_manager']:
            self.mock_client.user_roles.delete.return_value.eq.return_value.execute.return_value = MagicMock()
            self.mock_client.user_roles.insert.return_value.execute.return_value = MagicMock(data=[{'role': role}])
            
            result = service.assign_role(self.test_user_id, role)
            self.assertIsNotNone(result)
    
    # Edge Cases
    
    def test_assign_role_replaces_existing_role(self):
        """Assigning a new role should remove the previous role."""
        service = RoleAssignmentService(self.mock_client, 'department_manager')
        
        delete_mock = MagicMock()
        self.mock_client.user_roles.delete.return_value.eq.return_value.execute = delete_mock
        self.mock_client.user_roles.insert.return_value.execute.return_value = MagicMock()
        
        service.assign_role(self.test_user_id, 'judge')
        
        # Verify delete was called before insert
        self.mock_client.user_roles.delete.assert_called_once()
    
    # Invalid/Unauthorized Actions
    
    def test_judge_cannot_assign_roles(self):
        """Judge should not be able to assign roles."""
        service = RoleAssignmentService(self.mock_client, 'judge')
        
        with self.assertRaises(PermissionError) as context:
            service.assign_role(self.test_user_id, 'judge')
        
        self.assertIn("Only admins", str(context.exception))
    
    def test_student_cannot_assign_roles(self):
        """Student should not be able to assign roles."""
        service = RoleAssignmentService(self.mock_client, 'student')
        
        with self.assertRaises(PermissionError):
            service.assign_role(self.test_user_id, 'judge')
    
    def test_invalid_role_raises_error(self):
        """Assigning an invalid role should raise ValueError."""
        service = RoleAssignmentService(self.mock_client, 'department_manager')
        
        with self.assertRaises(ValueError) as context:
            service.assign_role(self.test_user_id, 'invalid_role')
        
        self.assertIn("Invalid role", str(context.exception))
    
    def test_is_admin_returns_true_for_department_manager(self):
        """is_admin should return True for department_manager role."""
        service = RoleAssignmentService(self.mock_client, 'department_manager')
        
        self.assertTrue(service.is_admin())
    
    def test_is_admin_returns_false_for_non_admins(self):
        """is_admin should return False for non-admin roles."""
        service_judge = RoleAssignmentService(self.mock_client, 'judge')
        service_student = RoleAssignmentService(self.mock_client, 'student')
        
        self.assertFalse(service_judge.is_admin())
        self.assertFalse(service_student.is_admin())


if __name__ == '__main__':
    unittest.main()
