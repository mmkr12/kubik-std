export type OrderStatus = 'measurement' | 'lost' | 'production' | 'done';

export interface Order {
  id: string;
  company_name: string;
  phone: string;
  address: string | null;
  comment: string | null;
  cost: number | null;
  sketch_url: string | null;
  install_date: string | null;
  status: OrderStatus;
  finished_photo_url: string | null;
  created_at: string;
  started_production_at: string | null;
  finished_at: string | null;
}

export interface CalculatorSettings {
  id: string;
  sign_type_prices: Record<string, number>; // per m
  coefficients: Record<string, number>;
  gifts: string[];
  kp_text: string;
  offer_valid_hours: number;
  updated_at: string;
}

export interface CalculatorInput {
  signType: string;
  widthM: number;
  heightCm: number;
  backlight: boolean;
}

// ---------------------------------------------------------------------
// ERP: клиенты, типы изделий, заявки, позиции работ
// ---------------------------------------------------------------------

export type RequestStatus = 'measurement' | 'draft' | 'in_production' | 'done' | 'lost';

export interface Client {
  id: string;
  phone: string;
  name: string | null;
  created_at: string;
}

export interface ClientTotals extends Client {
  requests_count: number;
  total_revenue: number;
  last_request_at: string | null;
}

export type InstallMode = 'included' | 'complexity' | 'manual';

export interface ProductTypeNorm {
  max_area_m2: number | null;
  manufacture_hours_min: number;
  manufacture_hours_max: number;
  install_hours_min: number | null;
  install_hours_max: number | null;
}

export interface ProductType {
  id: string;
  key: string;
  name: string;
  unit: 'm2' | 'pcs';
  price_per_unit: number;
  norms: ProductTypeNorm[];
  install_mode: InstallMode;
  schedule_days: string[];
  needs_review: boolean;
  active: boolean;
  sort_order: number;
}

export type InstallComplexity = 'light' | 'medium' | 'medium_large' | 'hard';
export type InstallCity = 'taraz' | 'shymkent' | 'almaty';

export interface OrderItem {
  id: string;
  request_id: string;
  product_type_id: string;
  params: Record<string, unknown>;
  manufacture_hours: number | null;
  install_complexity: InstallComplexity | null;
  install_city: InstallCity;
  sunday_client_requested: boolean;
  weekday_surcharge_applied: boolean;
  item_cost: number;
  install_cost: number;
  created_at: string;
}

export interface ERPRequest {
  id: string;
  client_id: string | null;
  status: RequestStatus;
  needs_measurement: boolean;
  name: string;
  phone: string;
  address: string | null;
  comment: string | null;
  sketch_url: string | null;
  finished_photo_url: string | null;
  recommended_install_date: string | null;
  install_date: string | null;
  manual_override: boolean;
  total_cost: number;
  created_at: string;
  started_production_at: string | null;
  finished_at: string | null;
}
