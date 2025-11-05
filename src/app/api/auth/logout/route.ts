import { SessionService } from "@/shared/infrastructure/services/session.service";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    // Limpar sessão do servidor (cookies)
    await SessionService.clearServerSession();

    const response = NextResponse.json({
      success: true,
      message: "Logout realizado com sucesso",
    });

    // Limpar cookie de troca de senha
    response.cookies.set("must_change_password", "", {
      path: "/",
      expires: new Date(0),
    });

    return response;
  } catch (error) {
    console.error("Logout API error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
