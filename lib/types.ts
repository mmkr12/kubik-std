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
