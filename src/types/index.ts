export type UserRole = 'admin' | 'staff' | 'client';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  name: string;
  clientId?: string;
}

export type ClientType = 'regular' | 'airbnb' | 'esporadico';
export type Frequency = 'mensal' | 'quinzenal' | 'semanal';
export type ServiceType = 'regular' | 'deep' | 'move_in' | 'move_out';
export type PaymentMethod = 'cash' | 'zelle' | 'venmo' | 'check' | 'apple_pay';

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

  // Notification related
  budgetRequested?: boolean;
  budgetSent?: boolean;
  nextPaymentDue?: string;
  assignedStaffIds?: string[];
  numberOfStaff?: number;
  generalNotes?: string;
}

export interface Cleaning {
  id?: string;
  clientId: string;
  clientName: string;
  clientAddress: string;
  clientType: ClientType;
  date: string;
  assignedStaffIds: string[];
  assignedStaffNames: string[];
  serviceValue: number;
  teamPaymentValue: number;
  status: 'scheduled' | 'on_the_way' | 'in_progress' | 'completed';
  startTime?: string;
  estimatedArrival?: string;
  scheduledTime?: string;
  notes?: string;
  photosBefore?: string[];
  photosAfter?: string[];
  extraPhotos?: string[];
  photosByClient?: string[];
  staffNotes?: string;
  clientFeedback?: string;
}

export interface BudgetResult {
  estimatedTime: number;
  totalValue: number;
}

export interface BudgetRequest {
  id?: string;
  clientName: string;
  email: string;
  phone: string;
  address: string;
  serviceType: 'light' | 'medium' | 'deep';
  extras: Record<string, number>;
  totalValue: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface PricingSettings {
  lightCleaning: number;
  mediumCleaning: number;
  deepCleaning: number;
  petAddon: number;
  windowAddon: number;
  fridgeAddon: number;
  ovenAddon: number;
  bedroomAddon: number;
  roomAddon: number;
  bathroomAddon: number;
}
