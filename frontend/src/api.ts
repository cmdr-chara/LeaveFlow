import type { Dashboard, LeaveItem, TeamMember, User } from './types'
const base = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
let token = localStorage.getItem('leaveflow_token') || ''
async function call<T>(path:string, options:RequestInit={}):Promise<T> {
  const response = await fetch(`${base}${path}`, { ...options, headers:{ 'Content-Type':'application/json', ...(token ? { Authorization:`Token ${token}` }:{}), ...options.headers } })
  const body = await response.json().catch(()=>({}))
  if (!response.ok) throw new Error(body.detail || Object.values(body).flat().join(' ') || 'Qualcosa non ha funzionato.')
  return body
}
export const api = {
  async login(username:string,password:string){ const data=await call<{token:string;user:User}>('/auth/login/',{method:'POST',body:JSON.stringify({username,password})}); token=data.token; localStorage.setItem('leaveflow_token',token); return data },
  logout(){token='';localStorage.removeItem('leaveflow_token')},
  me:()=>call<User>('/me/'), dashboard:()=>call<Dashboard>('/dashboard/'), requests:()=>call<LeaveItem[]>('/requests/'),
  team:()=>call<TeamMember[]>('/team/'),
  createRequest:(payload:object)=>call<LeaveItem>('/requests/',{method:'POST',body:JSON.stringify(payload)}),
  decide:(id:number,status:string)=>call<LeaveItem>(`/requests/${id}/decision/`,{method:'POST',body:JSON.stringify({status})}),
}
