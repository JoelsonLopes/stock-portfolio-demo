import { CreatableRepository } from "@/shared/types/common";
import { PaginatedResult, PaginationOptions } from "@/shared/types/pagination";
import { ClientEntity } from "../entities/client.entity";

export interface ClientSearchCriteria {
  query?: string;
  city?: string;
  active?: boolean;
}

export interface ClientRepository extends CreatableRepository<ClientEntity> {
  findAll(options?: PaginationOptions): Promise<PaginatedResult<ClientEntity>>;
  findByCode(code: string): Promise<ClientEntity | null>;
  findByCnpj(cnpj: string): Promise<ClientEntity | null>;
  findByCity(city: string): Promise<ClientEntity[]>;
  findById(id: string | number): Promise<ClientEntity | null>;
  findByCodes(codes: string[]): Promise<ClientEntity[]>;
  search(
    query: string,
    page?: number,
    pageSize?: number
  ): Promise<{ data: ClientEntity[]; total: number }>;
}
