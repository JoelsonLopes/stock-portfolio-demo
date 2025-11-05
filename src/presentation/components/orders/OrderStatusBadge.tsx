import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils";

type OrderStatus =
  | "draft"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

const statusConfig = {
  draft: {
    label: "Rascunho",
    variant: "secondary" as const,
    className: "bg-gray-100 text-gray-800 border-gray-200",
  },
  confirmed: {
    label: "Confirmado",
    variant: "default" as const,
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  processing: {
    label: "Processando",
    variant: "default" as const,
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  shipped: {
    label: "Enviado",
    variant: "default" as const,
    className: "bg-purple-100 text-purple-800 border-purple-200",
  },
  delivered: {
    label: "Entregue",
    variant: "default" as const,
    className: "bg-green-100 text-green-800 border-green-200",
  },
  cancelled: {
    label: "Cancelado",
    variant: "destructive" as const,
    className: "bg-red-100 text-red-800 border-red-200",
  },
};

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const config = statusConfig[status];

  if (!config) {
    return (
      <Badge variant="secondary" className={className}>
        Status desconhecido
      </Badge>
    );
  }

  return (
    <Badge variant={config.variant} className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
