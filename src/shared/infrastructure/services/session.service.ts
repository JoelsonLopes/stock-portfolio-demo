import { User } from "@/shared/domain/entities/user.entity";
import { cookies } from "next/headers";

export interface SessionData {
  user: User;
  expiresAt: number;
  issuedAt: number;
}

export class SessionService {
  private static readonly SESSION_COOKIE_NAME = "stock_app_session";
  private static readonly EXPIRY_HOURS = 24;

  /**
   * Server-side: Cria uma sessão usando cookies
   */
  static async createServerSession(user: User): Promise<void> {
    const expiresAt = Date.now() + this.EXPIRY_HOURS * 60 * 60 * 1000;
    const issuedAt = Date.now();

    const sessionData: SessionData = {
      user,
      expiresAt,
      issuedAt,
    };

    const cookieStore = await cookies();

    // Em produção, você deveria criptografar isso
    const sessionValue = Buffer.from(JSON.stringify(sessionData)).toString(
      "base64",
    );

    cookieStore.set(this.SESSION_COOKIE_NAME, sessionValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: this.EXPIRY_HOURS * 60 * 60,
    });

    // Também armazenar no localStorage para o cliente
    if (typeof window !== "undefined") {
      localStorage.setItem("user_session", JSON.stringify(sessionData));
    }
  }

  /**
   * Server-side: Obtém a sessão dos cookies
   */
  static async getServerSession(): Promise<SessionData | null> {
    try {
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get(this.SESSION_COOKIE_NAME);

      if (!sessionCookie?.value) {
        return null;
      }

      const sessionJson = Buffer.from(sessionCookie.value, "base64").toString(
        "utf-8",
      );
      const sessionData: SessionData = JSON.parse(sessionJson);

      // Verificar se a sessão expirou
      if (Date.now() > sessionData.expiresAt) {
        await this.clearServerSession();
        return null;
      }

      // Reconstruir as datas
      if (sessionData.user) {
        sessionData.user.createdAt = new Date(sessionData.user.createdAt);
        if (sessionData.user.updatedAt) {
          sessionData.user.updatedAt = new Date(sessionData.user.updatedAt);
        }
        if (sessionData.user.password_changed_at) {
          sessionData.user.password_changed_at = new Date(
            sessionData.user.password_changed_at,
          );
        }
      }

      return sessionData;
    } catch (error) {
      console.error("Error reading server session:", error);
      await this.clearServerSession();
      return null;
    }
  }

  /**
   * Server-side: Remove a sessão dos cookies
   */
  static async clearServerSession(): Promise<void> {
    try {
      const cookieStore = await cookies();
      cookieStore.delete(this.SESSION_COOKIE_NAME);
    } catch (error) {
      console.error("Error clearing server session:", error);
    }
  }

  /**
   * Client-side: Cria uma sessão no localStorage
   */
  static setClientSession(user: User): void {
    if (typeof window === "undefined") return;

    const expiresAt = Date.now() + this.EXPIRY_HOURS * 60 * 60 * 1000;
    const issuedAt = Date.now();

    const sessionData: SessionData = {
      user,
      expiresAt,
      issuedAt,
    };

    try {
      localStorage.setItem("user_session", JSON.stringify(sessionData));
    } catch (error) {
      console.error("Error saving client session:", error);
    }
  }

  /**
   * Client-side: Obtém a sessão do localStorage
   */
  static getClientSession(): SessionData | null {
    if (typeof window === "undefined") return null;

    try {
      const sessionJson = localStorage.getItem("user_session");
      if (!sessionJson) return null;

      const sessionData: SessionData = JSON.parse(sessionJson);

      // Verificar se a sessão expirou
      if (Date.now() > sessionData.expiresAt) {
        this.clearClientSession();
        return null;
      }

      // Reconstruir as datas
      if (sessionData.user) {
        sessionData.user.createdAt = new Date(sessionData.user.createdAt);
        if (sessionData.user.updatedAt) {
          sessionData.user.updatedAt = new Date(sessionData.user.updatedAt);
        }
        if (sessionData.user.password_changed_at) {
          sessionData.user.password_changed_at = new Date(
            sessionData.user.password_changed_at,
          );
        }
      }

      return sessionData;
    } catch (error) {
      console.error("Error reading client session:", error);
      this.clearClientSession();
      return null;
    }
  }

  /**
   * Client-side: Remove a sessão do localStorage
   */
  static clearClientSession(): void {
    if (typeof window === "undefined") return;

    try {
      localStorage.removeItem("user_session");
    } catch (error) {
      console.error("Error clearing client session:", error);
    }
  }

  /**
   * Universal: Verifica se há uma sessão ativa
   */
  static async isAuthenticated(): Promise<boolean> {
    // Tenta server-side primeiro
    const serverSession = await this.getServerSession().catch(() => null);
    if (serverSession) return true;

    // Fallback para client-side
    const clientSession = this.getClientSession();
    return clientSession !== null;
  }

  /**
   * Universal: Obtém o usuário atual
   */
  static async getCurrentUser(): Promise<User | null> {
    // Tenta server-side primeiro
    const serverSession = await this.getServerSession().catch(() => null);
    if (serverSession) return serverSession.user;

    // Fallback para client-side
    const clientSession = this.getClientSession();
    return clientSession?.user || null;
  }

  /**
   * Universal: Limpa todas as sessões
   */
  static async clearAllSessions(): Promise<void> {
    await this.clearServerSession().catch(() => {});
    this.clearClientSession();
  }
}
