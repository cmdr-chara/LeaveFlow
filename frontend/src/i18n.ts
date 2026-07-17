import { readonly, ref } from 'vue'

export type Locale = 'it' | 'en'

const it = {
  'language.label': 'Seleziona lingua',
  'loading.dashboard': 'Prepariamo la dashboard',
  'login.eyebrow': 'GESTIONE FERIE E PERMESSI',
  'login.headline': 'Il tempo del team,',
  'login.headlineAccent': 'senza attrito.',
  'login.description': 'Richieste chiare, decisioni rapide e disponibilità sempre leggibili. Tutto nello stesso posto.',
  'login.stepRequest': 'RICHIEDI',
  'login.stepApprove': 'APPROVA',
  'login.stepBreathe': 'RESPIRA',
  'login.proof': "giorni di ferie all'anno,\ngestibili dalla dashboard.",
  'login.interactive': 'DEMO INTERATTIVA',
  'login.welcome': 'Bentornato.',
  'login.selectProfile': 'Seleziona un profilo demo per esplorare la dashboard.',
  'login.profileGroup': 'Seleziona profilo demo',
  'login.username': 'Username',
  'login.password': 'Password',
  'login.enter': 'Entra nella dashboard',
  'login.demoPassword': 'Password demo:',
  'nav.goOverview': 'Vai alla panoramica',
  'nav.main': 'Navigazione principale',
  'nav.overview': 'Panoramica',
  'nav.requests': 'Richieste',
  'nav.people': 'Persone',
  'nav.today': 'OGGI',
  'nav.availableTime': 'Tempo disponibile',
  'nav.nextAbsence': 'PROSSIMA ASSENZA',
  'nav.nonePlanned': 'Nessuna pianificata',
  'nav.newRequest': 'Nuova richiesta',
  'nav.logout': 'Esci',
  'roles.employee': 'Dipendente',
  'roles.manager': 'Responsabile',
  'roles.admin': 'Amministratore',
  'header.organization': 'ORGANIZZAZIONE',
  'header.greeting': 'Buongiorno, {name}.',
  'header.requests': 'Richieste e decisioni',
  'header.people': 'Persone e disponibilità',
  'balance.title': 'SALDO 2026',
  'balance.daysAvailable': 'giorni\ndisponibili',
  'balance.summary': "Hai utilizzato {used} {days} su {allowance} di ferie disponibili per quest'anno.",
  'balance.submit': 'Invia una nuova richiesta',
  'balance.available': 'Disponibili',
  'balance.used': 'Usati',
  'balance.remaining': 'SALDO RESIDUO',
  'balance.aria': '{available} giorni disponibili su {allowance}',
  'balance.usedCount': '{used} {days} usati',
  'stats.pending': 'In attesa',
  'stats.approved': 'Approvate',
  'stats.total': 'Richieste totali',
  'recent.label': 'ULTIMI MOVIMENTI',
  'recent.team': 'Richieste del team',
  'recent.yours': 'Le tue richieste',
  'recent.viewAll': 'Vedi tutte',
  'recent.empty': 'Nessuna richiesta recente da mostrare.',
  'requests.period': 'RICHIESTE NEL PERIODO',
  'requests.totalRegistered': 'totale registrate',
  'requests.daysInvolved': 'GIORNI COINVOLTI',
  'requests.betweenLeave': 'fra ferie e permessi',
  'requests.toDecide': 'DA DECIDERE',
  'requests.toApprove': 'da approvare',
  'requests.waitingResponse': 'in attesa di risposta',
  'requests.filterGroup': 'Filtra le richieste',
  'requests.all': 'Tutte',
  'requests.pending': 'In attesa',
  'requests.approved': 'Approvate',
  'requests.rejected': 'Rifiutate',
  'requests.result': 'risultato',
  'requests.results': 'risultati',
  'requests.empty': 'Nessuna richiesta trovata.',
  'people.title': 'Disponibilità del team',
  'people.description': 'Visualizza il saldo dei giorni disponibili e le prossime assenze pianificate.',
  'people.person': 'persona',
  'people.people': 'persone',
  'people.availability': 'Disponibilità 2026',
  'people.nextAbsence': 'Prossima assenza',
  'modal.close': 'Chiudi',
  'modal.eyebrow': 'NUOVA RICHIESTA',
  'modal.title': 'Compila la tua richiesta',
  'modal.description': 'Inserisci le date. I weekend non vengono conteggiati.',
  'modal.type': 'Tipologia',
  'modal.from': 'Dal',
  'modal.to': 'Al',
  'modal.preview': 'La richiesta utilizzerà',
  'modal.note': 'Nota',
  'modal.optional': 'facoltativa',
  'modal.placeholder': 'Es: visita medica, viaggio programmato...',
  'modal.submit': 'Invia richiesta',
  'leaveType.vacation': 'Ferie',
  'leaveType.permit': 'Permesso',
  'leaveType.personal': 'Personale',
  'status.pending': 'In attesa',
  'status.approved': 'Approvata',
  'status.rejected': 'Rifiutata',
  'actions.approve': 'Approva',
  'actions.reject': 'Rifiuta',
  'notifications.open': 'Apri notifiche',
  'notifications.live': 'AGGIORNAMENTI LIVE',
  'notifications.title': 'Notifiche',
  'notifications.unavailable': 'Il servizio notifiche non è disponibile.',
  'notifications.empty': 'Nessun aggiornamento recente.',
  'notifications.requestedTitle': 'Nuova richiesta da valutare',
  'notifications.requestedMessage': "{employee} ha richiesto un'assenza dal {start} al {end}.",
  'notifications.approvedTitle': 'Richiesta approvata',
  'notifications.approvedMessage': '{actor} ha approvato la tua richiesta dal {start} al {end}.',
  'notifications.rejectedTitle': 'Richiesta rifiutata',
  'notifications.rejectedMessage': '{actor} ha rifiutato la tua richiesta dal {start} al {end}.',
  'errors.generic': 'Qualcosa non ha funzionato.',
} as const

