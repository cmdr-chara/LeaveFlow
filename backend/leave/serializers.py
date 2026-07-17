from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import LeaveRequest, User


class UserSerializer(serializers.ModelSerializer):
    team = serializers.CharField(source='team.name', allow_null=True)
    display_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'display_name', 'email', 'role', 'team')


class LeaveRequestSerializer(serializers.ModelSerializer):
    employee = UserSerializer(read_only=True)
    business_days = serializers.IntegerField(read_only=True)
    leave_type_label = serializers.CharField(source='get_leave_type_display', read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = LeaveRequest
        fields = (
            'id', 'employee', 'leave_type', 'leave_type_label', 'start_date', 'end_date',
            'note', 'status', 'status_label', 'business_days', 'created_at',
        )
        read_only_fields = ('status',)

    def validate(self, attrs):
        instance = LeaveRequest(employee=self.context['request'].user, **attrs)
        try:
            instance.clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict if hasattr(exc, 'message_dict') else exc.messages)
        balance = getattr(self.context['request'].user, 'leave_balance', None)
        if balance and instance.business_days > balance.available_days:
            raise serializers.ValidationError('Saldo ferie insufficiente.')
        return attrs

    def create(self, validated_data):
        return LeaveRequest.objects.create(employee=self.context['request'].user, **validated_data)
