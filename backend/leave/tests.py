from datetime import date
from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIClient

from .models import LeaveBalance, LeaveRequest, Team, User
from .events import build_leave_event


class HealthApiTests(TestCase):
    def test_health_endpoint_reports_ok(self):
        response = self.client.get('/health/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'status': 'ok'})


class LeaveRequestApiTests(TestCase):
    def setUp(self):
        self.team = Team.objects.create(name='Product')
        self.employee = User.objects.create_user('employee', password='demo1234', team=self.team)
        self.manager = User.objects.create_user(
            'manager', password='demo1234', team=self.team, role=User.Role.MANAGER
        )
        LeaveBalance.objects.create(user=self.employee, allowance=26)
        self.client = APIClient()

    @patch('leave.views.publish_leave_event')
    def test_employee_can_create_request(self, publish):
        self.client.force_authenticate(self.employee)
        response = self.client.post('/api/requests/', {
            'leave_type': 'vacation', 'start_date': '2026-08-10', 'end_date': '2026-08-14'
        }, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['business_days'], 5)
        publish.assert_called_once()
        self.assertEqual(publish.call_args.args[1], 'leave.requested')

    def test_overlapping_request_is_rejected(self):
        LeaveRequest.objects.create(
            employee=self.employee, start_date=date(2026, 8, 10), end_date=date(2026, 8, 14)
        )
        self.client.force_authenticate(self.employee)
        response = self.client.post('/api/requests/', {
            'leave_type': 'vacation', 'start_date': '2026-08-13', 'end_date': '2026-08-17'
        }, format='json')
        self.assertEqual(response.status_code, 400)

    @patch('leave.views.publish_leave_event')
    def test_manager_can_approve_team_request(self, publish):
        item = LeaveRequest.objects.create(
            employee=self.employee, start_date=date(2026, 9, 1), end_date=date(2026, 9, 2)
        )
        self.client.force_authenticate(self.manager)
        response = self.client.post(
            f'/api/requests/{item.pk}/decision/', {'status': 'approved'}, format='json'
        )
        self.assertEqual(response.status_code, 200)
        item.refresh_from_db()
        self.assertEqual(item.status, LeaveRequest.Status.APPROVED)
        publish.assert_called_once()
        self.assertEqual(publish.call_args.args[1], 'leave.approved')

    def test_employee_cannot_decide_request(self):
        item = LeaveRequest.objects.create(
            employee=self.employee, start_date=date(2026, 10, 1), end_date=date(2026, 10, 2)
        )
        self.client.force_authenticate(self.employee)
        response = self.client.post(
            f'/api/requests/{item.pk}/decision/', {'status': 'approved'}, format='json'
        )
        self.assertEqual(response.status_code, 403)

    def test_manager_cannot_decide_twice(self):
        item = LeaveRequest.objects.create(
            employee=self.employee, start_date=date(2026, 11, 2), end_date=date(2026, 11, 3),
            status=LeaveRequest.Status.APPROVED,
        )
        self.client.force_authenticate(self.manager)
        response = self.client.post(
            f'/api/requests/{item.pk}/decision/', {'status': 'rejected'}, format='json'
        )
        self.assertEqual(response.status_code, 409)

    def test_team_endpoint_returns_only_members(self):
        outsider_team = Team.objects.create(name='Operations')
        User.objects.create_user('outsider', password='demo1234', team=outsider_team)
        self.client.force_authenticate(self.employee)
        response = self.client.get('/api/team/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual({member['username'] for member in response.data}, {'employee', 'manager'})

    def test_requested_event_targets_team_manager(self):
        item = LeaveRequest.objects.create(
            employee=self.employee, start_date=date(2026, 12, 1), end_date=date(2026, 12, 2)
        )
        event = build_leave_event(item, 'leave.requested', self.employee)
        self.assertEqual(event['recipients'], [self.manager.id])
        self.assertEqual(event['request']['employee_name'], self.employee.display_name)

    def test_decision_event_targets_employee(self):
        item = LeaveRequest.objects.create(
            employee=self.employee, start_date=date(2026, 12, 7), end_date=date(2026, 12, 8),
            status=LeaveRequest.Status.APPROVED,
        )
        event = build_leave_event(item, 'leave.approved', self.manager)
        self.assertEqual(event['recipients'], [self.employee.id])

# Create your tests here.
