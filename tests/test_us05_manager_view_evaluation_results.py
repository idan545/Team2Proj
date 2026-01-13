# User Story 5: As a Conference Manager, I want to view evaluation results.
# Role: Conference Manager (department_manager)

import unittest
from unittest.mock import MagicMock


class MockSupabaseClient:
    """Mock Supabase client for testing."""
    
    def __init__(self):
        self.evaluations = MagicMock()
        self.evaluation_scores = MagicMock()
        self.projects = MagicMock()
        self.profiles = MagicMock()
        self.evaluation_criteria = MagicMock()
    
    def from_(self, table_name):
        tables = {
            'evaluations': self.evaluations,
            'evaluation_scores': self.evaluation_scores,
            'projects': self.projects,
            'profiles': self.profiles,
            'evaluation_criteria': self.evaluation_criteria
        }
        return tables.get(table_name, MagicMock())


class EvaluationResultsService:
    """Service class representing evaluation results viewing logic for managers."""
    
    ADMIN_ROLES = ['department_manager']
    
    def __init__(self, supabase_client, current_user_role):
        self.client = supabase_client
        self.current_user_role = current_user_role
    
    def is_admin(self):
        return self.current_user_role in self.ADMIN_ROLES
    
    def get_all_evaluations(self, conference_id):
        if not self.is_admin():
            raise PermissionError("Only admins can view all evaluation results")
        
        projects = self.client.from_('projects').select(
            'id, title_en, title_he'
        ).eq('conference_id', conference_id).execute()
        
        project_ids = [p['id'] for p in projects.data]
        
        if not project_ids:
            return []
        
        evaluations = self.client.from_('evaluations').select(
            '*, evaluation_scores(*), profiles!judge_id(full_name)'
        ).in_('project_id', project_ids).execute()
        
        return evaluations.data
    
    def get_project_evaluations(self, project_id):
        if not self.is_admin():
            raise PermissionError("Only admins can view project evaluations")
        
        evaluations = self.client.from_('evaluations').select(
            '*, evaluation_scores(*)'
        ).eq('project_id', project_id).execute()
        
        return evaluations.data
    
    def get_evaluation_summary(self, conference_id):
        if not self.is_admin():
            raise PermissionError("Only admins can view evaluation summary")
        
        evaluations = self.get_all_evaluations(conference_id)
        
        total = len(evaluations)
        complete = sum(1 for e in evaluations if e.get('is_complete'))
        pending = total - complete
        
        return {
            'total': total,
            'complete': complete,
            'pending': pending,
            'completion_percentage': (complete / total * 100) if total > 0 else 0
        }
    
    def get_project_average_scores(self, conference_id):
        if not self.is_admin():
            raise PermissionError("Only admins can view average scores")
        
        projects = self.client.from_('projects').select('*').eq('conference_id', conference_id).execute()
        
        results = []
        for project in projects.data:
            evaluations = self.client.from_('evaluations').select(
                '*, evaluation_scores(*)'
            ).eq('project_id', project['id']).eq('is_complete', True).execute()
            
            if not evaluations.data:
                continue
            
            all_scores = []
            for evaluation in evaluations.data:
                scores = evaluation.get('evaluation_scores', [])
                for score in scores:
                    all_scores.append(score.get('score', 0))
            
            avg_score = sum(all_scores) / len(all_scores) if all_scores else 0
            
            results.append({
                'project_id': project['id'],
                'title_en': project.get('title_en'),
                'title_he': project.get('title_he'),
                'average_score': round(avg_score, 2),
                'evaluation_count': len(evaluations.data)
            })
        
        # Sort by average score descending
        results.sort(key=lambda x: x['average_score'], reverse=True)
        
        return results
    
    def get_judge_evaluation_status(self, conference_id):
        if not self.is_admin():
            raise PermissionError("Only admins can view judge status")
        
        evaluations = self.get_all_evaluations(conference_id)
        
        judge_stats = {}
        for evaluation in evaluations:
            judge_id = evaluation.get('judge_id')
            if judge_id not in judge_stats:
                judge_stats[judge_id] = {'complete': 0, 'pending': 0}
            
            if evaluation.get('is_complete'):
                judge_stats[judge_id]['complete'] += 1
            else:
                judge_stats[judge_id]['pending'] += 1
        
        return judge_stats


