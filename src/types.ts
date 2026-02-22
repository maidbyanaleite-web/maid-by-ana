export type UserRole = 'admin' | 'staff';
export type Language = 'en' | 'pt';

export interface Client {
  id: number;
  type: 'regular' | 'airbnb';
  name: string;
  owner_name?: string;
  property_name?: string;
  address: string;
  email: string;
  phone: string;
  frequency: string;
  property_link?: string;
  created_at: string;
}

export interface Service {
  id: number;
  client_id: number;
  client_name?: string;
  client_type?: string;
  date: string;
  service_type: string;
  service_value: number;
  staff_value: number;
  payment_status: 'pending' | 'paid';
  payment_method?: string;
  payment_date?: string;
  notes?: string;
}

export interface Quotation {
  id: number;
  client_name: string;
  type: 'hourly' | 'detailed';
  details: any;
  total: number;
  created_at: string;
  sent: number;
}

export interface Notification {
  id: number;
  user_role: UserRole;
  title: string;
  message: string;
  is_read: number;
  created_at: string;
}
