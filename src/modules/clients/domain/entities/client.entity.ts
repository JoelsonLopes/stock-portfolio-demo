import { CreatableEntity, ID } from "@/shared/types/common";

export interface Client extends CreatableEntity {
  code: string;
  client: string;
  city?: string;
  cnpj?: string;
  userId: ID;
}

export class ClientEntity implements Client {
  constructor(
    public readonly id: ID | null,
    public readonly code: string,
    public readonly client: string,
    public readonly userId: ID,
    public readonly createdAt: Date,
    public readonly updatedAt?: Date,
    public readonly city?: string,
    public readonly cnpj?: string
  ) {
    this.validateClient();
  }

  private validateClient(): void {
    if (!this.code || this.code.trim().length === 0) {
      throw new Error("Client code cannot be empty");
    }

    if (!this.client || this.client.trim().length === 0) {
      throw new Error("Client name cannot be empty");
    }

    if (!this.userId) {
      throw new Error(
        "Client must be associated with a user (userId required)"
      );
    }

    if (this.cnpj && !this.isValidCnpj(this.cnpj)) {
      throw new Error("Invalid CNPJ format");
    }
  }

  private isValidCnpj(cnpj: string): boolean {
    // Remove formatação
    const cleanCnpj = cnpj.replace(/[^\d]/g, "");

    // Permite CNPJ vazio
    if (cleanCnpj.length === 0) return true;

    // Permite CNPJs com qualquer tamanho até 14 dígitos
    if (cleanCnpj.length > 14) return false;

    // Se tem 14 dígitos, verifica se não são todos iguais
    if (cleanCnpj.length === 14 && /^(\d)\1+$/.test(cleanCnpj)) return false;

    return true; // Validação flexível
  }

  static create(props: {
    id: ID | null;
    code: string;
    client: string;
    userId: ID;
    createdAt: Date;
    updatedAt?: Date;
    city?: string;
    cnpj?: string;
  }): ClientEntity {
    return new ClientEntity(
      props.id,
      props.code.trim().toUpperCase(),
      props.client.trim().toUpperCase(),
      props.userId,
      props.createdAt,
      props.updatedAt,
      props.city?.trim().toUpperCase(),
      props.cnpj?.trim()
    );
  }

  getFormattedCnpj(): string {
    if (!this.cnpj) return "";

    const cleanCnpj = this.cnpj.replace(/[^\d]/g, "");

    // Se não tem 14 dígitos, retorna sem formatação
    if (cleanCnpj.length !== 14) return cleanCnpj;

    // Formata apenas CNPJs completos (14 dígitos)
    return cleanCnpj.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      "$1.$2.$3/$4-$5"
    );
  }

  getDisplayInfo(): string {
    const parts = [this.code, this.client];
    if (this.city) parts.push(this.city);
    return parts.join(" - ");
  }

  matchesSearch(query: string): boolean {
    const searchTerm = query.toLowerCase().trim();
    if (!searchTerm) return true;

    const searchableFields = [
      this.code,
      this.client,
      this.city,
      this.cnpj,
      this.getFormattedCnpj(),
    ].filter(Boolean);

    return searchableFields.some((field) =>
      field!.toLowerCase().includes(searchTerm)
    );
  }

  isActive(): boolean {
    return true; // Por enquanto, todos os clientes são considerados ativos
  }

  belongsToUser(userId: ID): boolean {
    return this.userId === userId;
  }

  getUserOwnership(): ID {
    return this.userId;
  }

  hasChanges(other: ClientEntity): boolean {
    return (
      this.client !== other.client ||
      this.city !== other.city ||
      this.cnpj !== other.cnpj
    );
  }

  getChangedFields(other: ClientEntity): string[] {
    const changes: string[] = [];
    
    if (this.client !== other.client) {
      changes.push(`nome: "${other.client}" → "${this.client}"`);
    }
    
    if (this.city !== other.city) {
      changes.push(`cidade: "${other.city}" → "${this.city}"`);
    }
    
    if (this.cnpj !== other.cnpj) {
      changes.push(`cnpj: "${other.cnpj || 'vazio'}" → "${this.cnpj || 'vazio'}"`);
    }
    
    return changes;
  }
}
