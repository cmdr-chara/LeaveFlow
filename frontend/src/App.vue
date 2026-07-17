<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ArrowRight, CalendarDays, CalendarRange, Check, ChevronRight, Clock3, LayoutDashboard, LogOut, Palmtree, Plus, Sparkles, TimerReset, UserRoundCheck, Users, X } from 'lucide-vue-next'
import { api } from './api'
import AnimatedNumber from './AnimatedNumber.vue'
import BalanceGauge from './BalanceGauge.vue'
import { dayLabel, formatDate, roleLabel, t, workingDayLabel } from './i18n'
import LanguageSwitch from './LanguageSwitch.vue'
import NotificationCenter from './NotificationCenter.vue'
import RequestRow from './RequestRow.vue'
import type { Dashboard, LeaveItem, TeamMember, User } from './types'

const user=ref<User|null>(null), dashboard=ref<Dashboard|null>(null), requests=ref<LeaveItem[]>([])
const team=ref<TeamMember[]>([])
const loading=ref(true), error=ref(''), active=ref<'overview'|'requests'|'people'>('overview'), formOpen=ref(false)
const requestFilter=ref<'all'|'pending'|'approved'|'rejected'>('all')
const credentials=ref({username:'employee',password:'demo1234'})
const form=ref({leave_type:'vacation',start_date:'',end_date:'',note:''})
const isManager=computed(()=>user.value?.role==='manager'||user.value?.role==='admin')
const filteredRequests=computed(()=>requestFilter.value==='all'?requests.value:requests.value.filter(item=>item.status===requestFilter.value))
const requestedDays=computed(()=>requests.value.reduce((total,item)=>total+item.business_days,0))
const headerTitle=computed(()=>active.value==='overview'
  ? t('header.greeting',{name:user.value?.display_name.split(' ')[0]??''})
  : active.value==='requests'?t('header.requests'):t('header.people'))
const previewDays=computed(()=>{
  if(!form.value.start_date||!form.value.end_date) return 0
  let cursor=new Date(`${form.value.start_date}T12:00:00`), end=new Date(`${form.value.end_date}T12:00:00`), days=0
  if(end<cursor) return 0
  while(cursor<=end){if(cursor.getDay()!==0&&cursor.getDay()!==6)days++;cursor.setDate(cursor.getDate()+1)}
  return days
})
const todayLabel=computed(()=>formatDate(new Date(),{weekday:'long',day:'numeric',month:'long'}))
const upcomingRequest=computed(()=>requests.value.filter(item=>item.status!=='rejected'&&new Date(`${item.end_date}T23:59:59`)>=new Date()).sort((a,b)=>a.start_date.localeCompare(b.start_date))[0]||null)
const balanceProgress=computed(()=>dashboard.value?.balance.allowance?dashboard.value.balance.available/dashboard.value.balance.allowance*100:0)

const fmt=(date:string)=>formatDate(date,{day:'2-digit',month:'short'})
async function refresh(){ const [d,r,t]=await Promise.all([api.dashboard(),api.requests(),api.team()]); dashboard.value=d; requests.value=r; team.value=t }
async function boot(){ try{ user.value=await api.me(); await refresh() }catch{ api.logout() }finally{loading.value=false} }
async function login(){error.value='';loading.value=true;try{const data=await api.login(credentials.value.username,credentials.value.password);user.value=data.user;await refresh()}catch(e){error.value=(e as Error).message}finally{loading.value=false}}
function logout(){api.logout();user.value=null;dashboard.value=null;requests.value=[];team.value=[]}
async function submit(){error.value='';try{await api.createRequest(form.value);formOpen.value=false;form.value={leave_type:'vacation',start_date:'',end_date:'',note:''};await refresh()}catch(e){error.value=(e as Error).message}}
async function decide(id:number,status:string){await api.decide(id,status);await refresh()}
onMounted(boot)
</script>

