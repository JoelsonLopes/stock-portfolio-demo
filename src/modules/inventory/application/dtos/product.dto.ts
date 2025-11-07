import { ProductID } from "@/shared/types/common";
import type { Product } from "../../domain/entities/product.entity";

export interface ProductDTO {
  id: ProductID;
  product: string;
  stock: number;
  price: number;
  application?: string;
  group_id?: number | null;
  product_groups?: { name: string | null } | null;
  created_at: string;
  updated_at?: string;
}

export class ProductMapper {
  static toDomain(dto: ProductDTO): Product {
    return {
      id: dto.id,
      product: dto.product,
      stock: dto.stock,
      price: dto.price,
      application: dto.application,
      groupId: dto.group_id ?? null,
      groupName: dto.product_groups?.name ?? null,
      createdAt: new Date(dto.created_at),
      updatedAt: dto.updated_at ? new Date(dto.updated_at) : undefined,
    };
  }

  static toDTO(domain: Product): ProductDTO {
    return {
      id: domain.id,
      product: domain.product,
      stock: domain.stock,
      price: domain.price,
      application: domain.application,
      group_id: domain.groupId ?? null,
      product_groups: { name: domain.groupName ?? null },
      created_at: domain.createdAt.toISOString(),
      updated_at: domain.updatedAt?.toISOString(),
    };
  }
}
