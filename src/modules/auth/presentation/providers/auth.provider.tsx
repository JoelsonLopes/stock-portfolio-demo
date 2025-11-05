"use client";

import type React from "react";

import { createClient } from "@/lib/supabase/client";
import { User } from "@/shared/domain/entities/user.entity";
import { SessionManager } from "@/shared/infrastructure/session/session-manager";
import { createContext, useContext, useEffect, useState } from "react";
import { LoginUseCase } from "../../application/use-cases/login.use-case";
import { LogoutUseCase } from "../../application/use-cases/logout.use-case";
import { SupabaseUserRepository } from "../../infrastructure/repositories/supabase-user.repository";
import { CustomAuthenticationService } from "../../infrastructure/services/custom-authentication.service";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (
    name: string,
    password: string
  ) => Promise<{ success: boolean; error?: string; redirectTo?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Dependencies
  const userRepository = new SupabaseUserRepository();
  const authService = new CustomAuthenticationService(userRepository);
  const loginUseCase = new LoginUseCase(userRepository);
  const logoutUseCase = new LogoutUseCase();
  const supabase = createClient();

  useEffect(() => {
    const initializeAuth = () => {
      try {
        // Tenta recuperar o usuário da sessão
        const currentUser = SessionManager.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (name: string, password: string) => {
    try {
      // ✅ CORREÇÃO: Usar API que cria cookies no servidor
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, password }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log(
          "🔐 Login customizado bem-sucedido, fazendo login no Supabase..."
        );

        // 2. Login no Supabase usando email válido baseado no user.id
        try {
          // Criar email válido: primeiros 8 chars do UUID + @system.local
          const tempEmail = `user${result.user.id.substring(
            0,
            8
          )}@system.local`;

          const { error: signInError } = await supabase.auth.signInWithPassword(
            {
              email: tempEmail,
              password: "temp-password-123",
            }
          );

          if (signInError) {
            console.log("⚠️ Login Supabase falhou, tentando criar usuário...");

            // Se falhar, tentar criar o usuário no Supabase
            const { error: signUpError } = await supabase.auth.signUp({
              email: tempEmail,
              password: "temp-password-123",
              options: {
                data: {
                  user_id: result.user.id,
                  name: result.user.name,
                },
              },
            });

            if (signUpError) {
              console.log("⚠️ Erro ao criar usuário no Supabase:", signUpError);
              // Continua mesmo com erro no Supabase
            } else {
              console.log("✅ Usuário criado no Supabase com sucesso");
            }
          } else {
            console.log("✅ Login no Supabase bem-sucedido");
          }
        } catch (supabaseError) {
          console.log("⚠️ Erro na autenticação Supabase:", supabaseError);
          // Continua mesmo com erro no Supabase
        }

        // 3. Salvar sessão local
        SessionManager.setSession(result.user);
        setUser(result.user);

        return {
          success: true,
          redirectTo: result.redirectTo,
        };
      } else {
        return { success: false, error: result.error || "Erro no login" };
      }
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro inesperado",
      };
    }
  };

  const logout = async () => {
    try {
      console.log("🔐 Iniciando logout duplo...");

      // 1. Logout do Supabase
      try {
        await supabase.auth.signOut();
        console.log("✅ Logout do Supabase bem-sucedido");
      } catch (supabaseError) {
        console.log("⚠️ Erro no logout do Supabase:", supabaseError);
      }

      // 2. Limpar sessões locais
      SessionManager.clearSession();
      setUser(null);

      // 3. Chamar API de logout para limpar cookies no servidor
      await fetch("/api/auth/logout", {
        method: "POST",
      }).catch(() => {}); // Não falha se a API não existir ainda

      // 4. Remove o cookie ao fazer logout
      document.cookie =
        "must_change_password=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

      console.log("✅ Logout duplo concluído");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