<template>
  <div v-if="loading" class="splash"><div class="splash-lockup"><div class="brand-mark loader-mark"><span>L</span></div><div class="loading-line" aria-hidden="true"><i></i></div><p>{{t('loading.dashboard')}}</p></div></div>
  <main v-else-if="!user" class="login-shell">
    <section class="login-story">
      <div class="wordmark"><span class="brand-mark small"><span>L</span></span> LeaveFlow</div>
      <div class="story-copy"><p class="eyebrow">{{t('login.eyebrow')}}</p><h1>{{t('login.headline')}}<br><em>{{t('login.headlineAccent')}}</em></h1><p>{{t('login.description')}}</p></div>
      <div class="story-flow" aria-hidden="true"><div><span>01</span><strong>{{t('login.stepRequest')}}</strong></div><i></i><div><span>02</span><strong>{{t('login.stepApprove')}}</strong></div><i></i><div><span>03</span><strong>{{t('login.stepBreathe')}}</strong></div></div>
      <div class="story-proof"><AnimatedNumber :value="26"/><p class="preline">{{t('login.proof')}}</p></div>
    </section>
    <section class="login-panel">
      <form class="login-card" @submit.prevent="login">
        <div class="login-card-intro"><div class="login-card-toolbar"><p class="kicker">{{t('login.interactive')}}</p><LanguageSwitch/></div><h2>{{t('login.welcome')}}</h2><p class="muted">{{t('login.selectProfile')}}</p></div>
        <div class="demo-switch" role="group" :aria-label="t('login.profileGroup')">
          <button v-for="name in (['employee','manager','admin'] as const)" :key="name" type="button" :class="{selected:credentials.username===name}" @click="credentials.username=name">{{roleLabel(name)}}</button>
        </div>
        <label>{{t('login.username')}}<input v-model="credentials.username" autocomplete="username"></label>
        <label>{{t('login.password')}}<input v-model="credentials.password" type="password" autocomplete="current-password"></label>
        <p v-if="error" class="form-error">{{ error }}</p>
        <button class="primary wide" type="submit">{{t('login.enter')}} <ArrowRight :size="18"/></button>
        <p class="demo-note"><Sparkles :size="14"/> {{t('login.demoPassword')}} <strong>demo1234</strong></p>
      </form>
    </section>
  </main>

  <div v-else class="app-shell">
    <aside>
      <button type="button" class="wordmark brand-home" :aria-label="t('nav.goOverview')" @click="active='overview'"><span class="brand-mark small"><span>L</span></span> LeaveFlow</button>
      <nav :aria-label="t('nav.main')">
        <button :class="{active:active==='overview'}" @click="active='overview'"><LayoutDashboard :size="19"/> {{t('nav.overview')}}</button>
        <button :class="{active:active==='requests'}" @click="active='requests'"><CalendarDays :size="19"/> {{t('nav.requests')}} <span v-if="dashboard?.counts.pending" class="nav-count">{{dashboard.counts.pending}}</span></button>
        <button :class="{active:active==='people'}" @click="active='people'"><Users :size="19"/> {{t('nav.people')}} <span class="nav-count subtle">{{team.length}}</span></button>
      </nav>
      <section v-if="dashboard" class="aside-context">
        <div class="aside-today"><span>{{t('nav.today')}}</span><strong>{{todayLabel}}</strong></div>
        <div class="aside-balance"><div><span>{{t('nav.availableTime')}}</span><strong>{{dashboard.balance.available}} / {{dashboard.balance.allowance}}</strong></div><div class="aside-track"><i :style="{width:`${balanceProgress}%`}"></i></div></div>
        <div class="aside-next"><CalendarDays :size="17"/><div><span>{{t('nav.nextAbsence')}}</span><strong v-if="upcomingRequest">{{fmt(upcomingRequest.start_date)}} → {{fmt(upcomingRequest.end_date)}}</strong><strong v-else>{{t('nav.nonePlanned')}}</strong></div></div>
        <button @click="formOpen=true"><Plus :size="15"/> {{t('nav.newRequest')}}</button>
      </section>
      <div class="aside-foot"><div class="avatar">{{user.display_name.split(' ').map(x=>x[0]).join('').slice(0,2)}}</div><div><strong>{{user.display_name}}</strong><span>{{roleLabel(user.role)}}</span></div><button class="icon-button" :title="t('nav.logout')" :aria-label="t('nav.logout')" @click="logout"><LogOut :size="17"/></button></div>
    </aside>
    <div class="workspace">
      <header><div><p class="eyebrow">{{user.team || t('header.organization')}}</p><h1>{{headerTitle}}</h1></div><div class="header-actions"><LanguageSwitch/><NotificationCenter/><button class="primary" @click="formOpen=true"><Plus :size="18"/> {{t('nav.newRequest')}}</button></div></header>

      <section v-if="active==='overview' && dashboard" key="overview" class="overview">
        <article class="balance-hero">
          <div class="balance-copy"><p class="kicker">{{t('balance.title')}}</p><div class="big-number"><AnimatedNumber :value="dashboard.balance.available"/><small class="preline">{{t('balance.daysAvailable')}}</small></div><p>{{t('balance.summary',{used:dashboard.balance.used,days:dayLabel(dashboard.balance.used),allowance:dashboard.balance.allowance})}}</p><button class="text-action" @click="formOpen=true">{{t('balance.submit')}} <ChevronRight :size="17"/></button></div>
          <div class="balance-visual"><BalanceGauge :used="dashboard.balance.used" :allowance="dashboard.balance.allowance"/><div class="gauge-legend"><span><i class="available"></i>{{t('balance.available')}}</span><span><i class="used"></i>{{t('balance.used')}}</span></div></div>
        </article>
        <div class="stat-strip">
          <div><Clock3 :size="20"/><span><strong><AnimatedNumber :value="dashboard.counts.pending"/></strong>{{t('stats.pending')}}</span></div>
          <div><Check :size="20"/><span><strong><AnimatedNumber :value="dashboard.counts.approved"/></strong>{{t('stats.approved')}}</span></div>
          <div><CalendarDays :size="20"/><span><strong><AnimatedNumber :value="dashboard.counts.total"/></strong>{{t('stats.total')}}</span></div>
        </div>
        <section class="recent"><div class="section-title"><div><p class="kicker">{{t('recent.label')}}</p><h2>{{isManager?t('recent.team'):t('recent.yours')}}</h2></div><button class="text-action" @click="active='requests'">{{t('recent.viewAll')}} <ArrowRight :size="16"/></button></div><TransitionGroup name="list" tag="div" class="request-list"><RequestRow v-for="item in dashboard.recent" :key="item.id" :item="item" :manager="isManager" @decide="decide"/><div v-if="!dashboard.recent.length" key="empty" class="empty">{{t('recent.empty')}}</div></TransitionGroup></section>
      </section>
      <section v-else-if="active==='requests'" class="requests-page">
        <div class="request-insights">
          <article class="insight primary-insight"><CalendarRange :size="21"/><div><span>{{t('requests.period')}}</span><strong><AnimatedNumber :value="requests.length"/></strong><small>{{t('requests.totalRegistered')}}</small></div></article>
          <article class="insight"><Palmtree :size="21"/><div><span>{{t('requests.daysInvolved')}}</span><strong><AnimatedNumber :value="requestedDays"/></strong><small>{{t('requests.betweenLeave')}}</small></div></article>
          <article class="insight"><TimerReset :size="21"/><div><span>{{t('requests.toDecide')}}</span><strong><AnimatedNumber :value="requests.filter(r=>r.status==='pending').length"/></strong><small>{{isManager?t('requests.toApprove'):t('requests.waitingResponse')}}</small></div></article>
        </div>
        <div class="request-toolbar"><div class="filters" role="group" :aria-label="t('requests.filterGroup')"><button :class="{selected:requestFilter==='all'}" @click="requestFilter='all'">{{t('requests.all')}} <span>{{requests.length}}</span></button><button :class="{selected:requestFilter==='pending'}" @click="requestFilter='pending'">{{t('requests.pending')}} <span>{{requests.filter(r=>r.status==='pending').length}}</span></button><button :class="{selected:requestFilter==='approved'}" @click="requestFilter='approved'">{{t('requests.approved')}} <span>{{requests.filter(r=>r.status==='approved').length}}</span></button><button v-if="requests.some(r=>r.status==='rejected')" :class="{selected:requestFilter==='rejected'}" @click="requestFilter='rejected'">{{t('requests.rejected')}} <span>{{requests.filter(r=>r.status==='rejected').length}}</span></button></div><p>{{filteredRequests.length}} {{filteredRequests.length===1?t('requests.result'):t('requests.results')}}</p></div>
        <TransitionGroup name="list" tag="div" class="request-list full"><RequestRow v-for="item in filteredRequests" :key="item.id" :item="item" :manager="isManager" @decide="decide"/><div v-if="!filteredRequests.length" key="empty-filter" class="empty">{{t('requests.empty')}}</div></TransitionGroup>
      </section>
      <section v-else class="people-page">
        <div class="people-intro"><div><p class="kicker">{{user.team?.toUpperCase()}}</p><h2>{{t('people.title')}}</h2><p>{{t('people.description')}}</p></div><div class="team-total"><Users :size="22"/><strong>{{team.length}}</strong><span>{{team.length===1?t('people.person'):t('people.people')}}</span></div></div>
        <div class="people-grid">
          <article v-for="(member,index) in team" :key="member.id" class="person-card" :style="{'--stagger':`${index*70}ms`}">
            <div class="person-top"><div class="team-avatar" aria-hidden="true" :style="{backgroundPosition:`${index%2?100:0}% ${index>1?100:0}%`}"></div><span class="role-dot" :class="member.role"></span><div><strong>{{member.display_name}}</strong><span>{{roleLabel(member.role)}}</span></div></div>
            <div class="availability"><div><span>{{t('people.availability')}}</span><strong>{{member.available_days}} / {{member.allowance}} {{dayLabel(member.allowance)}}</strong></div><div class="availability-track"><i :style="{width:`${member.allowance?member.available_days/member.allowance*100:0}%`}"></i></div></div>
            <div class="next-away"><UserRoundCheck :size="17"/><div><span>{{t('people.nextAbsence')}}</span><strong v-if="member.next_leave">{{fmt(member.next_leave.start_date)}} → {{fmt(member.next_leave.end_date)}}</strong><strong v-else>{{t('nav.nonePlanned')}}</strong></div></div>
          </article>
        </div>
      </section>
    </div>
  </div>

  <div v-if="formOpen" class="modal-backdrop" @click.self="formOpen=false"><form class="modal" @submit.prevent="submit"><button class="modal-close" type="button" :aria-label="t('modal.close')" @click="formOpen=false"><X :size="19"/></button><p class="kicker">{{t('modal.eyebrow')}}</p><h2>{{t('modal.title')}}</h2><p class="muted">{{t('modal.description')}}</p><label>{{t('modal.type')}}<select v-model="form.leave_type"><option value="vacation">{{t('leaveType.vacation')}}</option><option value="permit">{{t('leaveType.permit')}}</option><option value="personal">{{t('leaveType.personal')}}</option></select></label><div class="date-grid"><label>{{t('modal.from')}}<input v-model="form.start_date" type="date" required></label><label>{{t('modal.to')}}<input v-model="form.end_date" type="date" required></label></div><div v-if="previewDays" class="date-preview"><CalendarDays :size="18"/><span>{{t('modal.preview')}}</span><strong>{{previewDays}} {{workingDayLabel(previewDays)}}</strong></div><label>{{t('modal.note')}} <span class="optional">{{t('modal.optional')}}</span><textarea v-model="form.note" maxlength="280" :placeholder="t('modal.placeholder')"></textarea></label><p v-if="error" class="form-error">{{error}}</p><button class="primary wide" type="submit">{{t('modal.submit')}} <ArrowRight :size="18"/></button></form></div>
</template>
