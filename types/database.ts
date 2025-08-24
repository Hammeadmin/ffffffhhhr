// Database types for Momentum CRM - Updated to match exact schema
export type UserRole = 'admin' | 'sales' | 'worker';
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'won' | 'lost';
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined';
export type JobStatus = 'pending' | 'in_progress' | 'completed' | 'invoiced';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';
export type EventType = 'meeting' | 'task' | 'reminder';
export type JobPriority = 'high' | 'normal' | 'low';
export type OrderStatus = 'öppen_order' | 'bokad_bekräftad' | 'avbokad_kund' | 'ej_slutfört' | 'redo_fakturera';
export type TeamSpecialty = 'fönsterputsning' | 'taktvätt' | 'fasadtvätt' | 'allmänt' | 'övrigt';
export type TeamRole = 'ledare' | 'senior' | 'medarbetare' | 'lärling';
export type AssignmentType = 'individual' | 'team';
export type JobType = 'fönsterputsning' | 'taktvätt' | 'fasadtvätt' | 'allmänt';
export type NotificationType = 'order_assignment' | 'event_assignment' | 'status_update' | 'system';
export type CommunicationType = 'email' | 'sms';
export type CommunicationStatus = 'draft' | 'sent' | 'delivered' | 'read' | 'failed';