type TranslationKey = keyof typeof it

const en: Record<TranslationKey, string> = {
  'language.label': 'Select language',
  'loading.dashboard': 'Preparing your dashboard',
  'login.eyebrow': 'LEAVE AND TIME-OFF MANAGEMENT',
  'login.headline': 'Team time,',
  'login.headlineAccent': 'without the friction.',
  'login.description': 'Clear requests, quick decisions, and availability everyone can understand. All in one place.',
  'login.stepRequest': 'REQUEST',
  'login.stepApprove': 'APPROVE',
  'login.stepBreathe': 'BREATHE',
  'login.proof': 'annual leave days,\nmanaged from one dashboard.',
  'login.interactive': 'INTERACTIVE DEMO',
  'login.welcome': 'Welcome back.',
  'login.selectProfile': 'Choose a demo profile to explore the dashboard.',
  'login.profileGroup': 'Select demo profile',
  'login.username': 'Username',
  'login.password': 'Password',
  'login.enter': 'Enter the dashboard',
  'login.demoPassword': 'Demo password:',
  'nav.goOverview': 'Go to overview',
  'nav.main': 'Main navigation',
  'nav.overview': 'Overview',
  'nav.requests': 'Requests',
  'nav.people': 'People',
  'nav.today': 'TODAY',
  'nav.availableTime': 'Available time',
  'nav.nextAbsence': 'NEXT ABSENCE',
  'nav.nonePlanned': 'None planned',
  'nav.newRequest': 'New request',
  'nav.logout': 'Log out',
  'roles.employee': 'Employee',
  'roles.manager': 'Manager',
  'roles.admin': 'Administrator',
  'header.organization': 'ORGANIZATION',
  'header.greeting': 'Good morning, {name}.',
  'header.requests': 'Requests and decisions',
  'header.people': 'People and availability',
  'balance.title': '2026 BALANCE',
  'balance.daysAvailable': 'days\navailable',
  'balance.summary': 'You have used {used} {days} out of {allowance} available leave days this year.',
  'balance.submit': 'Submit a new request',
  'balance.available': 'Available',
  'balance.used': 'Used',
  'balance.remaining': 'REMAINING BALANCE',
  'balance.aria': '{available} days available out of {allowance}',
  'balance.usedCount': '{used} {days} used',
  'stats.pending': 'Pending',
  'stats.approved': 'Approved',
  'stats.total': 'Total requests',
  'recent.label': 'RECENT ACTIVITY',
  'recent.team': 'Team requests',
  'recent.yours': 'Your requests',
  'recent.viewAll': 'View all',
  'recent.empty': 'No recent requests to show.',
  'requests.period': 'REQUESTS IN PERIOD',
  'requests.totalRegistered': 'total recorded',
  'requests.daysInvolved': 'DAYS INVOLVED',
  'requests.betweenLeave': 'across leave and permits',
  'requests.toDecide': 'TO DECIDE',
  'requests.toApprove': 'awaiting approval',
  'requests.waitingResponse': 'waiting for a response',
  'requests.filterGroup': 'Filter requests',
  'requests.all': 'All',
  'requests.pending': 'Pending',
  'requests.approved': 'Approved',
  'requests.rejected': 'Rejected',
  'requests.result': 'result',
  'requests.results': 'results',
  'requests.empty': 'No requests found.',
  'people.title': 'Team availability',
  'people.description': 'Review available leave balances and upcoming planned absences.',
  'people.person': 'person',
  'people.people': 'people',
  'people.availability': '2026 availability',
  'people.nextAbsence': 'Next absence',
  'modal.close': 'Close',
  'modal.eyebrow': 'NEW REQUEST',
  'modal.title': 'Complete your request',
  'modal.description': 'Choose the dates. Weekends are not counted.',
  'modal.type': 'Type',
  'modal.from': 'From',
  'modal.to': 'To',
  'modal.preview': 'This request will use',
  'modal.note': 'Note',
  'modal.optional': 'optional',
  'modal.placeholder': 'E.g. medical appointment, planned trip...',
  'modal.submit': 'Submit request',
  'leaveType.vacation': 'Vacation',
  'leaveType.permit': 'Permit',
  'leaveType.personal': 'Personal',
  'status.pending': 'Pending',
  'status.approved': 'Approved',
  'status.rejected': 'Rejected',
  'actions.approve': 'Approve',
  'actions.reject': 'Reject',
  'notifications.open': 'Open notifications',
  'notifications.live': 'LIVE UPDATES',
  'notifications.title': 'Notifications',
  'notifications.unavailable': 'The notification service is unavailable.',
  'notifications.empty': 'No recent updates.',
  'notifications.requestedTitle': 'New request to review',
  'notifications.requestedMessage': '{employee} requested leave from {start} to {end}.',
  'notifications.approvedTitle': 'Request approved',
  'notifications.approvedMessage': '{actor} approved your request from {start} to {end}.',
  'notifications.rejectedTitle': 'Request rejected',
  'notifications.rejectedMessage': '{actor} rejected your request from {start} to {end}.',
  'errors.generic': 'Something went wrong.',
}

