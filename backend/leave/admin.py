from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import LeaveBalance, LeaveRequest, Team, User


@admin.register(User)
class LeaveFlowUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (('LeaveFlow', {'fields': ('role', 'team')}),)
    list_display = ('username', 'email', 'role', 'team', 'is_staff')


admin.site.register(Team)
admin.site.register(LeaveBalance)
admin.site.register(LeaveRequest)

# Register your models here.
