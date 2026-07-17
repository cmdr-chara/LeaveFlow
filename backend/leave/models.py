from datetime import timedelta

from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.db import models


class Team(models.Model):
    name = models.CharField(max_length=80, unique=True)

    def __str__(self):
        return self.name


class User(AbstractUser):
    class Role(models.TextChoices):
        EMPLOYEE = 'employee', 'Dipendente'
        MANAGER = 'manager', 'Responsabile'
        ADMIN = 'admin', 'Amministratore'

    role = models.CharField(max_length=16, choices=Role.choices, default=Role.EMPLOYEE)
    team = models.ForeignKey(Team, null=True, blank=True, on_delete=models.SET_NULL, related_name='members')

    @property
    def display_name(self):
        return self.get_full_name() or self.username


class LeaveBalance(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='leave_balance')
    allowance = models.PositiveSmallIntegerField(default=26)
    year = models.PositiveSmallIntegerField(default=2026)

    @property
    def approved_days(self):
        return sum(
            request.business_days
            for request in self.user.leave_requests.filter(status=LeaveRequest.Status.APPROVED)
        )

    @property
    def available_days(self):
        return self.allowance - self.approved_days


class LeaveRequest(models.Model):
    class Type(models.TextChoices):
        VACATION = 'vacation', 'Ferie'
        PERMIT = 'permit', 'Permesso'
        PERSONAL = 'personal', 'Personale'

    class Status(models.TextChoices):
        PENDING = 'pending', 'In attesa'
        APPROVED = 'approved', 'Approvata'
        REJECTED = 'rejected', 'Rifiutata'

    employee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='leave_requests')
    leave_type = models.CharField(max_length=16, choices=Type.choices, default=Type.VACATION)
    start_date = models.DateField()
    end_date = models.DateField()
    note = models.CharField(max_length=280, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    decided_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='decisions')
    decided_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    @property
    def business_days(self):
        current = self.start_date
        days = 0
        while current <= self.end_date:
            if current.weekday() < 5:
                days += 1
            current += timedelta(days=1)
        return days

    def clean(self):
        if self.end_date < self.start_date:
            raise ValidationError({'end_date': 'La data finale non può precedere quella iniziale.'})
        overlap = LeaveRequest.objects.filter(
            employee=self.employee,
            status__in=[self.Status.PENDING, self.Status.APPROVED],
            start_date__lte=self.end_date,
            end_date__gte=self.start_date,
        ).exclude(pk=self.pk)
        if overlap.exists():
            raise ValidationError('Esiste già una richiesta sovrapposta.')

    def __str__(self):
        return f'{self.employee} · {self.start_date}–{self.end_date}'

# Create your models here.
