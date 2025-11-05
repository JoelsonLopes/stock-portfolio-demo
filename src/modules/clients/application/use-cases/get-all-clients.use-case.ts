import { PaginatedResult } from "@/shared/types/pagination";
import { ClientEntity } from "../../domain/entities/client.entity";
import type { ClientRepository } from "../../domain/repositories/client.repository";

export class GetAllClientsUseCase {
  constructor(private clientRepository: ClientRepository) {}

  async execute(): Promise<PaginatedResult<ClientEntity>> {
    return await this.clientRepository.findAll();
  }
}
