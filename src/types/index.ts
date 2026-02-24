export type UserRole = 'admin' | 'staff';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  name: string;
}

export type ClientType = 'regular' | 'airbnb';
export type Frequency = 'mensal' | 'quinzenal' | 'semanal';
export type ServiceType = 'regular' | 'deep' | 'move_in' | 'move_out';
export type PaymentMethod = 'cash' | 'zelle' | 'venmo' | 'check';

export interface Client {
  id?: string;
  type: ClientType;
  name: string;
  clientSince: string;
  address: string;
  email: string;
  phone: string;
  frequency: Frequency;
  serviceType: ServiceType;
  extras: {
    fridge: boolean;
    oven: boolean;
  };
  serviceValue: number;
  teamPaymentValue: number;
  cleaningDates: string[];
  paymentDates: string[];
  paymentMethod: PaymentMethod;
  gallery: string[];
  
  // Airbnb specific
  ownerName?: string;
  propertyName?: string;
  propertyLink?: string;
  reviews?: string[];
}

export interface BudgetResult {
  estimatedTime: number;
  totalValue: number;
}