class TestManagerViewEvaluationResults(unittest.TestCase):
    """Test cases for User Story 5: Manager views evaluation results."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.mock_client = MockSupabaseClient()
        self.test_conference_id = 'conf-uuid-123'
        self.test_project_id = 'project-uuid-456'
    
    # Happy Path Tests
    
    def test_department_head_can_view_all_evaluations(self):
        """Department head should be able to view all evaluations."""
        service = EvaluationResultsService(self.mock_client, 'department_head')
        
        self.mock_client.projects.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{'id': 'proj-1'}, {'id': 'proj-2'}]
        )
        self.mock_client.evaluations.select.return_value.in_.return_value.execute.return_value = MagicMock(
            data=[
                {'id': 'eval-1', 'project_id': 'proj-1', 'is_complete': True},
                {'id': 'eval-2', 'project_id': 'proj-2', 'is_complete': False}
            ]
        )
        
        evaluations = service.get_all_evaluations(self.test_conference_id)
        
        self.assertEqual(len(evaluations), 2)
    
    def test_department_manager_can_view_all_evaluations(self):
        """Department manager should be able to view all evaluations."""
        service = EvaluationResultsService(self.mock_client, 'department_manager')
        
        self.mock_client.projects.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{'id': 'proj-1'}]
        )
        self.mock_client.evaluations.select.return_value.in_.return_value.execute.return_value = MagicMock(
            data=[{'id': 'eval-1', 'project_id': 'proj-1'}]
        )
        
        evaluations = service.get_all_evaluations(self.test_conference_id)
        
        self.assertIsNotNone(evaluations)
    
    def test_admin_can_view_project_specific_evaluations(self):
        """Admin should be able to view evaluations for a specific project."""
        service = EvaluationResultsService(self.mock_client, 'department_head')
        
        self.mock_client.evaluations.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[
                {'id': 'eval-1', 'judge_id': 'judge-1', 'is_complete': True},
                {'id': 'eval-2', 'judge_id': 'judge-2', 'is_complete': True}
            ]
        )
        
        evaluations = service.get_project_evaluations(self.test_project_id)
        
        self.assertEqual(len(evaluations), 2)
    
    def test_admin_can_get_evaluation_summary(self):
        """Admin should be able to get evaluation summary statistics."""
        service = EvaluationResultsService(self.mock_client, 'department_head')
        
        self.mock_client.projects.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{'id': 'proj-1'}]
        )
        self.mock_client.evaluations.select.return_value.in_.return_value.execute.return_value = MagicMock(
            data=[
                {'is_complete': True},
                {'is_complete': True},
                {'is_complete': False}
            ]
        )
        
        summary = service.get_evaluation_summary(self.test_conference_id)
        
        self.assertEqual(summary['total'], 3)
        self.assertEqual(summary['complete'], 2)
        self.assertEqual(summary['pending'], 1)
        self.assertAlmostEqual(summary['completion_percentage'], 66.67, places=1)
    
    def test_admin_can_get_project_average_scores(self):
        """Admin should be able to get average scores for projects."""
        service = EvaluationResultsService(self.mock_client, 'department_head')
        
        self.mock_client.projects.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{'id': 'proj-1', 'title_en': 'Project 1', 'title_he': 'פרויקט 1'}]
        )
        self.mock_client.evaluations.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[
                {'is_complete': True, 'evaluation_scores': [{'score': 8}, {'score': 7}]},
                {'is_complete': True, 'evaluation_scores': [{'score': 9}, {'score': 8}]}
            ]
        )
        
        results = service.get_project_average_scores(self.test_conference_id)
        
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['title_en'], 'Project 1')
        self.assertEqual(results[0]['average_score'], 8.0)
    
    def test_admin_can_view_judge_evaluation_status(self):
        """Admin should be able to see each judge's evaluation status."""
        service = EvaluationResultsService(self.mock_client, 'department_head')
        
        self.mock_client.projects.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{'id': 'proj-1'}]
        )
        self.mock_client.evaluations.select.return_value.in_.return_value.execute.return_value = MagicMock(
            data=[
                {'judge_id': 'judge-1', 'is_complete': True},
                {'judge_id': 'judge-1', 'is_complete': False},
                {'judge_id': 'judge-2', 'is_complete': True}
            ]
        )
        
        status = service.get_judge_evaluation_status(self.test_conference_id)
        
        self.assertEqual(status['judge-1']['complete'], 1)
        self.assertEqual(status['judge-1']['pending'], 1)
        self.assertEqual(status['judge-2']['complete'], 1)
    
    # Edge Cases
    
    def test_conference_with_no_projects_returns_empty(self):
        """Conference with no projects should return empty list."""
        service = EvaluationResultsService(self.mock_client, 'department_head')
        
        self.mock_client.projects.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[]
        )
        
        evaluations = service.get_all_evaluations(self.test_conference_id)
        
        self.assertEqual(evaluations, [])
    
    def test_summary_with_no_evaluations(self):
        """Summary with no evaluations should handle zero division."""
        service = EvaluationResultsService(self.mock_client, 'department_head')
        
        self.mock_client.projects.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[]
        )
        
        summary = service.get_evaluation_summary(self.test_conference_id)
        
        self.assertEqual(summary['total'], 0)
        self.assertEqual(summary['completion_percentage'], 0)
    
    def test_project_with_no_complete_evaluations(self):
        """Project with no complete evaluations should be excluded from averages."""
        service = EvaluationResultsService(self.mock_client, 'department_head')
        
        self.mock_client.projects.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{'id': 'proj-1', 'title_en': 'Project 1'}]
        )
        self.mock_client.evaluations.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[]
        )
        
        results = service.get_project_average_scores(self.test_conference_id)
        
        self.assertEqual(len(results), 0)
    
    def test_scores_sorted_by_average_descending(self):
        """Project scores should be sorted by average descending."""
        service = EvaluationResultsService(self.mock_client, 'department_head')
        
        self.mock_client.projects.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[
                {'id': 'proj-1', 'title_en': 'Low Score'},
                {'id': 'proj-2', 'title_en': 'High Score'}
            ]
        )
        
        # First call for proj-1 (low score)
        # Second call for proj-2 (high score)
        self.mock_client.evaluations.select.return_value.eq.return_value.eq.return_value.execute.side_effect = [
            MagicMock(data=[{'is_complete': True, 'evaluation_scores': [{'score': 5}]}]),
            MagicMock(data=[{'is_complete': True, 'evaluation_scores': [{'score': 9}]}])
        ]
        
        results = service.get_project_average_scores(self.test_conference_id)
        
        self.assertEqual(results[0]['title_en'], 'High Score')
        self.assertEqual(results[1]['title_en'], 'Low Score')
    
    # Invalid/Unauthorized Actions
    
    def test_judge_cannot_view_all_evaluations(self):
        """Judge should not be able to view all evaluations."""
        service = EvaluationResultsService(self.mock_client, 'judge')
        
        with self.assertRaises(PermissionError) as context:
            service.get_all_evaluations(self.test_conference_id)
        
        self.assertIn("Only admins", str(context.exception))
    
    def test_student_cannot_view_evaluation_results(self):
        """Student should not be able to view evaluation results."""
        service = EvaluationResultsService(self.mock_client, 'student')
        
        with self.assertRaises(PermissionError):
            service.get_all_evaluations(self.test_conference_id)
    
    def test_judge_cannot_view_project_evaluations(self):
        """Judge should not be able to view all evaluations for a project."""
        service = EvaluationResultsService(self.mock_client, 'judge')
        
        with self.assertRaises(PermissionError):
            service.get_project_evaluations(self.test_project_id)
    
    def test_student_cannot_view_summary(self):
        """Student should not be able to view evaluation summary."""
        service = EvaluationResultsService(self.mock_client, 'student')
        
        with self.assertRaises(PermissionError):
            service.get_evaluation_summary(self.test_conference_id)
    
    def test_judge_cannot_view_average_scores(self):
        """Judge should not be able to view project average scores."""
        service = EvaluationResultsService(self.mock_client, 'judge')
        
        with self.assertRaises(PermissionError):
            service.get_project_average_scores(self.test_conference_id)


if __name__ == '__main__':
    unittest.main()
