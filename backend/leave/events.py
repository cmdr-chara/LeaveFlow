import json
import logging
from uuid import uuid4

from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from redis import Redis

from .models import LeaveRequest, User


logger = logging.getLogger(__name__)
STREAM_NAME = 'leaveflow:events'


def build_leave_event(item: LeaveRequest, event_type: str, actor: User) -> dict:
    if event_type == 'leave.requested':
        recipients = list(
            User.objects.filter(
                Q(role=User.Role.ADMIN)
                | Q(role=User.Role.MANAGER, team_id=item.employee.team_id)
            )
            .exclude(pk=item.employee_id)
            .values_list('id', flat=True)
        )
    else:
        recipients = [item.employee_id]

    return {
        'id': str(uuid4()),
        'type': event_type,
        'occurred_at': timezone.now().isoformat(),
        'recipients': recipients,
        'actor': {'id': actor.id, 'display_name': actor.display_name},
        'request': {
            'id': item.id,
            'employee_id': item.employee_id,
            'employee_name': item.employee.display_name,
            'leave_type': item.leave_type,
            'start_date': item.start_date.isoformat(),
            'end_date': item.end_date.isoformat(),
            'status': item.status,
        },
    }


def publish_leave_event(item: LeaveRequest, event_type: str, actor: User) -> None:
    redis_url = settings.REDIS_URL
    if not redis_url:
        return

    payload = build_leave_event(item, event_type, actor)

    def publish() -> None:
        try:
            client = Redis.from_url(redis_url, decode_responses=True)
            client.xadd(STREAM_NAME, {'payload': json.dumps(payload)}, maxlen=10_000, approximate=True)
        except Exception:
            logger.exception('Unable to publish LeaveFlow event %s', payload['id'])

    transaction.on_commit(publish)
