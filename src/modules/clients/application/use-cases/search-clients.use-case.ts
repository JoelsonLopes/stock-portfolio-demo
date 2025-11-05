import { ClientEntity } from "../../domain/entities/client.entity";
import type { ClientRepository } from "../../domain/repositories/client.repository";

interface SearchClientsInput {
  query: string;
  page: number;
  pageSize: number;
}

export class SearchClientsUseCase {
  constructor(private clientRepository: ClientRepository) {}

  async execute({ query, page, pageSize }: SearchClientsInput): Promise<{
    data: ClientEntity[];
    total: number;
  }> {
    try {
      // Buscar clientes diretamente
      const searchResult = await this.clientRepository.search(
        query,
        page,
        pageSize
      );

      return {
        data: searchResult.data,
        total: searchResult.total,
      };
    } catch (error) {
      console.error("Error in SearchClientsUseCase:", error);
      return { data: [], total: 0 };
    }
  }
}
