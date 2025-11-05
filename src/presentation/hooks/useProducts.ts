"use client";

import { useQuery } from "@tanstack/react-query";
import { SupabaseProductRepository } from "@/modules/inventory/infrastructure/repositories/supabase-product.repository";
import { GetAllProductsUseCase } from "@/modules/inventory/application/use-cases/get-all-products.use-case";
import { ProductEntity } from "@/modules/inventory/domain/entities/product.entity";
import { PaginatedResult } from "@/shared/types/pagination";

const productRepository = new SupabaseProductRepository();
const getAllProductsUseCase = new GetAllProductsUseCase(productRepository);

export function useProducts(enabled = true) {
  return useQuery<PaginatedResult<ProductEntity>>({
    queryKey: ["products", "all"],
    queryFn: () => getAllProductsUseCase.execute(),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
