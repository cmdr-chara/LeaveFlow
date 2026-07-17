export type Role = 'employee' | 'manager' | 'admin'
export interface User { id: number; username: string; display_name: string; email: string; role: Role; team: string | null }
export interface LeaveItem { id:number; employee:User; leave_type:string; leave_type_label:string; start_date:string; end_date:string; note:string; status:'pending'|'approved'|'rejected'; status_label:string; business_days:number; created_at:string }
export interface Dashboard { balance:{ allowance:number; used:number; available:number }; counts:{ total:number; pending:number; approved:number }; recent:LeaveItem[] }
export interface TeamMember extends User { available_days:number; allowance:number; next_leave:{start_date:string;end_date:string}|null }
