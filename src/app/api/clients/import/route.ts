import type { ImportClientsUseCase } from "@/modules/clients/application/use-cases/import-clients.use-case";
import { resolve, TYPES } from "@/shared/infrastructure/di/setup";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { clients, allowUpdates = false } = await request.json();

    // Resolver dependência usando DI
    const importClientsUseCase = resolve<ImportClientsUseCase>(
      TYPES.ImportClientsUseCase
    );

    // Executar caso de uso
    const result = await importClientsUseCase.execute({ clients, allowUpdates });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("Erro na API de importação:", error);
    return NextResponse.json(
      { error: `Erro interno do servidor: ${error}` },
      { status: 500 }
    );
  }
}
