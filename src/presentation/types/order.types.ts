export interface OrderItem {
  id: string;
  product_id: number; // BIGINT do PostgreSQL
  product_code?: string; // Apenas para exibição no frontend
  product_name?: string; // Apenas para exibição no frontend
  product_group_name?: string; // Nome do grupo do produto para exibição
  quantity: number;
  unit_price: number;
  original_unit_price: number;
  discount_id?: string;
  discount_percentage: number;
  discount_amount: number;
  discount_name?: string;
  total_price: number;
  commission_percentage: number;
  client_ref?: string;
  pending_quantity?: number; // Quantidade pendente quando excede estoque
  has_pending?: boolean; // Flag indicando se tem pendência
  created_at: string;
  updated_at: string;
}

export interface Discount {
  id: string;
  name: string;
  discount_percentage: number | string;
  commission_percentage: number | string;
}

export interface PaymentCondition {
  id: string;
  name: string;
  description: string;
  installments: number;
  is_cash: boolean;
}

export interface OrderFormData {
  client_id: string | null; // ✅ UUID como string
  payment_condition_id: string | null;
  notes: string;
  items: OrderItem[];
  shipping_rate: number;
  status?: string; // Status do pedido (opcional para criação)
  has_pending_items?: boolean; // Flag indicando se o pedido tem itens pendentes
}
