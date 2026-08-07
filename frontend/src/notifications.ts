import { api } from './api'

const base = import.meta.env.VITE_NOTIFICATIONS_URL ?? 'http://localhost:3000'

export interface Notification {
  id:string
  user_id:number
  type:'leave.requested'|'leave.approved'|'leave.rejected'
  title:string
  message:string
  occurred_at:string
  request_id:number
  actor_name?:string
  employee_name?:string
  start_date?:string
  end_date?:string
}

export async function loadNotifications():Promise<Notification[]> {
  const response = await fetch(`${base}/notifications`, {
    headers:{ Authorization:api.authorization() },
  })
  if(!response.ok) throw new Error('Impossibile caricare le notifiche.')
  return (await response.json() as {notifications:Notification[]}).notifications
}

export function streamNotifications(onNotification:(notification:Notification)=>void):()=>void {
  const controller = new AbortController()
  void (async()=>{
    const response = await fetch(`${base}/events`, {
      headers:{ Authorization:api.authorization(), Accept:'text/event-stream' },
      signal:controller.signal,
    })
    if(!response.ok || !response.body) throw new Error('Flusso notifiche non disponibile.')

    const reader=response.body.getReader(), decoder=new TextDecoder()
    let buffer=''
    while(true){
      const {done,value}=await reader.read()
      if(done) break
      buffer+=decoder.decode(value,{stream:true})
      const frames=buffer.split('\n\n')
      buffer=frames.pop()||''
      for(const frame of frames){
        const data=frame.split('\n').find(line=>line.startsWith('data: '))
        if(data) onNotification(JSON.parse(data.slice(6)) as Notification)
      }
    }
  })().catch(error=>{if(!controller.signal.aborted)console.warn(error)})
  return ()=>controller.abort()
}
