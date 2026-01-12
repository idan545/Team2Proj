# User Story 4: As a Judge, I want to submit an evaluation.
# Role: Judge

import unittest
from unittest.mock import MagicMock
from datetime import datetime


class MockSupabaseClient:
    """Mock Supabase client for testing."""
    
    def __init__(self):
        self.evaluations = MagicMock()
        self.evaluation_scores = MagicMock()
        self.evaluation_criteria = MagicMock()
        self.judge_assignments = MagicMock()
    
    def from_(self, table_name):
        if table_name == 'evaluations':
            return self.evaluations
        elif table_name == 'evaluation_scores':
            return self.evaluation_scores
        elif table_name == 'evaluation_criteria':
            return self.evaluation_criteria
        elif table_name == 'judge_assignments':
            return self.judge_assignments
        return MagicMock()


class EvaluationService:
    """Service class representing evaluation submission logic."""
    
    def __init__(self, supabase_client, current_user_id, current_user_role):
        self.client = supabase_client
        self.current_user_id = current_user_id
        self.current_user_role = current_user_role
    
    def is_judge(self):
        return self.current_user_role == 'judge'
    
    def is_assigned_to_project(self, project_id):
        result = self.client.from_('judge_assignments').select(
            'id'
        ).eq('judge_id', self.current_user_id).eq('project_id', project_id).execute()
        return len(result.data) > 0
    
    def get_criteria_for_project(self, conference_id):
        result = self.client.from_('evaluation_criteria').select(
            '*'
        ).eq('conference_id', conference_id).order('sort_order').execute()
        return result.data
    
    def create_or_update_evaluation(self, project_id, scores, general_notes=None, is_complete=False):
        if not self.is_judge():
            raise PermissionError("Only judges can submit evaluations")
        
        if not self.is_assigned_to_project(project_id):
            raise PermissionError("Judge is not assigned to this project")
        
        # Validate scores
        if not scores or not isinstance(scores, dict):
            raise ValueError("Scores must be provided as a dictionary")
        
        for criterion_id, score_data in scores.items():
            score = score_data.get('score', 0)
            max_score = score_data.get('max_score', 10)
            if score < 0 or score > max_score:
                raise ValueError(f"Score must be between 0 and {max_score}")
        
        # Check for existing evaluation
        existing = self.client.from_('evaluations').select(
            'id'
        ).eq('judge_id', self.current_user_id).eq('project_id', project_id).execute()
        
        if existing.data:
            evaluation_id = existing.data[0]['id']
            self.client.from_('evaluations').update({
                'general_notes': general_notes,
                'is_complete': is_complete,
                'updated_at': datetime.now().isoformat()
            }).eq('id', evaluation_id).execute()
        else:
            result = self.client.from_('evaluations').insert({
                'judge_id': self.current_user_id,
                'project_id': project_id,
                'general_notes': general_notes,
                'is_complete': is_complete
            }).execute()
            evaluation_id = result.data[0]['id']
        
        # Upsert scores
        for criterion_id, score_data in scores.items():
            self.client.from_('evaluation_scores').upsert({
                'evaluation_id': evaluation_id,
                'criterion_id': criterion_id,
                'score': score_data.get('score'),
                'notes': score_data.get('notes')
            }).execute()
        
        return evaluation_id
    
    def save_draft(self, project_id, scores, general_notes=None):
        return self.create_or_update_evaluation(project_id, scores, general_notes, is_complete=False)
    
    def submit_evaluation(self, project_id, scores, general_notes=None):
        if not scores:
            raise ValueError("Cannot submit empty evaluation")
        return self.create_or_update_evaluation(project_id, scores, general_notes, is_complete=True)
    
    def get_evaluation(self, project_id):
        if not self.is_judge():
            raise PermissionError("Only judges can view their evaluations")
        
        result = self.client.from_('evaluations').select(
            '*, evaluation_scores(*)'
        ).eq('judge_id', self.current_user_id).eq('project_id', project_id).execute()
        
        return result.data[0] if result.data else None