// Time tracking types
export interface TimeLog {
  id: string;
  order_id: string;
  user_id: string;
  start_time: string;
  end_time?: string | null;
  break_duration: number;
  notes?: string | null;
  is_approved: boolean;
  hourly_rate: number;
  total_amount: number;
  location_lat?: number | null;
  location_lng?: number | null;
  photo_urls: string[];
  materials_used: Material[];
  travel_time_minutes: number;
  work_type?: string | null;
  weather_conditions?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Material {
  name: string;
  quantity: number;
  unit: string;
  notes?: string;
}

// ROT-related types
export interface ROTData {
  include_rot: boolean;
  rot_personnummer?: string | null;
  rot_organisationsnummer?: string | null;
  rot_fastighetsbeteckning?: string | null;
  rot_amount?: number | null;
}

// Credit Note types
export interface CreditNote {
  id: string;
  organisation_id?: string | null;
  customer_id?: string | null;
  invoice_number: string;
  credit_note_number: string;
  is_credit_note: true;
  original_invoice_id: string;
  credit_reason: string;
  amount: number; // Negative value
  status: InvoiceStatus;
  due_date?: string | null;
  credited_amount?: number | null;
  net_amount?: number | null;
  created_at?: string | null;
  customer?: Customer;
  original_invoice?: Invoice;
}

export interface Organisation {
  id: string;
  name: string;
  org_number?: string | null;
  created_at?: string | null;
}

export interface UserProfile {
  id: string;
  organisation_id?: string | null;
  full_name: string;
  email?: string | null;
  phone_number?: string | null;
  role: UserRole;
  is_active?: boolean | null;
  created_at?: string | null;
  organisation?: Organisation;
  organisation?: {
    name: string;
  };
}

export interface SavedLineItem {
  id: string;
  organisation_id: string;
  name: string;
  description: string | null;
  unit_price: number;
}

export interface Customer {
  id: string;
  organisation_id?: string | null;
  name: string;
  email?: string | null;
  phone_number?: string | null;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  created_at?: string | null;
  include_rot?: boolean | null;
  rot_personnummer?: string | null;
  rot_organisationsnummer?: string | null;
  rot_fastighetsbeteckning?: string | null;
  rot_amount?: number | null;
}

export interface Lead {
  id: string;
  organisation_id?: string | null;
  customer_id?: string | null;
  assigned_to_user_id?: string | null;
  title: string;
  description?: string | null;
  source?: string | null;
  status: LeadStatus;
  estimated_value?: number | null;
  created_at?: string | null;
  customer?: Customer;
  assigned_to?: UserProfile;
}

export interface Quote {
  id: string;
  organisation_id?: string | null;
  customer_id?: string | null;
  lead_id?: string | null;
  quote_number?: string | null;
  title: string;
  description?: string | null;
  total_amount: number;
  subtotal?: number | null;
  vat_amount?: number | null;
  status: QuoteStatus;
  valid_until?: string | null;
  created_at?: string | null;
  include_rot?: boolean | null;
  rot_personnummer?: string | null;
  rot_organisationsnummer?: string | null;
  rot_fastighetsbeteckning?: string | null;
  rot_amount?: number | null;
  acceptance_token?: string | null;
  token_expires_at?: string | null;
  accepted_at?: string | null;
  accepted_by_ip?: string | null;
  order_id?: string | null;
  customer?: Customer;
  lead?: Lead;
  line_items?: QuoteLineItem[];
}

export interface QuoteLineItem {
  id: string;
  quote_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  sort_order: number;
  created_at?: string | null;
}

export interface Job {
  id: string;
  organisation_id?: string | null;
  customer_id?: string | null;
  quote_id?: string | null;
  assigned_to_user_id?: string | null;
  job_number?: string | null;
  title: string;
  description?: string | null;
  status: JobStatus;
  value: number;
  priority?: JobPriority | null;
  deadline?: string | null;
  progress?: number | null;
  created_at?: string | null;
  customer?: Customer;
  quote?: Quote;
  assigned_to?: UserProfile;
}

export interface Invoice {
  id: string;
  organisation_id?: string | null;
  job_id?: string | null;
  order_id?: string | null;
  customer_id?: string | null;
  assigned_team_id?: string | null;
  assigned_user_id?: string | null;
  invoice_number: string;
  status: InvoiceStatus;
  due_date?: string | null;
  amount: number;
  job_description?: string | null;
  job_type?: JobType | null;
  team_members_involved?: any[] | null;
  work_summary?: string | null;
  email_sent?: boolean | null;
  email_sent_at?: string | null;
  email_recipient?: string | null;
  created_at?: string | null;
  include_rot?: boolean | null;
  rot_personnummer?: string | null;
  rot_organisationsnummer?: string | null;
  rot_fastighetsbeteckning?: string | null;
  rot_amount?: number | null;
  job?: Job;
  customer?: Customer;
  assigned_team?: Team;
  assigned_user?: UserProfile;
}

export interface CalendarEvent {
  is_credit_note?: boolean | null;
  original_invoice_id?: string | null;
  credit_reason?: string | null;
  credit_note_number?: string | null;
  credited_amount?: number | null;
  net_amount?: number | null;
  id: string;
  organisation_id?: string | null;
  assigned_to_user_id?: string | null;
  assigned_to_team_id?: string | null;
  title: string;
  type: EventType;
  start_time?: string | null;
  end_time?: string | null;
  related_lead_id?: string | null;
  related_job_id?: string | null;
  related_order_id?: string | null;
  description?: string | null;
  location?: string | null;
  created_at?: string | null;
  assigned_to?: UserProfile;
  assigned_team?: Team;
  related_lead?: Lead;
  related_job?: Job;
}

export interface Order {
  id: string;
  organisation_id?: string | null;
  customer_id?: string | null;
  title: string;
  description?: string | null;
  value?: number | null;
  assigned_to_user_id?: string | null;
  assigned_to_team_id?: string | null;
  assignment_type?: AssignmentType | null;
  job_description?: string | null;
  job_type?: JobType | null;
  estimated_hours?: number | null;
  complexity_level?: number | null;
  status: OrderStatus;
  source?: string | null;
  created_at?: string | null;
  include_rot?: boolean | null;
  rot_personnummer?: string | null;
  rot_organisationsnummer?: string | null;
  rot_fastighetsbeteckning?: string | null;
  rot_amount?: number | null;
  customer?: Customer;
  assigned_to?: UserProfile;
  assigned_team?: Team;
}

export interface Team {
  id: string;
  organisation_id?: string | null;
  name: string;
  description?: string | null;
  specialty: TeamSpecialty;
  team_leader_id?: string | null;
  is_active?: boolean | null;
  hourly_rate?: number | null;
  created_at?: string | null;
  team_leader?: UserProfile;
  members?: TeamMember[];
}

export interface TeamMember {
  id: string;
  organisation_id?: string | null;
  team_id: string;
  user_id: string;
  role_in_team: TeamRole;
  joined_date?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
  user?: UserProfile;
  team?: Team;
}

export interface OrderNote {
  id: string;
  order_id: string;
  user_id: string;
  content: string;
  created_at?: string | null;
  user?: UserProfile;
}

export interface OrderActivity {
  id: string;
  order_id: string;
  user_id?: string | null;
  activity_type: string;
  description: string;
  old_value?: string | null;
  new_value?: string | null;
  created_at?: string | null;
  user?: UserProfile;
}

export interface LeadNote {
  id: string;
  lead_id: string;
  user_id: string;
  content: string;
  created_at?: string | null;
  user?: UserProfile;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  user_id?: string | null;
  activity_type: string;
  description: string;
  created_at?: string | null;
  user?: UserProfile;
}

export interface JobActivity {
  id: string;
  job_id: string;
  user_id?: string | null;
  activity_type: string;
  description: string;
  old_value?: string | null;
  new_value?: string | null;
  created_at?: string | null;
  user?: UserProfile;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  action_url?: string | null;
  created_at?: string | null;
}

export interface Communication {
  id: string;
  organisation_id: string;
  order_id: string;
  type: CommunicationType;
  recipient: string;
  subject?: string | null;
  content: string;
  status: CommunicationStatus;
  sent_at?: string | null;
  delivered_at?: string | null;
  read_at?: string | null;
  created_by_user_id: string;
  created_at?: string | null;
  error_message?: string | null;
}

// Database operation result types
export interface DatabaseResult<T> {
  data: T | null;
  error: Error | null;
}

export interface DatabaseListResult<T> {
  data: T[] | null;
  error: Error | null;
}

// Swedish status translations
export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'Ny',
  contacted: 'Kontaktad',
  qualified: 'Kvalificerad',
  won: 'Vunnen',
  lost: 'Förlorad',
};

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: 'Utkast',
  sent: 'Skickad',
  accepted: 'Accepterad',
  declined: 'Avvisad',
};

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  pending: 'Väntande',
  in_progress: 'Pågående',
  completed: 'Slutförd',
  invoiced: 'Fakturerad',
};

