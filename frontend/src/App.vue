<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ArrowRight, CalendarDays, CalendarRange, Check, ChevronRight, Clock3, LayoutDashboard, LogOut, Palmtree, Plus, Sparkles, TimerReset, UserRoundCheck, Users, X } from 'lucide-vue-next'
import { api } from './api'
import AnimatedNumber from './AnimatedNumber.vue'
import BalanceGauge from './BalanceGauge.vue'
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
const headerTitle=computed(()=>active.value==='overview'?`Buongiorno, ${user.value?.display_name.split(' ')[0]}.`:active.value==='requests'?'Richieste e decisioni':'Persone e disponibilità')
const previewDays=computed(()=>{
  if(!form.value.start_date||!form.value.end_date) return 0
  let cursor=new Date(`${form.value.start_date}T12:00:00`), end=new Date(`${form.value.end_date}T12:00:00`), days=0
  if(end<cursor) return 0
  while(cursor<=end){if(cursor.getDay()!==0&&cursor.getDay()!==6)days++;cursor.setDate(cursor.getDate()+1)}
  return days
})
const todayLabel=new Intl.DateTimeFormat('it-IT',{weekday:'long',day:'numeric',month:'long'}).format(new Date())
const upcomingRequest=computed(()=>requests.value.filter(item=>item.status!=='rejected'&&new Date(`${item.end_date}T23:59:59`)>=new Date()).sort((a,b)=>a.start_date.localeCompare(b.start_date))[0]||null)
const balanceProgress=computed(()=>dashboard.value?.balance.allowance?dashboard.value.balance.available/dashboard.value.balance.allowance*100:0)

const fmt=(date:string)=>new Intl.DateTimeFormat('it-IT',{day:'2-digit',month:'short'}).format(new Date(`${date}T12:00:00`))
async function refresh(){ const [d,r,t]=await Promise.all([api.dashboard(),api.requests(),api.team()]); dashboard.value=d; requests.value=r; team.value=t }
async function boot(){ try{ user.value=await api.me(); await refresh() }catch{ api.logout() }finally{loading.value=false} }
async function login(){error.value='';loading.value=true;try{const data=await api.login(credentials.value.username,credentials.value.password);user.value=data.user;await refresh()}catch(e){error.value=(e as Error).message}finally{loading.value=false}}
function logout(){api.logout();user.value=null;dashboard.value=null;requests.value=[];team.value=[]}
async function submit(){error.value='';try{await api.createRequest(form.value);formOpen.value=false;form.value={leave_type:'vacation',start_date:'',end_date:'',note:''};await refresh()}catch(e){error.value=(e as Error).message}}
async function decide(id:number,status:string){await api.decide(id,status);await refresh()}
onMounted(boot)
</script>

