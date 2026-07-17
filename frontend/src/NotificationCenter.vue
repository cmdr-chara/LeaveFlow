<script setup lang="ts">
import { Bell, CheckCircle2, Clock3, XCircle } from 'lucide-vue-next'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { formatDate, t } from './i18n'
import { loadNotifications, streamNotifications, type Notification } from './notifications'

const open=ref(false), notifications=ref<Notification[]>([]), unavailable=ref(false)
let stopStream=()=>{}

const icon=(type:Notification['type'])=>type==='leave.approved'?CheckCircle2:type==='leave.rejected'?XCircle:Clock3
const time=(value:string)=>formatDate(new Date(value),{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})
const date=(value:string|undefined)=>value?formatDate(value,{day:'2-digit',month:'short',year:'numeric'}):''
const title=(item:Notification)=>item.type==='leave.requested'?t('notifications.requestedTitle'):item.type==='leave.approved'?t('notifications.approvedTitle'):t('notifications.rejectedTitle')
const message=(item:Notification)=>{
  let actor=item.actor_name, employee=item.employee_name, start=item.start_date, end=item.end_date
  if(!start||!end){
    const legacy=item.message.match(item.type==='leave.requested'
      ? /^(.+?) ha richiesto un'assenza dal (\d{4}-\d{2}-\d{2}) al (\d{4}-\d{2}-\d{2})\.$/
      : /^(.+?) ha (?:approvato|rifiutato) la tua richiesta dal (\d{4}-\d{2}-\d{2}) al (\d{4}-\d{2}-\d{2})\.$/)
    if(legacy){
      if(item.type==='leave.requested') employee=legacy[1]
      else actor=legacy[1]
      start=legacy[2]
      end=legacy[3]
    }
  }
  if(!start||!end) return item.message
  const values={actor:actor??'',employee:employee??'',start:date(start),end:date(end)}
  return item.type==='leave.requested'?t('notifications.requestedMessage',values):item.type==='leave.approved'?t('notifications.approvedMessage',values):t('notifications.rejectedMessage',values)
}

onMounted(async()=>{
  try{
    notifications.value=await loadNotifications()
    stopStream=streamNotifications(notification=>{
      notifications.value=[notification,...notifications.value.filter(item=>item.id!==notification.id)].slice(0,20)
    })
  }catch{unavailable.value=true}
})
onBeforeUnmount(()=>stopStream())
</script>

<template>
  <div class="notification-center">
    <button class="notification-trigger" type="button" :aria-label="t('notifications.open')" :aria-expanded="open" @click="open=!open">
      <Bell :size="19"/><span v-if="notifications.length">{{Math.min(notifications.length,9)}}</span>
    </button>
    <section v-if="open" class="notification-panel">
      <div class="notification-heading"><div><p class="kicker">{{t('notifications.live')}}</p><h2>{{t('notifications.title')}}</h2></div><span>{{notifications.length}}</span></div>
      <p v-if="unavailable" class="notification-empty">{{t('notifications.unavailable')}}</p>
      <p v-else-if="!notifications.length" class="notification-empty">{{t('notifications.empty')}}</p>
      <div v-else class="notification-list">
        <article v-for="item in notifications" :key="item.id" :class="item.type.split('.')[1]">
          <component :is="icon(item.type)" :size="17"/>
          <div><strong>{{title(item)}}</strong><p>{{message(item)}}</p><time>{{time(item.occurred_at)}}</time></div>
        </article>
      </div>
    </section>
  </div>
</template>
