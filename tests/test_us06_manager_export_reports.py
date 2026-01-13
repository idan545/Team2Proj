# User Story 6: As a Conference Manager, I want to export reports.
# Role: Conference Manager (department_manager)

import unittest
from unittest.mock import MagicMock, patch
import csv
import io


class MockSupabaseClient:
    """Mock Supabase client for testing."""
    
    def __init__(self):
        self.projects = MagicMock()
        self.evaluations = MagicMock()
        self.evaluation_scores = MagicMock()
    
    def from_(self, table_name):
        tables = {
            'projects': self.projects,
            'evaluations': self.evaluations,
            'evaluation_scores': self.evaluation_scores
        }
        return tables.get(table_name, MagicMock())


class ReportExportService:
    """Service class representing report export logic."""
    
    ADMIN_ROLES = ['department_manager']
    SUPPORTED_FORMATS = ['csv', 'pdf']
    
    def __init__(self, supabase_client, current_user_role):
        self.client = supabase_client
        self.current_user_role = current_user_role
    
    def is_admin(self):
        return self.current_user_role in self.ADMIN_ROLES
    
    def get_report_data(self, conference_id):
        if not self.is_admin():
            raise PermissionError("Only admins can access report data")
        
        projects = self.client.from_('projects').select('*').eq('conference_id', conference_id).execute()
        
        report_data = []
        for project in projects.data:
            evaluations = self.client.from_('evaluations').select(
                '*, evaluation_scores(*)'
            ).eq('project_id', project['id']).eq('is_complete', True).execute()
            
            all_scores = []
            for evaluation in evaluations.data:
                scores = evaluation.get('evaluation_scores', [])
                for score in scores:
                    all_scores.append(score.get('score', 0))
            
            avg_score = sum(all_scores) / len(all_scores) if all_scores else 0
            
            report_data.append({
                'rank': 0,  # Will be calculated after sorting
                'title_en': project.get('title_en', ''),
                'title_he': project.get('title_he', ''),
                'room': project.get('room', ''),
                'team_members': ', '.join(project.get('team_members', []) or []),
                'evaluation_count': len(evaluations.data),
                'average_score': round(avg_score, 2)
            })
        
        # Sort by score and assign ranks
        report_data.sort(key=lambda x: x['average_score'], reverse=True)
        for i, item in enumerate(report_data):
            item['rank'] = i + 1
        
        return report_data
    
    def export_to_csv(self, conference_id):
        if not self.is_admin():
            raise PermissionError("Only admins can export reports")
        
        data = self.get_report_data(conference_id)
        
        if not data:
            raise ValueError("No data to export")
        
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=data[0].keys())
        writer.writeheader()
        writer.writerows(data)
        
        return output.getvalue()
    
    def export_to_pdf(self, conference_id):
        if not self.is_admin():
            raise PermissionError("Only admins can export reports")
        
        data = self.get_report_data(conference_id)
        
        if not data:
            raise ValueError("No data to export")
        
        # In a real implementation, this would generate a PDF
        # Here we just return metadata indicating PDF generation
        return {
            'format': 'pdf',
            'row_count': len(data),
            'generated': True
        }
    
    def validate_export_format(self, export_format):
        if export_format not in self.SUPPORTED_FORMATS:
            raise ValueError(f"Unsupported format: {export_format}. Supported: {self.SUPPORTED_FORMATS}")
        return True
    
    def export(self, conference_id, export_format='csv'):
        self.validate_export_format(export_format)
        
        if export_format == 'csv':
            return self.export_to_csv(conference_id)
        elif export_format == 'pdf':
            return self.export_to_pdf(conference_id)


