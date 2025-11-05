import { Query } from "@/shared/types/common";
import { PaginationOptions } from "@/shared/types/pagination";
import type { Client } from "../../domain/entities/client.entity";
import type { ClientRepository } from "../../domain/repositories/client.repository";

export type GetAllClientsRequest = {
  pagination?: PaginationOptions;
};

export interface GetAllClientsResponse {
  clients: Client[];
  total: number;
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
}

export class GetAllClientsQuery
  implements Query<GetAllClientsRequest, GetAllClientsResponse>
{
  constructor(private readonly clientRepository: ClientRepository) {}

  async execute(request: GetAllClientsRequest): Promise<GetAllClientsResponse> {
    try {
      const result = await this.clientRepository.findAll(request.pagination);

      return {
        clients: result.data,
        total: result.totalCount,
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        hasMore: result.hasMore,
      };
    } catch (error) {
      console.error("Error getting all clients:", error);
      return {
        clients: [],
        total: 0,
        currentPage: 1,
        totalPages: 0,
        hasMore: false,
      };
    }
  }
}