<template>
  <div v-if="loading" class="splash"><div class="splash-lockup"><div class="brand-mark loader-mark"><span>L</span></div><div class="loading-line" aria-hidden="true"><i></i></div><p>Prepariamo la dashboard</p></div></div>
  <main v-else-if="!user" class="login-shell">
    <section class="login-story">
      <div class="wordmark"><span class="brand-mark small"><span>L</span></span> LeaveFlow</div>
      <div class="story-copy"><p class="eyebrow">GESTIONE FERIE E PERMESSI</p><h1>Il tempo del team,<br><em>senza attrito.</em></h1><p>Richieste chiare, decisioni rapide e disponibilità sempre leggibili. Tutto nello stesso posto.</p></div>
      <div class="story-flow" aria-hidden="true"><div><span>01</span><strong>RICHIEDI</strong></div><i></i><div><span>02</span><strong>APPROVA</strong></div><i></i><div><span>03</span><strong>RESPIRA</strong></div></div>
      <div class="story-proof"><AnimatedNumber :value="26"/><p>giorni di ferie all'anno,<br>gestibili dalla dashboard.</p></div>
    </section>
    <section class="login-panel">
      <form class="login-card" @submit.prevent="login">
        <div><p class="kicker">DEMO INTERATTIVA</p><h2>Bentornato.</h2><p class="muted">Seleziona un profilo demo per esplorare la dashboard.</p></div>
        <div class="demo-switch" role="group" aria-label="Seleziona profilo demo">
          <button v-for="name in ['employee','manager','admin']" :key="name" type="button" :class="{selected:credentials.username===name}" @click="credentials.username=name">{{ name==='employee'?'Dipendente':name==='manager'?'Responsabile':'Admin' }}</button>
        </div>
        <label>Username<input v-model="credentials.username" autocomplete="username"></label>
        <label>Password<input v-model="credentials.password" type="password" autocomplete="current-password"></label>
        <p v-if="error" class="form-error">{{ error }}</p>
        <button class="primary wide" type="submit">Entra nella dashboard <ArrowRight :size="18"/></button>
        <p class="demo-note"><Sparkles :size="14"/> Password demo: <strong>demo1234</strong></p>
      </form>
    </section>
  </main>

  <div v-else class="app-shell">
    <aside>
      <button type="button" class="wordmark brand-home" aria-label="Vai alla panoramica" @click="active='overview'"><span class="brand-mark small"><span>L</span></span> LeaveFlow</button>
      <nav aria-label="Navigazione principale">
        <button :class="{active:active==='overview'}" @click="active='overview'"><LayoutDashboard :size="19"/> Panoramica</button>
        <button :class="{active:active==='requests'}" @click="active='requests'"><CalendarDays :size="19"/> Richieste <span v-if="dashboard?.counts.pending" class="nav-count">{{dashboard.counts.pending}}</span></button>
        <button :class="{active:active==='people'}" @click="active='people'"><Users :size="19"/> Persone <span class="nav-count subtle">{{team.length}}</span></button>
      </nav>
      <section v-if="dashboard" class="aside-context">
        <div class="aside-today"><span>OGGI</span><strong>{{todayLabel}}</strong></div>
        <div class="aside-balance"><div><span>Tempo disponibile</span><strong>{{dashboard.balance.available}} / {{dashboard.balance.allowance}}</strong></div><div class="aside-track"><i :style="{width:`${balanceProgress}%`}"></i></div></div>
        <div class="aside-next"><CalendarDays :size="17"/><div><span>PROSSIMA ASSENZA</span><strong v-if="upcomingRequest">{{fmt(upcomingRequest.start_date)}} → {{fmt(upcomingRequest.end_date)}}</strong><strong v-else>Nessuna pianificata</strong></div></div>
        <button @click="formOpen=true"><Plus :size="15"/> Nuova richiesta</button>
      </section>
      <div class="aside-foot"><div class="avatar">{{user.display_name.split(' ').map(x=>x[0]).join('').slice(0,2)}}</div><div><strong>{{user.display_name}}</strong><span>{{user.role==='employee'?'Dipendente':user.role==='manager'?'Responsabile':'Amministratore'}}</span></div><button class="icon-button" title="Esci" aria-label="Esci" @click="logout"><LogOut :size="17"/></button></div>
    </aside>
    <div class="workspace">
      <header><div><p class="eyebrow">{{user.team || 'ORGANIZZAZIONE'}}</p><h1>{{headerTitle}}</h1></div><button class="primary" @click="formOpen=true"><Plus :size="18"/> Nuova richiesta</button></header>

      <section v-if="active==='overview' && dashboard" key="overview" class="overview">
        <article class="balance-hero">
          <div class="balance-copy"><p class="kicker">SALDO 2026</p><div class="big-number"><AnimatedNumber :value="dashboard.balance.available"/><small>giorni<br>disponibili</small></div><p>Hai utilizzato {{dashboard.balance.used}} {{dashboard.balance.used===1?'giorno':'giorni'}} su {{dashboard.balance.allowance}} di ferie disponibili per quest'anno.</p><button class="text-action" @click="formOpen=true">Invia una nuova richiesta <ChevronRight :size="17"/></button></div>
          <div class="balance-visual"><BalanceGauge :used="dashboard.balance.used" :allowance="dashboard.balance.allowance"/><div class="gauge-legend"><span><i class="available"></i>Disponibili</span><span><i class="used"></i>Usati</span></div></div>
        </article>
        <div class="stat-strip">
          <div><Clock3 :size="20"/><span><strong><AnimatedNumber :value="dashboard.counts.pending"/></strong>In attesa</span></div>
          <div><Check :size="20"/><span><strong><AnimatedNumber :value="dashboard.counts.approved"/></strong>Approvate</span></div>
          <div><CalendarDays :size="20"/><span><strong><AnimatedNumber :value="dashboard.counts.total"/></strong>Richieste totali</span></div>
        </div>
        <section class="recent"><div class="section-title"><div><p class="kicker">ULTIMI MOVIMENTI</p><h2>{{isManager?'Richieste del team':'Le tue richieste'}}</h2></div><button class="text-action" @click="active='requests'">Vedi tutte <ArrowRight :size="16"/></button></div><TransitionGroup name="list" tag="div" class="request-list"><RequestRow v-for="item in dashboard.recent" :key="item.id" :item="item" :manager="isManager" @decide="decide"/><div v-if="!dashboard.recent.length" key="empty" class="empty">Nessuna richiesta recente da mostrare.</div></TransitionGroup></section>
      </section>
      <section v-else-if="active==='requests'" class="requests-page">
        <div class="request-insights">
          <article class="insight primary-insight"><CalendarRange :size="21"/><div><span>RICHIESTE NEL PERIODO</span><strong><AnimatedNumber :value="requests.length"/></strong><small>totale registrate</small></div></article>
          <article class="insight"><Palmtree :size="21"/><div><span>GIORNI COINVOLTI</span><strong><AnimatedNumber :value="requestedDays"/></strong><small>fra ferie e permessi</small></div></article>
          <article class="insight"><TimerReset :size="21"/><div><span>DA DECIDERE</span><strong><AnimatedNumber :value="requests.filter(r=>r.status==='pending').length"/></strong><small>{{isManager?'da approvare':'in attesa di risposta'}}</small></div></article>
        </div>
        <div class="request-toolbar"><div class="filters" role="group" aria-label="Filtra le richieste"><button :class="{selected:requestFilter==='all'}" @click="requestFilter='all'">Tutte <span>{{requests.length}}</span></button><button :class="{selected:requestFilter==='pending'}" @click="requestFilter='pending'">In attesa <span>{{requests.filter(r=>r.status==='pending').length}}</span></button><button :class="{selected:requestFilter==='approved'}" @click="requestFilter='approved'">Approvate <span>{{requests.filter(r=>r.status==='approved').length}}</span></button><button v-if="requests.some(r=>r.status==='rejected')" :class="{selected:requestFilter==='rejected'}" @click="requestFilter='rejected'">Rifiutate <span>{{requests.filter(r=>r.status==='rejected').length}}</span></button></div><p>{{filteredRequests.length}} {{filteredRequests.length===1?'risultato':'risultati'}}</p></div>
        <TransitionGroup name="list" tag="div" class="request-list full"><RequestRow v-for="item in filteredRequests" :key="item.id" :item="item" :manager="isManager" @decide="decide"/><div v-if="!filteredRequests.length" key="empty-filter" class="empty">Nessuna richiesta trovata.</div></TransitionGroup>
      </section>
      <section v-else class="people-page">
        <div class="people-intro"><div><p class="kicker">{{user.team?.toUpperCase()}}</p><h2>Disponibilità del team</h2><p>Visualizza il saldo dei giorni disponibili e le prossime assenze pianificate.</p></div><div class="team-total"><Users :size="22"/><strong>{{team.length}}</strong><span>persone</span></div></div>
        <div class="people-grid">
          <article v-for="(member,index) in team" :key="member.id" class="person-card" :style="{'--stagger':`${index*70}ms`}">
            <div class="person-top"><div class="team-avatar" aria-hidden="true" :style="{backgroundPosition:`${index%2?100:0}% ${index>1?100:0}%`}"></div><span class="role-dot" :class="member.role"></span><div><strong>{{member.display_name}}</strong><span>{{member.role==='employee'?'Dipendente':member.role==='manager'?'Responsabile':'Amministratore'}}</span></div></div>
            <div class="availability"><div><span>Disponibilità 2026</span><strong>{{member.available_days}} / {{member.allowance}} giorni</strong></div><div class="availability-track"><i :style="{width:`${member.allowance?member.available_days/member.allowance*100:0}%`}"></i></div></div>
            <div class="next-away"><UserRoundCheck :size="17"/><div><span>Prossima assenza</span><strong v-if="member.next_leave">{{fmt(member.next_leave.start_date)}} → {{fmt(member.next_leave.end_date)}}</strong><strong v-else>Nessuna pianificata</strong></div></div>
          </article>
        </div>
      </section>
    </div>
  </div>

  <div v-if="formOpen" class="modal-backdrop" @click.self="formOpen=false"><form class="modal" @submit.prevent="submit"><button class="modal-close" type="button" aria-label="Chiudi" @click="formOpen=false"><X :size="19"/></button><p class="kicker">NUOVA RICHIESTA</p><h2>Compila la tua richiesta</h2><p class="muted">Inserisci le date. I weekend non vengono conteggiati.</p><label>Tipologia<select v-model="form.leave_type"><option value="vacation">Ferie</option><option value="permit">Permesso</option><option value="personal">Personale</option></select></label><div class="date-grid"><label>Dal<input v-model="form.start_date" type="date" required></label><label>Al<input v-model="form.end_date" type="date" required></label></div><div v-if="previewDays" class="date-preview"><CalendarDays :size="18"/><span>La richiesta utilizzerà</span><strong>{{previewDays}} {{previewDays===1?'giorno lavorativo':'giorni lavorativi'}}</strong></div><label>Nota <span class="optional">facoltativa</span><textarea v-model="form.note" maxlength="280" placeholder="Es: visita medica, viaggio programmato..."></textarea></label><p v-if="error" class="form-error">{{error}}</p><button class="primary wide" type="submit">Invia richiesta <ArrowRight :size="18"/></button></form></div>
