from datetime import date, timedelta
from django.core.management.base import BaseCommand
from leave.models import LeaveBalance, LeaveRequest, Team, User

class Command(BaseCommand):
    help = 'Crea account e richieste dimostrative idempotenti.'
    def handle(self, *args, **options):
        team, _ = Team.objects.get_or_create(name='Product Studio')
        specs = [
            ('employee', 'Demo', 'Employee', User.Role.EMPLOYEE),
            ('teammate', 'Demo', 'Teammate', User.Role.EMPLOYEE),
            ('manager', 'Demo', 'Manager', User.Role.MANAGER),
            ('admin', 'Demo', 'Admin', User.Role.ADMIN),
        ]
        users = {}
        for username, first, last, role in specs:
            user, _ = User.objects.get_or_create(username=username)
            user.first_name, user.last_name, user.role, user.team = first, last, role, team
            user.email = f'{username}@example.invalid'; user.set_password('demo1234')
            user.is_staff = role == User.Role.ADMIN
            user.is_superuser = role == User.Role.ADMIN
            user.save()
            LeaveBalance.objects.update_or_create(user=user, defaults={'allowance': 26, 'year': 2026})
            users[username] = user
        LeaveRequest.objects.all().delete(); today = date.today()
        LeaveRequest.objects.create(employee=users['employee'], leave_type='vacation', start_date=today+timedelta(days=18), end_date=today+timedelta(days=22), note='Cinque giorni in montagna')
        LeaveRequest.objects.create(employee=users['employee'], leave_type='permit', start_date=today-timedelta(days=25), end_date=today-timedelta(days=25), note='Visita medica', status='approved', decided_by=users['manager'])
        LeaveRequest.objects.create(employee=users['teammate'], leave_type='vacation', start_date=today+timedelta(days=8), end_date=today+timedelta(days=10), note='Ponte lungo')
        self.stdout.write(self.style.SUCCESS('Demo pronta: employee / manager / admin · password demo1234'))
