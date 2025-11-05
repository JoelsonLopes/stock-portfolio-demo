"use client";

import { SupabaseClientRepository } from "@/modules/clients/infrastructure/repositories/supabase-client.repository";
import { SearchClientsUseCase } from "@/modules/clients/application/use-cases/search-clients.use-case";
import type { ClientEntity } from "@/modules/clients/domain/entities/client.entity";
import { useQuery } from "@tanstack/react-query";
import { SessionManager } from "@/shared/infrastructure/session/session-manager";

const clientRepository = new SupabaseClientRepository();
const searchUseCase = new SearchClientsUseCase(clientRepository);

interface UseClientSearchProps {
  query: string;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}

export function useClientSearch({
  query,
  page = 1,
  pageSize = 50,
  enabled = true,
}: UseClientSearchProps) {
  // Incluir userId na queryKey para cache separado por usuário
  const currentUser = SessionManager.getCurrentUser();
  const userId = currentUser?.id || null;

  return useQuery({
    queryKey: ["clients", "search", userId, query, page, pageSize],
    queryFn: async () => {
      if (!query.trim()) {
        return { data: [], total: 0 };
      }

      return await searchUseCase.execute({
        query: query.trim(),
        page,
        pageSize,
      });
    },
    enabled: enabled && !!query.trim() && !!userId,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
