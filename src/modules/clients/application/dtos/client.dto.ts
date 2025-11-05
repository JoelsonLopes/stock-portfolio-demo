import { ID } from "@/shared/types/common";
import type { Client } from "../../domain/entities/client.entity";

export interface ClientDTO {
  id: ID | null;
  code: string;
  client: string;
  city?: string;
  cnpj?: string;
  user_id: ID;
  created_at: string;
  updated_at?: string;
}

export class ClientMapper {
  static toDomain(dto: ClientDTO): Client {
    return {
      id: dto.id,
      code: dto.code,
      client: dto.client,
      city: dto.city,
      cnpj: dto.cnpj,
      userId: dto.user_id,
      createdAt: new Date(dto.created_at),
      updatedAt: dto.updated_at ? new Date(dto.updated_at) : undefined,
    };
  }

  static toDTO(domain: Client): ClientDTO {
    return {
      id: domain.id,
      code: domain.code,
      client: domain.client,
      city: domain.city,
      cnpj: domain.cnpj,
      user_id: domain.userId,
      created_at: domain.createdAt.toISOString(),
      updated_at: domain.updatedAt?.toISOString(),
    };
  }
}
