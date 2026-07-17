from django.contrib.auth import authenticate
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import LeaveRequest, User
from .serializers import LeaveRequestSerializer, UserSerializer


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    user = authenticate(username=request.data.get('username'), password=request.data.get('password'))
    if not user:
        return Response({'detail': 'Credenziali non valide.'}, status=status.HTTP_400_BAD_REQUEST)
    token, _ = Token.objects.get_or_create(user=user)
    return Response({'token': token.key, 'user': UserSerializer(user).data})


@api_view(['GET'])
def me_view(request):
    return Response(UserSerializer(request.user).data)


def visible_requests(user):
    if user.role == User.Role.ADMIN:
        return LeaveRequest.objects.all()
    if user.role == User.Role.MANAGER and user.team_id:
        return LeaveRequest.objects.filter(employee__team=user.team)
    return LeaveRequest.objects.filter(employee=user)


@api_view(['GET', 'POST'])
def requests_view(request):
    if request.method == 'POST':
        serializer = LeaveRequestSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    serializer = LeaveRequestSerializer(visible_requests(request.user), many=True)
    return Response(serializer.data)


@api_view(['POST'])
def decide_request(request, request_id):
    if request.user.role not in [User.Role.MANAGER, User.Role.ADMIN]:
        return Response({'detail': 'Operazione non consentita.'}, status=status.HTTP_403_FORBIDDEN)
    item = get_object_or_404(visible_requests(request.user), pk=request_id)
    if item.employee_id == request.user.id:
        return Response({'detail': 'Non puoi decidere una tua richiesta.'}, status=status.HTTP_403_FORBIDDEN)
    if item.status != LeaveRequest.Status.PENDING:
        return Response({'detail': 'La richiesta è già stata decisa.'}, status=status.HTTP_409_CONFLICT)
    decision = request.data.get('status')
    if decision not in [LeaveRequest.Status.APPROVED, LeaveRequest.Status.REJECTED]:
        return Response({'detail': 'Decisione non valida.'}, status=status.HTTP_400_BAD_REQUEST)
    item.status = decision
    item.decided_by = request.user
    item.decided_at = timezone.now()
    item.save(update_fields=['status', 'decided_by', 'decided_at'])
    return Response(LeaveRequestSerializer(item).data)


@api_view(['GET'])
def dashboard_view(request):
    requests = visible_requests(request.user)
    balance = getattr(request.user, 'leave_balance', None)
    return Response({
        'balance': {
            'allowance': balance.allowance if balance else 0,
            'used': balance.approved_days if balance else 0,
            'available': balance.available_days if balance else 0,
        },
        'counts': requests.aggregate(
            total=Count('id'),
            pending=Count('id', filter=Q(status=LeaveRequest.Status.PENDING)),
            approved=Count('id', filter=Q(status=LeaveRequest.Status.APPROVED)),
        ),
        'recent': LeaveRequestSerializer(requests[:5], many=True).data,
    })


@api_view(['GET'])
def team_view(request):
    if not request.user.team_id:
        return Response([])
    members = request.user.team.members.select_related('leave_balance').order_by('role', 'first_name')
    data = []
    for member in members:
        balance = getattr(member, 'leave_balance', None)
        next_leave = member.leave_requests.filter(
            status=LeaveRequest.Status.APPROVED,
            end_date__gte=timezone.localdate(),
        ).order_by('start_date').first()
        data.append({
            **UserSerializer(member).data,
            'available_days': balance.available_days if balance else 0,
            'allowance': balance.allowance if balance else 0,
            'next_leave': {
                'start_date': next_leave.start_date,
                'end_date': next_leave.end_date,
            } if next_leave else None,
        })
    return Response(data)