class TestManagerExportReports(unittest.TestCase):
    """Test cases for User Story 6: Manager exports reports."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.mock_client = MockSupabaseClient()
        self.test_conference_id = 'conf-uuid-123'
    
    def _setup_mock_data(self):
        """Helper to set up common mock data."""
        self.mock_client.projects.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[
                {'id': 'proj-1', 'title_en': 'AI Project', 'title_he': 'פרויקט AI', 
                 'room': 'A101', 'team_members': ['John', 'Jane']},
                {'id': 'proj-2', 'title_en': 'Web App', 'title_he': 'אפליקציית ווב',
                 'room': 'B202', 'team_members': ['Bob']}
            ]
        )
        self.mock_client.evaluations.select.return_value.eq.return_value.eq.return_value.execute.side_effect = [
            MagicMock(data=[
                {'is_complete': True, 'evaluation_scores': [{'score': 9}, {'score': 8}]}
            ]),
            MagicMock(data=[
                {'is_complete': True, 'evaluation_scores': [{'score': 7}, {'score': 6}]}
            ])
        ]
    
    # Happy Path Tests
    
    def test_department_head_can_export_csv(self):
        """Department head should be able to export CSV report."""
        service = ReportExportService(self.mock_client, 'department_head')
        self._setup_mock_data()
        
        csv_output = service.export_to_csv(self.test_conference_id)
        
        self.assertIn('rank', csv_output)
        self.assertIn('title_en', csv_output)
        self.assertIn('AI Project', csv_output)
    
    def test_department_manager_can_export_csv(self):
        """Department manager should be able to export CSV report."""
        service = ReportExportService(self.mock_client, 'department_manager')
        self._setup_mock_data()
        
        csv_output = service.export_to_csv(self.test_conference_id)
        
        self.assertIsNotNone(csv_output)
    
    def test_admin_can_export_pdf(self):
        """Admin should be able to export PDF report."""
        service = ReportExportService(self.mock_client, 'department_head')
        self._setup_mock_data()
        
        pdf_result = service.export_to_pdf(self.test_conference_id)
        
        self.assertEqual(pdf_result['format'], 'pdf')
        self.assertTrue(pdf_result['generated'])
        self.assertEqual(pdf_result['row_count'], 2)
    
    def test_export_generic_method_csv(self):
        """Generic export method should work with CSV format."""
        service = ReportExportService(self.mock_client, 'department_head')
        self._setup_mock_data()
        
        result = service.export(self.test_conference_id, 'csv')
        
        self.assertIn('title_en', result)
    
    def test_export_generic_method_pdf(self):
        """Generic export method should work with PDF format."""
        service = ReportExportService(self.mock_client, 'department_head')
        self._setup_mock_data()
        
        result = service.export(self.test_conference_id, 'pdf')
        
        self.assertEqual(result['format'], 'pdf')
    
    def test_csv_contains_all_required_fields(self):
        """CSV export should contain all required fields."""
        service = ReportExportService(self.mock_client, 'department_head')
        self._setup_mock_data()
        
        csv_output = service.export_to_csv(self.test_conference_id)
        
        required_fields = ['rank', 'title_en', 'title_he', 'room', 'team_members', 
                          'evaluation_count', 'average_score']
        for field in required_fields:
            self.assertIn(field, csv_output)
    
    def test_projects_ranked_by_score(self):
        """Projects should be ranked by average score descending."""
        service = ReportExportService(self.mock_client, 'department_head')
        self._setup_mock_data()
        
        data = service.get_report_data(self.test_conference_id)
        
        # AI Project (avg 8.5) should rank higher than Web App (avg 6.5)
        self.assertEqual(data[0]['title_en'], 'AI Project')
        self.assertEqual(data[0]['rank'], 1)
        self.assertEqual(data[1]['title_en'], 'Web App')
        self.assertEqual(data[1]['rank'], 2)
    
    def test_team_members_formatted_correctly(self):
        """Team members should be comma-separated in export."""
        service = ReportExportService(self.mock_client, 'department_head')
        self._setup_mock_data()
        
        data = service.get_report_data(self.test_conference_id)
        
        # Find AI Project
        ai_project = next(d for d in data if d['title_en'] == 'AI Project')
        self.assertEqual(ai_project['team_members'], 'John, Jane')
    
    # Edge Cases
    
    def test_export_with_no_projects(self):
        """Export with no projects should raise ValueError."""
        service = ReportExportService(self.mock_client, 'department_head')
        
        self.mock_client.projects.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[]
        )
        
        with self.assertRaises(ValueError) as context:
            service.export_to_csv(self.test_conference_id)
        
        self.assertIn("No data", str(context.exception))
    
    def test_project_with_no_evaluations(self):
        """Project with no evaluations should have zero average."""
        service = ReportExportService(self.mock_client, 'department_head')
        
        self.mock_client.projects.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{'id': 'proj-1', 'title_en': 'New Project', 'team_members': None}]
        )
        self.mock_client.evaluations.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[]
        )
        
        data = service.get_report_data(self.test_conference_id)
        
        self.assertEqual(data[0]['average_score'], 0)
        self.assertEqual(data[0]['evaluation_count'], 0)
    
    def test_project_with_null_team_members(self):
        """Project with null team members should handle gracefully."""
        service = ReportExportService(self.mock_client, 'department_head')
        
        self.mock_client.projects.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{'id': 'proj-1', 'title_en': 'Solo Project', 'team_members': None, 'room': None}]
        )
        self.mock_client.evaluations.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[]
        )
        
        data = service.get_report_data(self.test_conference_id)
        
        self.assertEqual(data[0]['team_members'], '')
    
    def test_validate_export_format_valid(self):
        """Valid export formats should pass validation."""
        service = ReportExportService(self.mock_client, 'department_head')
        
        self.assertTrue(service.validate_export_format('csv'))
        self.assertTrue(service.validate_export_format('pdf'))
    
    # Invalid/Unauthorized Actions
    
    def test_judge_cannot_export_reports(self):
        """Judge should not be able to export reports."""
        service = ReportExportService(self.mock_client, 'judge')
        
        with self.assertRaises(PermissionError) as context:
            service.export_to_csv(self.test_conference_id)
        
        self.assertIn("Only admins", str(context.exception))
    
    def test_student_cannot_export_reports(self):
        """Student should not be able to export reports."""
        service = ReportExportService(self.mock_client, 'student')
        
        with self.assertRaises(PermissionError):
            service.export_to_csv(self.test_conference_id)
    
    def test_judge_cannot_access_report_data(self):
        """Judge should not be able to access raw report data."""
        service = ReportExportService(self.mock_client, 'judge')
        
        with self.assertRaises(PermissionError):
            service.get_report_data(self.test_conference_id)
    
    def test_invalid_export_format_raises_error(self):
        """Invalid export format should raise ValueError."""
        service = ReportExportService(self.mock_client, 'department_head')
        
        with self.assertRaises(ValueError) as context:
            service.validate_export_format('xlsx')
        
        self.assertIn("Unsupported format", str(context.exception))
    
    def test_export_with_unsupported_format(self):
        """Export with unsupported format should raise ValueError."""
        service = ReportExportService(self.mock_client, 'department_head')
        
        with self.assertRaises(ValueError):
            service.export(self.test_conference_id, 'json')


if __name__ == '__main__':
    unittest.main()
