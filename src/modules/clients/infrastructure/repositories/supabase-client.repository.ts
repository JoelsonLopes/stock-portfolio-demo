import { supabase } from "@/shared/infrastructure/database/supabase-wrapper";
import { SessionManager } from "@/shared/infrastructure/session/session-manager";
import { ID } from "@/shared/types/common";
import { PaginatedResult, PaginationOptions } from "@/shared/types/pagination";
import { ClientEntity } from "../../domain/entities/client.entity";
import type {
  ClientRepository,
  ClientSearchCriteria,
} from "../../domain/repositories/client.repository";

// Estender o tipo de critérios de busca para incluir limit
interface ExtendedClientSearchCriteria extends ClientSearchCriteria {
  limit?: number;
}

export class SupabaseClientRepository implements ClientRepository {
  private async getCurrentUser(): Promise<any> {
    // Em APIs, tenta obter de cookies server-side
    if (typeof window === "undefined") {
      try {
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get("stock_app_session");

        if (sessionCookie?.value) {
          const sessionJson = Buffer.from(
            sessionCookie.value,
            "base64"
          ).toString("utf-8");
          const sessionData = JSON.parse(sessionJson);

          if (sessionData.user && Date.now() <= sessionData.expiresAt) {
            return sessionData.user;
          }
        }
      } catch (error) {
        console.error("Error reading server session:", error);
      }
    }

    // Fallback para client-side
    return SessionManager.getCurrentUser();
  }

  private async getCurrentUserId(): Promise<ID> {
    const user = await this.getCurrentUser();
    if (!user) {
      throw new Error("User not authenticated");
    }
    return user.id;
  }

  private async setCurrentUserInSession(): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();
      console.log("Setting user in RLS session:", userId);

