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

// ---------------------------------------------------------------------
// Сотрудники, роли, техкарты, операции, зарплаты
// ---------------------------------------------------------------------

export type PayrollMethod = 'fixed' | 'percent' | 'hourly';

export interface Role {
  id: string;
  key: string;
  name: string;
  description: string | null;
  responsibilities: string | null;
  payroll_method: PayrollMethod;
  payroll_rate: number;
  active: boolean;
}

export type EmployeeStatus = 'working' | 'vacation' | 'fired';

export interface Employee {
  id: string;
  auth_user_id: string | null;
  full_name: string;
  photo_url: string | null;
  phone: string | null;
  hire_date: string | null;
  status: EmployeeStatus;
  is_admin: boolean;
  created_at: string;
}

export interface EmployeeRole {
  id: string;
  employee_id: string;
  role_id: string;
  assigned_at: string;
  unassigned_at: string | null;
  role?: Role;
}

export interface OperationTemplate {
  id: string;
  product_type_id: string;
  key: string;
  name: string;
  role_id: string | null;
  default_employee_id: string | null;
  cost: number;
  norm_hours: number;
  required: boolean;
  allows_parallel: boolean;
  depends_on_keys: string[];
  sort_order: number;
}

export type OperationStatus = 'locked' | 'available' | 'in_progress' | 'done';

export interface OrderOperation {
  id: string;
  order_item_id: string;
  operation_template_id: string | null;
  key: string;
  name: string;
  role_id: string | null;
  assigned_employee_id: string | null;
  cost: number;
  norm_hours: number;
  required: boolean;
  allows_parallel: boolean;
  depends_on_keys: string[];
  status: OperationStatus;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface PayrollAccrual {
  id: string;
  employee_id: string;
  role_id: string | null;
  order_operation_id: string | null;
  request_id: string | null;
  amount: number;
  accrued_at: string;
  status: 'pending' | 'paid';
  paid_at: string | null;
  payout_id: string | null;
}

export interface Material {
  id: string;
  name: string;
  unit: string;
  active: boolean;
  sort_order: number;
}

export interface ProcurementChecklist {
  id: string;
  week_start: string;
  status: 'draft' | 'printed';
  created_at: string;
}

export interface ProcurementChecklistItem {
  id: string;
  checklist_id: string;
  material_id: string | null;
  quantity_needed: number;
  note: string | null;
  material?: Material;
}

export interface MondayChecklistItem {
  id: string;
  title: string;
  sort_order: number;
  active: boolean;
}

export interface CorporateEvent {
  id: string;
  title: string;
  event_date: string;
  description: string | null;
}