</template>

<script lang="ts">
import { defineComponent, h } from 'vue'
import { Check as CheckIcon, X as XIcon } from 'lucide-vue-next'
import type { LeaveItem as LeaveRowItem } from './types'
export const RequestRow=defineComponent({props:{item:{type:Object as ()=>LeaveRowItem,required:true},manager:Boolean},emits:['decide'],setup(props,{emit}){const fmt=(d:string)=>new Intl.DateTimeFormat('it-IT',{day:'2-digit',month:'short'}).format(new Date(d+'T12:00:00'));return()=>h('article',{class:'request-row'},[h('div',{class:'date-block'},[h('strong',fmt(props.item.start_date).split(' ')[0]),h('span',fmt(props.item.start_date).split(' ')[1])]),h('div',{class:'request-main'},[h('div',[h('strong',props.item.employee.display_name),h('span',`${props.item.leave_type_label} · ${props.item.business_days} ${props.item.business_days===1?'giorno':'giorni'}`)]),props.item.note?h('p',props.item.note):null]),h('span',{class:`status ${props.item.status}`},props.item.status_label),props.manager&&props.item.status==='pending'?h('div',{class:'row-actions'},[h('button',{title:'Approva',class:'approve',onClick:()=>emit('decide',props.item.id,'approved')},[h(CheckIcon,{size:17})]),h('button',{title:'Rifiuta',class:'reject',onClick:()=>emit('decide',props.item.id,'rejected')},[h(XIcon,{size:17})])]):null])}})
</script>
