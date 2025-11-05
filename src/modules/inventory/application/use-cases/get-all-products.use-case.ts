import { PaginatedResult } from "@/shared/types/pagination";
import { ProductEntity } from "../../domain/entities/product.entity";
import type { ProductRepository } from "../../domain/repositories/product.repository";

export class GetAllProductsUseCase {
  constructor(private productRepository: ProductRepository) {}

  async execute(): Promise<PaginatedResult<ProductEntity>> {
    return await this.productRepository.findAll();
  }
}
