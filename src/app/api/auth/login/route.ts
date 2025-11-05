import { SupabaseUserRepository } from "@/modules/auth/infrastructure/repositories/supabase-user.repository";
import { SessionService } from "@/shared/infrastructure/services/session.service";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { name, password } = await request.json();

    if (!name?.trim() || !password) {
      return NextResponse.json(
        { error: "Nome de usuário e senha são obrigatórios" },
        { status: 400 }
      );
    }

    const userRepository = new SupabaseUserRepository();

    // Validar credenciais
    const user = await userRepository.validateCredentials(
      name.trim(),
      password
    );

    if (!user) {
      return NextResponse.json(
        { error: "Credenciais inválidas" },
        { status: 401 }
      );
    }

    if (!user.active) {
      return NextResponse.json({ error: "Usuário inativo" }, { status: 401 });
    }

    // ✅ Criar sessão no servidor (cookies) E no cliente (localStorage)
    await SessionService.createServerSession(user);

    // Atualizar último login
    try {
      await userRepository.updateLastLogin(user.id);
    } catch (error) {
      console.error("Error updating last login:", error);
      // Não falha o login por causa disso
    }

    // Determinar redirecionamento
    const redirectTo = user.must_change_password ? "/change-password" : "/";

    const response = NextResponse.json({
      success: true,
      user,
      redirectTo,
      requirePasswordChange: user.must_change_password,
    });

    // Adicionar cookie de troca de senha se necessário
    if (user.must_change_password) {
      response.cookies.set("must_change_password", "true", {
        path: "/",
        maxAge: 24 * 60 * 60, // 24 horas
      });
    }

    return response;
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
