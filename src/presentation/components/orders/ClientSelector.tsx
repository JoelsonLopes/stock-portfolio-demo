"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ClientEntity } from "@/modules/clients/domain/entities/client.entity";
import { useClientSearch } from "@/presentation/hooks/useClientSearch";
import { LoadingSpinner } from "@/shared/presentation/components/ui/loading-spinner";
import { AlertCircle, Check, Search, Users, X } from "lucide-react";
import { useEffect, useState } from "react";

interface ClientSelectorProps {
  onSelect: (client: ClientEntity | null) => void;
  selectedClient?: ClientEntity | null;
}

export function ClientSelector({
  onSelect,
  selectedClient,
}: ClientSelectorProps) {
  const [inputValue, setInputValue] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const { data, isLoading, error, refetch } = useClientSearch({
    query: searchQuery,
    page: 1,
    pageSize: 50,
    enabled: hasSearched,
  });

  const clients = data?.data || [];

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 600);
    };
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = inputValue.trim();
    if (trimmedQuery) {
      setSearchQuery(trimmedQuery);
      setHasSearched(true);
      refetch();
    }
  };

  const handleClear = () => {
    setInputValue("");
    setSearchQuery("");
    setHasSearched(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit(e);
    }
  };

  const formatCnpj = (cnpj?: string) => {
    if (!cnpj) return "";
    const cleanCnpj = cnpj.replace(/[^\d]/g, "");
    if (cleanCnpj.length !== 14) return cnpj;
    return cleanCnpj.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      "$1.$2.$3/$4-$5"
    );
  };

  return (
    <div className="space-y-4">
      {/* Cliente Selecionado */}
      {selectedClient && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="px-4 sm:px-6 pb-2">
            <CardTitle className="flex items-center gap-2 text-lg text-green-800">
              <Check className="h-5 w-5" />
              Cliente Selecionado
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pt-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="font-medium text-green-900">
                  {selectedClient.client}
                </div>
                <div className="text-sm text-green-700">
                  Código: {selectedClient.code}
                  {selectedClient.city && ` • ${selectedClient.city}`}
                  {selectedClient.cnpj &&
                    ` • CNPJ: ${formatCnpj(selectedClient.cnpj)}`}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onSelect(null)}
                className="text-green-700 border-green-300 hover:bg-green-100"
              >
                <X className="h-4 w-4 mr-1" />
                Remover
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formulário de Busca */}
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Search className="h-5 w-5" />
            Buscar Clientes
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Input
                  type="text"
                  placeholder="Digite o código, nome do cliente, cidade ou CNPJ..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value.toUpperCase())}
                  onKeyPress={handleKeyPress}
                  className="pr-10 w-full uppercase"
                  disabled={isLoading}
                />
                {inputValue && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setInputValue("")}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="sm:w-auto sm:min-w-[100px]"
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Buscar
                  </>
                )}
              </Button>
            </div>

            {searchQuery && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-sm text-gray-600 bg-blue-50 p-3 rounded gap-2">
                <span className="text-xs sm:text-sm">
                  Resultados para:{" "}
                  <strong className="break-all">"{searchQuery}"</strong>
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClear}
                  disabled={isLoading}
                  className="w-full sm:w-auto"
                >
                  <X className="h-4 w-4 mr-1" />
                  Limpar busca
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Estados da Busca */}
      {isLoading && (
        <Card>
          <CardHeader className="px-4 sm:px-6">
            <CardTitle>Resultados da Busca</CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <LoadingSpinner size="lg" className="mx-auto mb-4" />
                <p className="text-gray-600">Buscando clientes...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
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
      )}

      {!hasSearched && (
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
      )}

      {hasSearched && clients.length === 0 && !isLoading && (
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
                Não foram encontrados clientes que correspondam à sua busca por
                "{searchQuery}". Tente usar termos diferentes ou verifique a
                ortografia.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {hasSearched && clients.length > 0 && !isLoading && (
        <Card>
          <CardHeader className="px-4 sm:px-6">
            <CardTitle>Resultados da Busca</CardTitle>
            <div className="text-sm text-gray-600">
              <strong>{clients.length}</strong> cliente
              {clients.length !== 1 ? "s" : ""} encontrado
              {clients.length !== 1 ? "s" : ""} para:{" "}
              <strong className="break-all">"{searchQuery}"</strong>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[60vh] sm:max-h-[70vh] overflow-auto border-t">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10 border-b">
                    <TableRow>
                      <TableHead className="w-[80px] md:w-[10%]">
                        Código
                      </TableHead>
                      <TableHead className="w-[250px] md:w-[35%]">
                        Cliente
                      </TableHead>
                      {!isMobile && (
                        <TableHead className="w-[150px] md:w-[20%]">
                          Cidade
                        </TableHead>
                      )}
                      <TableHead className="w-[120px] md:w-[20%]">
                        CNPJ
                      </TableHead>
                      <TableHead className="w-[100px] md:w-[15%] text-center">
                        Ação
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map((client) => (
                      <TableRow key={client.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium py-2">
                          <div className="font-mono text-sm">{client.code}</div>
                        </TableCell>
                        <TableCell className="font-medium py-2">
                          <div className="font-medium">{client.client}</div>
                        </TableCell>
                        {!isMobile && (
                          <TableCell className="py-2">
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
                        <TableCell className="py-2">
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
                        <TableCell className="py-2 text-center">
                          <Button
                            size="sm"
                            onClick={() => onSelect(client)}
                            disabled={selectedClient?.id === client.id}
                            className="w-full sm:w-auto"
                          >
                            {selectedClient?.id === client.id ? (
                              <>
                                <Check className="h-4 w-4 mr-1" />
                                Selecionado
                              </>
                            ) : (
                              <>
                                <Check className="h-4 w-4 mr-1" />
                                Selecionar
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