const dictionaries: Record<Locale, Record<TranslationKey, string>> = { it, en }
const storedLocale = localStorage.getItem('leaveflow_locale')
const locale = ref<Locale>(storedLocale === 'en' ? 'en' : 'it')

document.documentElement.lang = locale.value

export const currentLocale = readonly(locale)

export function setLocale(value: Locale): void {
  locale.value = value
  localStorage.setItem('leaveflow_locale', value)
  document.documentElement.lang = value
}

export function t(key: TranslationKey, values: Record<string, string | number> = {}): string {
  return Object.entries(values).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    dictionaries[locale.value][key],
  )
}

export function dayLabel(count: number): string {
  if (locale.value === 'en') return count === 1 ? 'day' : 'days'
  return count === 1 ? 'giorno' : 'giorni'
}

export function workingDayLabel(count: number): string {
  if (locale.value === 'en') return count === 1 ? 'working day' : 'working days'
  return count === 1 ? 'giorno lavorativo' : 'giorni lavorativi'
}

export function formatDate(value: string | Date, options: Intl.DateTimeFormatOptions): string {
  const date = typeof value === 'string' ? new Date(`${value}T12:00:00`) : value
  return new Intl.DateTimeFormat(locale.value === 'en' ? 'en-GB' : 'it-IT', options).format(date)
}

export function roleLabel(role: 'employee' | 'manager' | 'admin'): string {
  return t(`roles.${role}`)
}

export function leaveTypeLabel(type: string): string {
  if (type === 'permit' || type === 'personal') return t(`leaveType.${type}`)
  return t('leaveType.vacation')
}

export function statusLabel(status: 'pending' | 'approved' | 'rejected'): string {
  return t(`status.${status}`)
}
