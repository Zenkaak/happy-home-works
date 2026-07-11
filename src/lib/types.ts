export interface Product {
  id: string;
  name: string;
  description: string | null;
  category: 'data' | 'kplc' | 'loans' | 'test';
  network: 'safaricom' | 'airtel' | 'telkom' | null;
  data_amount: string | null;
  minutes: string | null;
  price: number;
  units: string | null;
  is_visible: boolean;
  is_promo: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  order_number: number;
  product_id: string | null;
  package_name: string;
  category: string;
  network: string | null;
  phone_number: string;
  service_number: string | null;
  meter_number: string | null;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  mpesa_reference: string | null;
  kplc_token: string | null;
  stk_checkout_id: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
}

export type ServiceCategory = 'data' | 'kplc' | 'loans' | 'test';
export type NetworkProvider = 'safaricom' | 'airtel' | 'telkom';
