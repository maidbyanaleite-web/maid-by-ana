export type UserRole = 'admin' | 'staff';
export type Language = 'en' | 'pt';

export interface Client {
  id: string | number;
  type: 'regular' | 'airbnb';
  name: string;
  owner_name?: string;
  property_name?: string; // Nome da propriedade para Airbnb
  address: string;
  email: string;
  phone: string;
  // Melhorar a tipagem da frequência para evitar erros
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'one-time' | string;
  property_link?: string;
  created_at: string; // ISO format: YYYY-MM-DD
  mandatory_photos?: string[];
}

export interface Service {
  id: string | number;
  client_id: string | number;
  client_name?: string;
  client_type?: 'regular' | 'airbnb' | string;
  date: string; // ISO format: YYYY-MM-DD
  service_type: string;
  service_value: number;
  staff_value: number;
  payment_status: 'pending' | 'paid';
  payment_method?: string;
  payment_date?: string;
  notes?: string;
}

export interface Quotation {
  id: string | number;
  client_name: string;
  type: 'hourly' | 'detailed';
  details: any;
  total: number;
  created_at: string;
  sent: boolean; // Alterado de number para boolean para facilitar o uso no React
}

export interface Notification {
  id: string | number;
  user_role: UserRole;
  title: string;
  message: string;
  is_read: boolean; // Alterado de number para boolean
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
  label?: string; // Ex: "Living Room", "Bathroom"
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
  extra_mandatory_photos?: string[];
  status: 'in_progress' | 'completed';
  created_at: string;
}