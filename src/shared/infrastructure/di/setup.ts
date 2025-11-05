import { container, TYPES } from "./container";

// Re-export TYPES for convenience
export { TYPES };

// Flag para garantir que a inicialização aconteça apenas uma vez
let isInitialized = false;

// Repositories
import { SupabaseClientRepository } from "@/modules/clients/infrastructure/repositories/supabase-client.repository";
import { SupabaseUserRepository } from "@/modules/auth/infrastructure/repositories/supabase-user.repository";

// Use Cases
import { ImportClientsUseCase } from "@/modules/clients/application/use-cases/import-clients.use-case";
import { LoginUseCase } from "@/modules/auth/application/use-cases/login.use-case";

// Services
import { CustomAuthenticationService } from "@/modules/auth/infrastructure/services/custom-authentication.service";

/**
 * Configura todas as dependências da aplicação
 * Deve ser chamado na inicialização da app
 */
export function setupDependencies(): void {
  if (isInitialized) {
    return;
  }

  isInitialized = true;
  // ===== REPOSITORIES =====
  container.registerSingleton(
    TYPES.ClientRepository,
    () => new SupabaseClientRepository(),
  );

  container.registerSingleton(
    TYPES.UserRepository,
    () => new SupabaseUserRepository(),
  );

  // ===== SERVICES =====
  container.registerSingleton(
    TYPES.AuthService,
    () =>
      new CustomAuthenticationService(container.resolve(TYPES.UserRepository)),
  );

  // ===== USE CASES =====
  container.register(
    TYPES.ImportClientsUseCase,
    () => new ImportClientsUseCase(container.resolve(TYPES.ClientRepository)),
  );

  container.register(
    TYPES.LoginUseCase,
    () => new LoginUseCase(container.resolve(TYPES.UserRepository)),
  );
}

/**
 * Helper para resolver dependências de forma type-safe
 * Garante que as dependências estão inicializadas antes de resolver
 */
export function resolve<T>(identifier: symbol): T {
  setupDependencies();
  return container.resolve<T>(identifier);
}
