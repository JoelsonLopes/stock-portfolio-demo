import { Result, UseCase } from "@/shared/types/common";
import { ClientEntity } from "../../domain/entities/client.entity";
import { ClientRepository } from "../../domain/repositories/client.repository";

export interface ImportClientsRequest {
  clients: Array<{
    code: string;
    client: string;
    city: string;
    cnpj?: string;
    user_id: string;
  }>;
  allowUpdates?: boolean;
}

export interface ImportClientsResponse {
  success: boolean;
  count: number;
  message: string;
  totalProcessed: number;
  errors: string[];
  inserted: number;
  updated: number;
  unchanged: number;
  updateDetails: Array<{
    code: string;
    changes: string[];
  }>;
}

export class ImportClientsUseCase
  implements UseCase<ImportClientsRequest, ImportClientsResponse>
{
  constructor(private readonly clientRepository: ClientRepository) {}

  async execute(
    request: ImportClientsRequest
  ): Promise<Result<ImportClientsResponse>> {
    try {
      const { clients, allowUpdates = false } = request;

      if (!clients || !Array.isArray(clients)) {
        return {
          success: false,
          error: new Error("Dados de clientes inválidos"),
        };
      }

      // Validar e criar entidades do domínio
      const validClients: ClientEntity[] = [];
      const errors: string[] = [];

      for (let i = 0; i < clients.length; i++) {
        const clientData = clients[i];

        try {
          const clientEntity = ClientEntity.create({
            id: null,
            code: clientData.code,
            client: clientData.client,
            userId: clientData.user_id,
            createdAt: new Date(),
            city: clientData.city,
            cnpj: clientData.cnpj,
          });

          validClients.push(clientEntity);
        } catch (error) {
          errors.push(
            `Linha ${i + 1}: ${
              error instanceof Error ? error.message : "Erro desconhecido"
            }`
          );
        }
      }

      if (validClients.length === 0) {
        return {
          success: false,
          error: new Error(
            `Nenhum cliente válido para importar. Erros: ${errors.join("; ")}`
          ),
        };
      }

      // Buscar clientes existentes por código em lote
      const codes = validClients.map(c => c.code);
      const existingClients = await this.clientRepository.findByCodes(codes);
      const existingCodeMap = new Map(existingClients.map(c => [c.code, c]));

      // Verificar duplicatas de CNPJ apenas para novos clientes
      const cnpjErrors = await this.checkCnpjDuplicates(validClients, existingCodeMap, allowUpdates);
      if (cnpjErrors.length > 0) {
        errors.push(...cnpjErrors);
      }

      // Separar em inserções, atualizações e sem alterações
      const toInsert: ClientEntity[] = [];
      const toUpdate: ClientEntity[] = [];
      const unchanged: ClientEntity[] = [];
      const updateDetails: Array<{ code: string; changes: string[] }> = [];

      for (const newClient of validClients) {
        const existing = existingCodeMap.get(newClient.code);
        
        if (!existing) {
          // Cliente não existe, será inserido
          toInsert.push(newClient);
        } else if (allowUpdates) {
          // Cliente existe, verificar se há mudanças
          if (newClient.hasChanges(existing)) {
            // Preservar ID e user_id do cliente existente
            const updatedClient = ClientEntity.create({
              id: existing.id,
              code: newClient.code,
              client: newClient.client,
              city: newClient.city,
              cnpj: newClient.cnpj,
              userId: existing.userId, // Mantém o usuário original
              createdAt: existing.createdAt,
              updatedAt: new Date(),
            });
            
            toUpdate.push(updatedClient);
            updateDetails.push({
              code: newClient.code,
              changes: newClient.getChangedFields(existing)
            });
          } else {
            unchanged.push(existing);
          }
        } else {
          // Cliente existe mas atualizações não são permitidas
          errors.push(`Código ${newClient.code} já existe no banco`);
        }
      }

      // Executar inserções e atualizações
      let insertedCount = 0;
      let updatedCount = 0;
      const saveErrors: string[] = [];

      // Inserir novos clientes
      for (const client of toInsert) {
        try {
          await this.clientRepository.save(client);
          insertedCount++;
        } catch (error) {
          saveErrors.push(
            `Erro ao inserir cliente ${client.code}: ${
              error instanceof Error ? error.message : "Erro desconhecido"
            }`
          );
        }
      }

      // Atualizar clientes existentes
      for (const client of toUpdate) {
        try {
          await this.clientRepository.save(client);
          updatedCount++;
        } catch (error) {
          saveErrors.push(
            `Erro ao atualizar cliente ${client.code}: ${
              error instanceof Error ? error.message : "Erro desconhecido"
            }`
          );
        }
      }

      const totalSuccess = insertedCount + updatedCount;
      
      return {
        success: true,
        data: {
          success: totalSuccess > 0,
          count: totalSuccess,
          message: this.buildSuccessMessage(insertedCount, updatedCount, unchanged.length),
          totalProcessed: clients.length,
          errors: [...errors, ...saveErrors],
          inserted: insertedCount,
          updated: updatedCount,
          unchanged: unchanged.length,
          updateDetails,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error
            : new Error("Erro interno do servidor"),
      };
    }
  }

  private async checkCnpjDuplicates(
    clients: ClientEntity[], 
    existingCodeMap: Map<string, ClientEntity>,
    allowUpdates: boolean
  ): Promise<string[]> {
    const errors: string[] = [];
    const cnpjsToCheck: string[] = [];

    // Coletar CNPJs que precisam ser verificados
    for (const client of clients) {
      if (!client.cnpj) continue;

      const existing = existingCodeMap.get(client.code);
      
      if (!existing) {
        // Cliente novo, verificar CNPJ
        cnpjsToCheck.push(client.cnpj);
      } else if (allowUpdates && client.cnpj !== existing.cnpj) {
        // Cliente existe mas CNPJ mudou, verificar se novo CNPJ já existe
        cnpjsToCheck.push(client.cnpj);
      }
    }

    // Verificar CNPJs no banco
    for (const cnpj of cnpjsToCheck) {
      const existing = await this.clientRepository.findByCnpj(cnpj);
      if (existing) {
        errors.push(`CNPJ ${cnpj} já existe no banco`);
      }
    }

    return errors;
  }

  private buildSuccessMessage(inserted: number, updated: number, unchanged: number): string {
    const parts: string[] = [];
    
    if (inserted > 0) {
      parts.push(`${inserted} inseridos`);
    }
    
    if (updated > 0) {
      parts.push(`${updated} atualizados`);
    }
    
    if (unchanged > 0) {
      parts.push(`${unchanged} sem alterações`);
    }
    
    return parts.join(', ');
  }
}
