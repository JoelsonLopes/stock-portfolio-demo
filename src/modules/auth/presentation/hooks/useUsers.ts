"use client";

import type { User } from "@/shared/domain/entities/user.entity";
import { useQuery } from "@tanstack/react-query";
import { SupabaseUserRepository } from "../../infrastructure/repositories/supabase-user.repository";

const userRepository = new SupabaseUserRepository();

export const useUsers = () => {
  return useQuery<User[], Error>({
    queryKey: ["users", "active"],
    queryFn: async () => {
      return await userRepository.findActive();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
