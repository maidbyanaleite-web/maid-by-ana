export interface Client {
  id: number;
  type: 'regular' | 'airbnb';
  name: string;
  since?: string;
  address?: string;
  email?: string;
  phone?: string;
  frequency?: string;
  property_name?: string;
  property_link?: string;
  reviews?: string;
}

export interface Service {
  id: number;
  client_id: number;
  client_name: string;
  client_address: string;
  client_type: 'regular' | 'airbnb';
  service_type: string;
  extras: string; // JSON string
  service_value: number;
  staff_pay: number;
  service_date: string;
  payment_date?: string;
  payment_method?: string;
  status: 'scheduled' | 'completed' | 'paid';
  photos_before?: string;
  photos_after?: string;
}

export interface Quotation {
  id: number;
  client_name: string;
  type: 'hourly' | 'detailed';
  inputs: string;
  total_value: number;
  created_at: string;
}

export interface Stats {
  revenue: number;
  staffPay: number;
  profit: number;
  clients: number;
  services: number;
}

export type UserRole = 'admin' | 'staff';
