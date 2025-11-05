import { useQuery } from "@tanstack/react-query";

interface OrderSearchParams {
  query?: string;
  status?: string;
  clientId?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  pageSize: number;
  enabled?: boolean;
}

interface OrderItem {
  id: string;
  product_id: number;
  product_code: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  original_unit_price: number;
  discount_id?: string;
  discount_percentage: number;
  discount_amount: number;
  total_price: number;
  commission_percentage: number;
  client_ref?: string;
}

interface Order {
  id: string;
  order_number: string;
  status:
    | "draft"
    | "confirmed"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled";
  subtotal: number;
  total_discount: number;
  total_commission: number;
  total: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  client_id: number;
  payment_condition_id: string;
  user_id: string;
  clients: {
    id: number;
    code: string;
    client: string;
  };
  payment_conditions: {
    id: string;
    name: string;
  };
  order_items: OrderItem[];
}

interface OrderSearchResponse {
  data: Order[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export function useOrderSearch({
  query = "",
  status,
  clientId,
  dateFrom,
  dateTo,
  page,
  pageSize,
  enabled = true,
}: OrderSearchParams) {
  return useQuery<OrderSearchResponse, Error>({
    queryKey: [
      "orders",
      "search",
      { query, status, clientId, dateFrom, dateTo, page, pageSize },
    ],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (query) params.append("search", query);
      if (status) params.append("status", status);
      if (clientId) params.append("clientId", clientId);
      if (dateFrom) params.append("dateFrom", dateFrom);
      if (dateTo) params.append("dateTo", dateTo);

      params.append("page", page.toString());
      params.append("limit", pageSize.toString());

      const response = await fetch(`/api/orders?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const apiResponse = await response.json();

      // Adaptar resposta da API para o formato esperado pelo frontend
      return {
        data: apiResponse.orders || [],
        total: apiResponse.totalCount || 0,
        page: apiResponse.page || 1,
        pageSize: apiResponse.limit || pageSize,
        hasMore: apiResponse.page * apiResponse.limit < apiResponse.totalCount,
      };
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false,
  });
}

// Hook para buscar pedido específico
export function useOrder(id: string) {
  return useQuery<Order, Error>({
    queryKey: ["orders", id],
    queryFn: async () => {
      const response = await fetch(`/api/orders/${id}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const apiResponse = await response.json();

      return apiResponse.order || apiResponse;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}
