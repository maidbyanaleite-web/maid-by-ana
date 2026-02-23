export type UserRole = 'admin' | 'staff';
export type Language = 'en' | 'pt';

export interface Client {
  id: number | string;
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
  mandatory_photos?: string[];
}

export interface Service {
  id: number | string;
  client_id: number | string;
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
  id: number | string;
  client_name: string;
  type: 'hourly' | 'detailed';
  details: any;
  total: number;
  created_at: string;
  sent: number;
}

export interface Notification {
  id: number | string;
  user_role: UserRole;
  title: string;
  message: string;
  is_read: number;
  created_at: string;
}

export interface Settings {
  company_name: string;
  company_subtitle: string;
  company_address: string;
  company_logo?: string;
}

export interface InspectionPhoto {
  url: string;
  comment?: string;
  admin_reply?: string;
  timestamp: string;
}

export interface InspectionReport {
  id: string;
  service_id: string;
  client_id: string | number;
  check_in_photos: InspectionPhoto[];
  check_out_photos: {
    category: string;
    photos: InspectionPhoto[];
  }[];
  audit_photos: InspectionPhoto[];
  status: 'in_progress' | 'completed';
  created_at: string;
}
