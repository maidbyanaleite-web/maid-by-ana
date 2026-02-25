export type ClientType = 'Regular' | 'Airbnb';
export type ServiceType = 'Regular' | 'Deep Clean' | 'Move-in' | 'Move-out';
export type Frequency = 'Weekly' | 'Bi-weekly' | 'Monthly';
export type JobStatus = 'Scheduled' | 'On the way' | 'Started' | 'Finished' | 'Cancelled';

export interface Client {
  id: string;
  type: ClientType;
  name: string;
  owner_name?: string;
  property_name?: string;
  since?: string;
  address?: string;
  email?: string;
  phone?: string;
  frequency?: Frequency;
  property_link?: string;
  created_at: string;
}

export interface Job {
  id: string;
  client_id: string;
  client_name?: string;
  client_type?: ClientType;
  client_address?: string;
  service_type: ServiceType;
  service_value: number;
  staff_value: number;
  cleaning_date: string;
  payment_date?: string;
  payment_method?: string;
  status: JobStatus;
  notes?: string;
  photos?: string[];
  photos_before?: string; // JSON string array
  photos_after?: string; // JSON string array
}

export interface Stats {
  revenue: number;
  staffPay: number;
  profit: number;
  jobCount: number;
  clientCount: number;
  staffCount: number;
  pendingPayments: number;
}

export interface Quotation {
  id: string;
  type: 'Hourly' | 'Detailed';
  inputs: string; // JSON
  total_value: number;
  status?: string;
  created_at: string;
}

export interface Staff {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'Active' | 'Inactive';
  created_at: string;
}

export type UserRole = 'Admin' | 'Staff' | 'Client';

export interface AppUser {
  uid: string;
  email: string;
  role: UserRole;
  related_id?: string; // client_id or staff_id
}