export const JOB_PRIORITY_LABELS: Record<JobPriority, string> = {
  high: 'Hög',
  normal: 'Normal',
  low: 'Låg',
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Utkast',
  sent: 'Skickad',
  paid: 'Betald',
  overdue: 'Förfallen',
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administratör',
  sales: 'Säljare',
  worker: 'Medarbetare',
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  öppen_order: 'Öppen Order',
  bokad_bekräftad: 'Bokad och Bekräftad',
  avbokad_kund: 'Avbokad av Kund',
  ej_slutfört: 'Ej Slutfört',
  redo_fakturera: 'Redo att Fakturera',
};

export const TEAM_SPECIALTY_LABELS: Record<TeamSpecialty, string> = {
  fönsterputsning: 'Fönsterputsning',
  taktvätt: 'Taktvätt',
  fasadtvätt: 'Fasadtvätt',
  allmänt: 'Allmänt',
  övrigt: 'Övrigt',
};

export const TEAM_ROLE_LABELS: Record<TeamRole, string> = {
  ledare: 'Teamledare',
  senior: 'Senior Medarbetare',
  medarbetare: 'Medarbetare',
  lärling: 'Lärling',
};

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  fönsterputsning: 'Fönsterputsning',
  taktvätt: 'Taktvätt',
  fasadtvätt: 'Fasadtvätt',
  allmänt: 'Allmänt',
};

export const ASSIGNMENT_TYPE_LABELS: Record<AssignmentType, string> = {
  individual: 'Individ',
  team: 'Team',
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  meeting: 'Möte',
  task: 'Uppgift',
  reminder: 'Påminnelse',
};

// Status color helpers
export const getLeadStatusColor = (status: LeadStatus): string => {
  switch (status) {
    case 'new': return 'bg-blue-100 text-blue-800';
    case 'contacted': return 'bg-yellow-100 text-yellow-800';
    case 'qualified': return 'bg-purple-100 text-purple-800';
    case 'won': return 'bg-green-100 text-green-800';
    case 'lost': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const getQuoteStatusColor = (status: QuoteStatus): string => {
  switch (status) {
    case 'draft': return 'bg-gray-100 text-gray-800';
    case 'sent': return 'bg-blue-100 text-blue-800';
    case 'accepted': return 'bg-green-100 text-green-800';
    case 'declined': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const getJobStatusColor = (status: JobStatus): string => {
  switch (status) {
    case 'pending': return 'bg-yellow-100 text-yellow-800';
    case 'in_progress': return 'bg-blue-100 text-blue-800';
    case 'completed': return 'bg-green-100 text-green-800';
    case 'invoiced': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const getInvoiceStatusColor = (status: InvoiceStatus): string => {
  switch (status) {
    case 'draft': return 'bg-gray-100 text-gray-800';
    case 'sent': return 'bg-blue-100 text-blue-800';
    case 'paid': return 'bg-green-100 text-green-800';
    case 'overdue': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const getOrderStatusColor = (status: OrderStatus): string => {
  switch (status) {
    case 'öppen_order': return 'bg-blue-100 text-blue-800';
    case 'bokad_bekräftad': return 'bg-green-100 text-green-800';
    case 'avbokad_kund': return 'bg-red-100 text-red-800';
    case 'ej_slutfört': return 'bg-yellow-100 text-yellow-800';
    case 'redo_fakturera': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const getTeamSpecialtyColor = (specialty: TeamSpecialty): string => {
  switch (specialty) {
    case 'fönsterputsning': return 'bg-blue-100 text-blue-800';
    case 'taktvätt': return 'bg-green-100 text-green-800';
    case 'fasadtvätt': return 'bg-purple-100 text-purple-800';
    case 'allmänt': return 'bg-gray-100 text-gray-800';
    case 'övrigt': return 'bg-orange-100 text-orange-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const getTeamRoleColor = (role: TeamRole): string => {
  switch (role) {
    case 'ledare': return 'bg-red-100 text-red-800';
    case 'senior': return 'bg-purple-100 text-purple-800';
    case 'medarbetare': return 'bg-blue-100 text-blue-800';
    case 'lärling': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const getJobTypeColor = (jobType: JobType): string => {
  switch (jobType) {
    case 'fönsterputsning': return 'bg-blue-100 text-blue-800';
    case 'taktvätt': return 'bg-green-100 text-green-800';
    case 'fasadtvätt': return 'bg-purple-100 text-purple-800';
    case 'allmänt': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const getJobPriorityColor = (priority: JobPriority): string => {
  switch (priority) {
    case 'high': return 'bg-red-100 text-red-800';
    case 'normal': return 'bg-blue-100 text-blue-800';
    case 'low': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const getJobProgressColor = (progress: number): string => {
  if (progress >= 80) return 'bg-green-500';
  if (progress >= 50) return 'bg-yellow-500';
  if (progress >= 25) return 'bg-orange-500';
  return 'bg-red-500';
};