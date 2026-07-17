from django.urls import path

from . import views

urlpatterns = [
    path('auth/login/', views.login_view),
    path('me/', views.me_view),
    path('dashboard/', views.dashboard_view),
    path('team/', views.team_view),
    path('requests/', views.requests_view),
    path('requests/<int:request_id>/decision/', views.decide_request),
]
