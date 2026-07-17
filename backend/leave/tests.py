from datetime import date

from django.test import TestCase
from rest_framework.test import APIClient

from .models import LeaveBalance, LeaveRequest, Team, User


class LeaveRequestApiTests(TestCase):
    def setUp(self):
        self.team = Team.objects.create(name='Product')
        self.employee = User.objects.create_user('employee', password='demo1234', team=self.team)
        self.manager = User.objects.create_user(
            'manager', password='demo1234', team=self.team, role=User.Role.MANAGER
        )
        LeaveBalance.objects.create(user=self.employee, allowance=26)
        self.client = APIClient()

    def test_employee_can_create_request(self):
        self.client.force_authenticate(self.employee)
        response = self.client.post('/api/requests/', {
            'leave_type': 'vacation', 'start_date': '2026-08-10', 'end_date': '2026-08-14'
        }, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['business_days'], 5)

    def test_overlapping_request_is_rejected(self):
        LeaveRequest.objects.create(
            employee=self.employee, start_date=date(2026, 8, 10), end_date=date(2026, 8, 14)
        )
        self.client.force_authenticate(self.employee)
        response = self.client.post('/api/requests/', {
            'leave_type': 'vacation', 'start_date': '2026-08-13', 'end_date': '2026-08-17'
        }, format='json')
        self.assertEqual(response.status_code, 400)

    def test_manager_can_approve_team_request(self):
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

# Create your tests here.
