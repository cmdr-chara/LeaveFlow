<script setup lang="ts">
import { Check, X } from 'lucide-vue-next'

import { dayLabel, formatDate, leaveTypeLabel, statusLabel, t } from './i18n'
import type { LeaveItem } from './types'

defineProps<{ item: LeaveItem; manager?: boolean }>()
const emit = defineEmits<{ decide: [id: number, status: 'approved' | 'rejected'] }>()

const dateParts = (date: string) => formatDate(date, { day: '2-digit', month: 'short' }).split(' ')
</script>

<template>
  <article class="request-row">
    <div class="date-block"><strong>{{dateParts(item.start_date)[0]}}</strong><span>{{dateParts(item.start_date)[1]}}</span></div>
    <div class="request-main">
      <div><strong>{{item.employee.display_name}}</strong><span>{{leaveTypeLabel(item.leave_type)}} · {{item.business_days}} {{dayLabel(item.business_days)}}</span></div>
      <p v-if="item.note">{{item.note}}</p>
    </div>
    <span :class="`status ${item.status}`">{{statusLabel(item.status)}}</span>
    <div v-if="manager && item.status === 'pending'" class="row-actions">
      <button :title="t('actions.approve')" :aria-label="t('actions.approve')" class="approve" @click="emit('decide', item.id, 'approved')"><Check :size="17"/></button>
      <button :title="t('actions.reject')" :aria-label="t('actions.reject')" class="reject" @click="emit('decide', item.id, 'rejected')"><X :size="17"/></button>
    </div>
  </article>
</template>
