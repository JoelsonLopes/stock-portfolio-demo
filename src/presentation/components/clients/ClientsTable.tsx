"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ClientEntity } from "@/modules/clients/domain/entities/client.entity";
import { LoadingSpinner } from "@/shared/presentation/components/ui/loading-spinner";
import { AlertCircle, Search, Users } from "lucide-react";
import { useEffect, useState } from "react";

interface ClientsTableProps {
  clients: ClientEntity[];
  loading?: boolean;
  hasSearched: boolean;
  searchQuery: string;
  error?: any;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function ClientsTable({
  clients,
  loading,
  hasSearched,
  searchQuery,
  error,
  total,
  page,
  pageSize,
  onPageChange,
}: ClientsTableProps) {
  // Hook para detectar se a tela é menor que 600px
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Função para verificar o tamanho da tela
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 600);
    };

    // Verifica no início
    checkScreenSize();

    // Adiciona listener para mudanças no tamanho da tela
    window.addEventListener("resize", checkScreenSize);

    // Remove o listener quando o componente desmontar
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  const formatCnpj = (cnpj?: string) => {
    if (!cnpj) return "";

    const cleanCnpj = cnpj.replace(/[^\d]/g, "");
    if (cleanCnpj.length !== 14) return cnpj;

    return cleanCnpj.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      "$1.$2.$3/$4-$5"
    );
  };

  // Loading state
  if (loading) {
    return (
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle>Resultados da Busca</CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="space-y-4">
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <LoadingSpinner size="lg" className="mx-auto mb-4" />
                <p className="text-gray-600">Buscando clientes...</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle>Resultados da Busca</CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Erro ao buscar clientes: {error.message || "Erro desconhecido"}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Initial state - no search performed
  if (!hasSearched) {
    return (
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle>Clientes</CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              Nenhuma busca realizada
            </h3>
            <p className="text-gray-500 max-w-md text-sm sm:text-base">
              Use o formulário acima para buscar clientes por código, nome,
              cidade ou CNPJ.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No results found
  if (hasSearched && clients.length === 0) {
    return (
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle>Resultados da Busca</CardTitle>
          <div className="text-sm text-gray-600">
            Busca por: <strong className="break-all">"{searchQuery}"</strong>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              Nenhum cliente encontrado
            </h3>
            <p className="text-gray-500 max-w-md text-sm sm:text-base">
              Não foram encontrados clientes que correspondam à sua busca por "
              {searchQuery}". Tente usar termos diferentes ou verifique a
              ortografia.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Results found
  return (
    <Card>
      <CardHeader className="px-4 sm:px-6">
        <CardTitle>Resultados da Busca</CardTitle>
        <div className="flex flex-col sm:flex-row  items-start sm:items-center justify-between">
          <div className="text-sm text-gray-600">
            <strong>{clients.length}</strong> cliente
            {clients.length !== 1 ? "s" : ""} encontrado
            {clients.length !== 1 ? "s" : ""} para:{" "}
            <strong className="break-all">"{searchQuery}"</strong>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px] md:w-[15%]">Código</TableHead>
                <TableHead className="w-[300px] md:w-[40%]">Cliente</TableHead>
                {!isMobile && (
                  <TableHead className="w-[200px] md:w-[25%]">Cidade</TableHead>
                )}
                <TableHead className="w-[150px] md:w-[20%]">CNPJ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id} className="hover:bg-gray-50 h-2">
                  <TableCell className="font-medium w-[100px] md:w-[15%] py-1">
                    <div className="font-mono text-sm">{client.code}</div>
                  </TableCell>
                  <TableCell className="font-medium w-[300px] md:w-[40%] py-1">
                    <div className="space-y-0">
                      <div className="font-medium">{client.client}</div>
                    </div>
                  </TableCell>
                  {!isMobile && (
                    <TableCell className="w-[200px] md:w-[25%] py-0">
                      {client.city ? (
                        <span className="text-sm text-gray-700">
                          {client.city}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">
                          Não informado
                        </span>
                      )}
                    </TableCell>
                  )}
                  <TableCell className="w-[150px] md:w-[20%] py-0">
                    {client.cnpj ? (
                      <span className="text-sm text-gray-700 font-mono">
                        {formatCnpj(client.cnpj)}
                      </span>
                    ) : (
                      <span className="text-gray-400 italic">
                        Não informado
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