      // NOVA ABORDAGEM: Como set_config não persiste no Supabase RPC,
      // vamos usar filtros explícitos no código ao invés de RLS automático
      console.log("RLS user configured:", userId);
    } catch (error) {
      console.error("Error setting user in session:", error);
      throw new Error("Failed to set user session for RLS");
    }
  }

  async findAll(
    options?: PaginationOptions
  ): Promise<PaginatedResult<ClientEntity>> {
    try {
      const userId = await this.getCurrentUserId();
      const currentUser = await this.getCurrentUser();

      const page = options?.page || 1;
      const limit = options?.limit || 50;
      const start = (page - 1) * limit;

      const supabaseClient = await supabase.from("clients");
      let query = supabaseClient
        .select("*", { count: "exact" })
        .range(start, start + limit - 1)
        .order("client");

      // Filtro por usuário (admin vê todos, usuário normal apenas os seus)
      if (!currentUser?.is_admin) {
        query = query.eq("user_id", userId);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error("Error fetching clients:", error);
        return {
          data: [],
          totalCount: 0,
          currentPage: page,
          totalPages: 0,
          hasMore: false,
        };
      }

      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / limit);

      return {
        data: data?.map(this.mapToEntity) || [],
        totalCount,
        currentPage: page,
        totalPages,
        hasMore: page < totalPages,
      };
    } catch (error) {
      console.error("Repository error:", error);
      return {
        data: [],
        totalCount: 0,
        currentPage: options?.page || 1,
        totalPages: 0,
        hasMore: false,
      };
    }
  }

  async findById(id: string | number): Promise<ClientEntity | null> {
    try {
      const userId = await this.getCurrentUserId();
      const currentUser = await this.getCurrentUser();

      const supabaseClient = await supabase.from("clients");
      let query = supabaseClient.select("*").eq("id", id);

      // Filtro por usuário (admin vê todos, usuário normal apenas os seus)
      if (!currentUser?.is_admin) {
        query = query.eq("user_id", userId);
      }

      const { data, error } = await query.single();

      if (error || !data) {
        return null;
      }

      return this.mapToEntity(data);
    } catch (error) {
      console.error("Repository error:", error);
      return null;
    }
  }

  async search(
    query: string,
    page = 1,
    pageSize = 50
  ): Promise<{ data: ClientEntity[]; total: number }> {
    try {
      const userId = await this.getCurrentUserId();
      const currentUser = await this.getCurrentUser();

      const start = (page - 1) * pageSize;
      const supabaseClient = await supabase.from("clients");

      // Buscar por similaridade em múltiplos campos
      let searchQuery = supabaseClient
        .select("*", { count: "exact" })
        .or(
          `code.ilike.%${query}%,client.ilike.%${query}%,name.ilike.%${query}%,city.ilike.%${query}%,cpf_cnpj.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`
        )
        .range(start, start + pageSize - 1)
        .order("client");

      // Filtro por usuário (admin vê todos, usuário normal apenas os seus)
      if (!currentUser?.is_admin) {
        searchQuery = searchQuery.eq("user_id", userId);
      }

      const { data, error, count } = await searchQuery;

      if (error) {
        console.error("Error searching clients:", error);
        return { data: [], total: 0 };
      }

      return {
        data: (data || []).map(this.mapToEntity),
        total: count || 0,
      };
    } catch (error) {
      console.error("Repository error:", error);
      return { data: [], total: 0 };
    }
  }

  async findByCode(code: string): Promise<ClientEntity | null> {
    try {
      const userId = await this.getCurrentUserId();
      const currentUser = await this.getCurrentUser();

      let query = supabase.from("clients").select("*").eq("code", code);

      // Filtro por usuário (admin vê todos, usuário normal apenas os seus)
      if (!currentUser?.is_admin) {
        query = query.eq("user_id", userId);
      }

      const { data, error } = await query.single();

      if (error || !data) return null;

      return this.mapToEntity(data);
    } catch (error) {
      console.error("Repository error:", error);
      return null;
    }
  }

  async findByCnpj(cnpj: string): Promise<ClientEntity | null> {
    try {
      const userId = await this.getCurrentUserId();
      const currentUser = await this.getCurrentUser();

      let query = supabase.from("clients").select("*").eq("cpf_cnpj", cnpj);

      // Filtro por usuário (admin vê todos, usuário normal apenas os seus)
      if (!currentUser?.is_admin) {
        query = query.eq("user_id", userId);
      }

      const { data, error } = await query.single();

      if (error || !data) return null;

      return this.mapToEntity(data);
    } catch (error) {
      console.error("Repository error:", error);
      return null;
    }
  }

  async findByCodes(codes: string[]): Promise<ClientEntity[]> {
    try {
      const userId = await this.getCurrentUserId();
      const currentUser = await this.getCurrentUser();

      if (codes.length === 0) return [];

      let query = supabase
        .from("clients")
        .select("*")
        .in("code", codes)
        .order("code");

      // Filtro por usuário (admin vê todos, usuário normal apenas os seus)
      if (!currentUser?.is_admin) {
        query = query.eq("user_id", userId);
      }

      const { data, error } = await query;

      if (error || !data) return [];

      return data.map(this.mapToEntity);
    } catch (error) {
      console.error("Repository error:", error);
      return [];
    }
  }

  async findByCity(city: string): Promise<ClientEntity[]> {
    try {
      const userId = await this.getCurrentUserId();
      const currentUser = await this.getCurrentUser();

      let query = supabase
        .from("clients")
        .select("*")
        .ilike("city", `%${city}%`)
        .order("client");

      // Filtro por usuário (admin vê todos, usuário normal apenas os seus)
      if (!currentUser?.is_admin) {
        query = query.eq("user_id", userId);
      }

      const { data, error } = await query;

      if (error || !data) return [];

      return data.map(this.mapToEntity);
    } catch (error) {
      console.error("Repository error:", error);
      return [];
    }
  }

  async save(entity: ClientEntity): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();

      // Garantir que o cliente seja salvo com o user_id correto
      const clientData: any = {
        code: entity.code,
        client: entity.client,
        name: entity.client, // Usar o mesmo valor para name
        city: entity.city,
        cpf_cnpj: entity.cnpj,
        user_id: entity.userId || userId, // Usar userId da entidade ou do usuário logado
        created_at: entity.createdAt.toISOString(),
        updated_at: entity.updatedAt?.toISOString() || new Date().toISOString(),
      };

      // Só incluir ID se não for null (para permitir auto-increment)
      if (entity.id !== null) {
        clientData.id = entity.id;
      }

      const { error } = await supabase.from("clients").upsert(clientData);

      if (error) {
        throw new Error(`Failed to save client: ${error.message}`);
      }
    } catch (error) {
      console.error("Error saving client:", error);
      throw error;
    }
  }

  async delete(id: ID): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();
      const currentUser = await this.getCurrentUser();

      let query = supabase.from("clients").delete().eq("id", id);

      // Filtro por usuário (admin pode deletar todos, usuário normal apenas os seus)
      if (!currentUser?.is_admin) {
        query = query.eq("user_id", userId);
      }

      const { error } = await query;

      if (error) {
        throw new Error(`Failed to delete client: ${error.message}`);
      }
    } catch (error) {
      console.error("Error deleting client:", error);
      throw error;
    }
  }

  private mapToEntity = (data: any): ClientEntity => {
    return ClientEntity.create({
      id: data.id,
      code: data.code,
      client: data.client || data.name, // Usar client ou name
      city: data.city,
      cnpj: data.cpf_cnpj, // Mapear cpf_cnpj para cnpj
      userId: data.user_id,
      createdAt: new Date(data.created_at),
      updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
    });
  };
}