class TestJudgeSubmitEvaluation(unittest.TestCase):
    """Test cases for User Story 4: Judge submits evaluation."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.mock_client = MockSupabaseClient()
        self.test_judge_id = 'judge-uuid-123'
        self.test_project_id = 'project-uuid-456'
        self.test_criterion_id = 'criterion-uuid-789'
        
        # Default mock for assignment check
        self.mock_client.judge_assignments.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{'id': 'assignment-1'}]
        )
    
    # Happy Path Tests
    
    def test_judge_can_submit_complete_evaluation(self):
        """Judge should be able to submit a complete evaluation."""
        service = EvaluationService(self.mock_client, self.test_judge_id, 'judge')
        
        self.mock_client.evaluations.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[]
        )
        self.mock_client.evaluations.insert.return_value.execute.return_value = MagicMock(
            data=[{'id': 'eval-1'}]
        )
        self.mock_client.evaluation_scores.upsert.return_value.execute.return_value = MagicMock()
        
        scores = {
            self.test_criterion_id: {'score': 8, 'max_score': 10, 'notes': 'Great work'}
        }
        
        eval_id = service.submit_evaluation(self.test_project_id, scores, 'Excellent project!')
        
        self.assertEqual(eval_id, 'eval-1')
        self.mock_client.evaluations.insert.assert_called_once()
    
    def test_judge_can_save_draft_evaluation(self):
        """Judge should be able to save a draft evaluation."""
        service = EvaluationService(self.mock_client, self.test_judge_id, 'judge')
        
        self.mock_client.evaluations.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[]
        )
        self.mock_client.evaluations.insert.return_value.execute.return_value = MagicMock(
            data=[{'id': 'eval-draft'}]
        )
        self.mock_client.evaluation_scores.upsert.return_value.execute.return_value = MagicMock()
        
        scores = {
            self.test_criterion_id: {'score': 5, 'max_score': 10}
        }
        
        eval_id = service.save_draft(self.test_project_id, scores)
        
        self.assertEqual(eval_id, 'eval-draft')
    
    def test_judge_can_update_existing_evaluation(self):
        """Judge should be able to update an existing evaluation."""
        service = EvaluationService(self.mock_client, self.test_judge_id, 'judge')
        
        self.mock_client.evaluations.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{'id': 'existing-eval'}]
        )
        self.mock_client.evaluations.update.return_value.eq.return_value.execute.return_value = MagicMock()
        self.mock_client.evaluation_scores.upsert.return_value.execute.return_value = MagicMock()
        
        scores = {
            self.test_criterion_id: {'score': 9, 'max_score': 10}
        }
        
        eval_id = service.submit_evaluation(self.test_project_id, scores)
        
        self.assertEqual(eval_id, 'existing-eval')
        self.mock_client.evaluations.update.assert_called_once()
    
    def test_judge_can_add_notes_per_criterion(self):
        """Judge should be able to add notes for each criterion."""
        service = EvaluationService(self.mock_client, self.test_judge_id, 'judge')
        
        self.mock_client.evaluations.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[]
        )
        self.mock_client.evaluations.insert.return_value.execute.return_value = MagicMock(
            data=[{'id': 'eval-1'}]
        )
        upsert_mock = MagicMock()
        self.mock_client.evaluation_scores.upsert.return_value.execute = upsert_mock
        
        scores = {
            'criterion-1': {'score': 8, 'max_score': 10, 'notes': 'Innovative approach'},
            'criterion-2': {'score': 7, 'max_score': 10, 'notes': 'Good presentation'}
        }
        
        service.submit_evaluation(self.test_project_id, scores, 'Overall excellent!')
        
        # Verify upsert was called for each criterion
        self.assertEqual(self.mock_client.evaluation_scores.upsert.call_count, 2)
    
    def test_judge_can_get_own_evaluation(self):
        """Judge should be able to retrieve their own evaluation."""
        service = EvaluationService(self.mock_client, self.test_judge_id, 'judge')
        
        self.mock_client.evaluations.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{
                'id': 'eval-1',
                'is_complete': True,
                'general_notes': 'Great project',
                'evaluation_scores': [{'criterion_id': 'c1', 'score': 8}]
            }]
        )
        
        evaluation = service.get_evaluation(self.test_project_id)
        
        self.assertIsNotNone(evaluation)
        self.assertTrue(evaluation['is_complete'])
    
    # Edge Cases
    
    def test_get_nonexistent_evaluation_returns_none(self):
        """Getting a non-existent evaluation should return None."""
        service = EvaluationService(self.mock_client, self.test_judge_id, 'judge')
        
        self.mock_client.evaluations.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[]
        )
        
        evaluation = service.get_evaluation(self.test_project_id)
        
        self.assertIsNone(evaluation)
    
    def test_score_at_minimum_boundary(self):
        """Score at minimum (0) should be valid."""
        service = EvaluationService(self.mock_client, self.test_judge_id, 'judge')
        
        self.mock_client.evaluations.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[]
        )
        self.mock_client.evaluations.insert.return_value.execute.return_value = MagicMock(
            data=[{'id': 'eval-1'}]
        )
        self.mock_client.evaluation_scores.upsert.return_value.execute.return_value = MagicMock()
        
        scores = {
            self.test_criterion_id: {'score': 0, 'max_score': 10}
        }
        
        eval_id = service.submit_evaluation(self.test_project_id, scores)
        
        self.assertIsNotNone(eval_id)
    
    def test_score_at_maximum_boundary(self):
        """Score at maximum should be valid."""
        service = EvaluationService(self.mock_client, self.test_judge_id, 'judge')
        
        self.mock_client.evaluations.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[]
        )
        self.mock_client.evaluations.insert.return_value.execute.return_value = MagicMock(
            data=[{'id': 'eval-1'}]
        )
        self.mock_client.evaluation_scores.upsert.return_value.execute.return_value = MagicMock()
        
        scores = {
            self.test_criterion_id: {'score': 10, 'max_score': 10}
        }
        
        eval_id = service.submit_evaluation(self.test_project_id, scores)
        
        self.assertIsNotNone(eval_id)
    
    # Invalid/Unauthorized Actions
    
    def test_student_cannot_submit_evaluation(self):
        """Student should not be able to submit evaluations."""
        service = EvaluationService(self.mock_client, 'student-id', 'student')
        
        scores = {self.test_criterion_id: {'score': 5, 'max_score': 10}}
        
        with self.assertRaises(PermissionError) as context:
            service.submit_evaluation(self.test_project_id, scores)
        
        self.assertIn("Only judges", str(context.exception))
    
    def test_manager_cannot_submit_evaluation_as_judge(self):
        """Manager should not be able to submit evaluations using judge method."""
        service = EvaluationService(self.mock_client, 'manager-id', 'department_manager')
        
        scores = {self.test_criterion_id: {'score': 5, 'max_score': 10}}
        
        with self.assertRaises(PermissionError):
            service.submit_evaluation(self.test_project_id, scores)
    
    def test_judge_cannot_evaluate_unassigned_project(self):
        """Judge should not be able to evaluate projects they're not assigned to."""
        service = EvaluationService(self.mock_client, self.test_judge_id, 'judge')
        
        self.mock_client.judge_assignments.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[]
        )
        
        scores = {self.test_criterion_id: {'score': 5, 'max_score': 10}}
        
        with self.assertRaises(PermissionError) as context:
            service.submit_evaluation('unassigned-project', scores)
        
        self.assertIn("not assigned", str(context.exception))
    
    def test_score_below_zero_raises_error(self):
        """Score below 0 should raise ValueError."""
        service = EvaluationService(self.mock_client, self.test_judge_id, 'judge')
        
        scores = {self.test_criterion_id: {'score': -1, 'max_score': 10}}
        
        with self.assertRaises(ValueError) as context:
            service.submit_evaluation(self.test_project_id, scores)
        
        self.assertIn("between 0 and", str(context.exception))
    
    def test_score_above_max_raises_error(self):
        """Score above max_score should raise ValueError."""
        service = EvaluationService(self.mock_client, self.test_judge_id, 'judge')
        
        scores = {self.test_criterion_id: {'score': 15, 'max_score': 10}}
        
        with self.assertRaises(ValueError):
            service.submit_evaluation(self.test_project_id, scores)
    
    def test_empty_scores_raises_error_on_submit(self):
        """Submitting with empty scores should raise ValueError."""
        service = EvaluationService(self.mock_client, self.test_judge_id, 'judge')
        
        with self.assertRaises(ValueError) as context:
            service.submit_evaluation(self.test_project_id, {})
        
        self.assertIn("Cannot submit empty", str(context.exception))
    
    def test_none_scores_raises_error(self):
        """Submitting with None scores should raise ValueError."""
        service = EvaluationService(self.mock_client, self.test_judge_id, 'judge')
        
        with self.assertRaises(ValueError):
            service.submit_evaluation(self.test_project_id, None)
    
    def test_non_judge_cannot_get_evaluations(self):
        """Non-judge should not be able to get evaluations."""
        service = EvaluationService(self.mock_client, 'other-id', 'student')
        
        with self.assertRaises(PermissionError):
            service.get_evaluation(self.test_project_id)


if __name__ == '__main__':
    unittest.main()
