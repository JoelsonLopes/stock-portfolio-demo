"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/shared/infrastructure/database/supabase-wrapper";
import { formatCurrency } from "@/shared/presentation/lib/utils";
import { FileDown, FileSpreadsheet, Loader2, Search } from "lucide-react";
import { useEffect, useState } from "react";

interface ProductGroup {
  id: number;
  name: string;
}

interface Product {
  id: string;
  product: string;
  stock: number;
  price: number;
  application: string;
  group_id: number;
  group_name: string;
  created_at: Date;
  updated_at: Date;
}

interface Discount {
  id: string;
  name: string;
  discount_percentage: number;
}

export default function PriceListPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [selectedDiscount, setSelectedDiscount] = useState<string>("0");
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);
  const { toast } = useToast();

  // Carregar dados iniciais (grupos e descontos) em paralelo
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [groupsResult, discountsResult] = await Promise.all([
          supabase.from("product_groups").select("id, name").order("name"),
          supabase.from("discounts").select("id, name, discount_percentage").order("discount_percentage")
        ]);

        if (groupsResult.data) setProductGroups(groupsResult.data);
        if (discountsResult.data) setDiscounts(discountsResult.data);
      } catch (error) {
        console.error("Erro ao carregar dados iniciais:", error);
      }
    }
    loadInitialData();
  }, []);

  // Buscar produtos com paginação automática para grupos específicos
  const handleSearch = async () => {
    setIsLoading(true);
    try {
      let allProducts: any[] = [];
      let hasMore = true;
      let offset = 0;
      const pageSize = 1000; // Tamanho da página (limite do Supabase)

      // Para busca geral, usar limite simples
      if (selectedGroup === "all") {
        let query = supabase
          .from("products")
          .select("id, product, stock, price, application, group_id, product_groups(name)")
          .order("product")
          .limit(500);

        // Aplicar busca por texto se houver
        if (searchQuery.trim()) {
          query = query.ilike("product", `%${searchQuery.trim()}%`);
        }

        const { data, error } = await query;
        if (error) throw error;
        allProducts = data || [];
      } else {
        // Para grupos específicos, usar paginação para pegar TODOS os registros
        while (hasMore) {
          let query = supabase
            .from("products")
            .select("id, product, stock, price, application, group_id, product_groups(name)")
            .eq("group_id", selectedGroup)
            .order("product")
            .range(offset, offset + pageSize - 1);

          // Aplicar busca por texto se houver
          if (searchQuery.trim()) {
            query = query.ilike("product", `%${searchQuery.trim()}%`);
          }

          const { data, error } = await query;
          if (error) throw error;

          const pageData = data || [];
          allProducts = [...allProducts, ...pageData];
          
          // Se retornou menos que o pageSize, chegamos ao fim
          hasMore = pageData.length === pageSize;
          offset += pageSize;

          console.log(`📦 Página ${Math.ceil(offset/pageSize)}: ${pageData.length} produtos (Total: ${allProducts.length})`);
        }
      }

      console.log("🔍 DEBUG - Total de produtos coletados:", allProducts.length);
      console.log("🔍 DEBUG - Grupo selecionado:", selectedGroup);

      const mappedProducts = allProducts.map(item => ({
        id: item.id,
        product: item.product,
        stock: item.stock || 0,
        price: item.price || 0,
        application: item.application || "",
        group_id: item.group_id,
        group_name: Array.isArray(item.product_groups) 
          ? "" 
          : (item.product_groups as { name: string })?.name || "",
        created_at: new Date(),
        updated_at: new Date(),
      }));

      setProducts(mappedProducts);
      setFilteredProducts(mappedProducts);
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
      toast({
        title: "Erro",
        description: "Erro ao buscar produtos. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Calcular preço com desconto
  const calculateDiscountedPrice = (price: number): number => {
    const discountPercentage = parseFloat(selectedDiscount);
    if (discountPercentage === 0) return price;
    return price * (1 - discountPercentage / 100);
  };

  // Gerar PDF
  const generatePDF = async () => {
    if (filteredProducts.length === 0) {
      toast({
        title: "Atenção",
        description: "Nenhum produto para gerar PDF. Faça uma busca primeiro.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingPDF(true);
    try {
      // Importar jsPDF e plugin autoTable
      const jsPDF = (await import("jspdf")).default;
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF();

      // Título
      doc.setFontSize(20);
      doc.text("Demo Parts Co. - Price List", 14, 20);

      // Informações do filtro
      doc.setFontSize(10);
      const groupName = productGroups.find(g => g.id.toString() === selectedGroup)?.name || "Todos";
      const discountName = discounts.find(d => d.discount_percentage.toString() === selectedDiscount)?.name || "Sem desconto";
      
      doc.text(`Grupo: ${groupName}`, 14, 30);
      doc.text(`Desconto: ${discountName} (${selectedDiscount}%)`, 14, 35);
      doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, 14, 40);

      // Preparar dados da tabela - sempre com preço com desconto
      const tableData = filteredProducts.map(product => {
        const discountedPrice = calculateDiscountedPrice(product.price);
        
        return [
          product.product,
          product.application || "-",
          formatCurrency(discountedPrice),
        ];
      });

      // Cabeçalhos da tabela fixos
      const headers = ["Produto", "Aplicação", "Preço c/ Desconto"];

      // Estilos de coluna fixos
      const columnStyles = {
        0: { cellWidth: 60 }, // Produto
        1: { cellWidth: 90 }, // Aplicação
        2: { cellWidth: 40, halign: "right" as const }, // Preço c/ Desconto
      };

      // Adicionar tabela usando autoTable
      autoTable(doc, {
        head: [headers],
        body: tableData,
        startY: 45,
        styles: {
          fontSize: 9,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [41, 98, 255],
          textColor: 255,
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        columnStyles,
      });

      // Salvar PDF
      const fileName = `lista_precos_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(fileName);

      toast({
        title: "Sucesso",
        description: `PDF "${fileName}" gerado com sucesso!`,
      });
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast({
        title: "Erro",
        description: "Erro ao gerar PDF. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Gerar Excel
  const generateExcel = async () => {
    if (filteredProducts.length === 0) {
      toast({
        title: "Atenção",
        description: "Nenhum produto para gerar Excel. Faça uma busca primeiro.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingExcel(true);
    try {
      // Importar biblioteca xlsx
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();

      // Preparar dados do cabeçalho
      const groupName = productGroups.find(g => g.id.toString() === selectedGroup)?.name || "Todos";
      const discountName = discounts.find(d => d.discount_percentage.toString() === selectedDiscount)?.name || "Sem desconto";

      const headerData = [
        ["Demo Parts Co. - Price List"],
        [`Grupo: ${groupName}`],
        [`Desconto: ${discountName} (${selectedDiscount}%)`],
        [`Data: ${new Date().toLocaleDateString("pt-BR")}`],
        [`Total de produtos: ${filteredProducts.length}`],
        [], // linha vazia
      ];

      const columnHeaders = ["Produto", "Aplicação", "Preço Original", "Preço c/ Desconto"];

      // Processar dados dos produtos para Excel
      const excelData = filteredProducts.map(product => {
        const discountedPrice = calculateDiscountedPrice(product.price);
        return [
          product.product,
          product.application || "-",
          product.price,
          discountedPrice
        ];
      });

      const finalData = [
        ...headerData,
        columnHeaders,
        ...excelData
      ];

      // Criar worksheet e configurar formatação
      const ws = XLSX.utils.aoa_to_sheet(finalData);

      // Ajustar largura das colunas
      const colWidths = [
        { wch: 30 }, // Produto
        { wch: 50 }, // Aplicação
        { wch: 15 }, // Preço Original
        { wch: 18 }, // Preço c/ Desconto
      ];
      ws["!cols"] = colWidths;

      // Formatar células de preço como moeda
      const startRow = headerData.length + 1;
      for (let i = startRow; i < finalData.length; i++) {
        const cellC = `C${i + 1}`;
        const cellD = `D${i + 1}`;
        if (ws[cellC]) ws[cellC].z = '"R$ "#,##0.00';
        if (ws[cellD]) ws[cellD].z = '"R$ "#,##0.00';
      }

      // Adicionar worksheet ao workbook
      XLSX.utils.book_append_sheet(wb, ws, "Lista de Preços");

      // Gerar arquivo
      const fileName = `lista_precos_${groupName.toLowerCase().replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast({
        title: "Sucesso",
        description: `Excel "${fileName}" gerado com sucesso! Total: ${filteredProducts.length} produtos`,
      });
    } catch (error) {
      console.error("Erro ao gerar Excel:", error);
      toast({
        title: "Erro",
        description: "Erro ao gerar Excel. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingExcel(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-bold">Lista de Preços</h1>
            <div className="flex items-center gap-2">
              <Button
                onClick={generatePDF}
                disabled={isGeneratingPDF || filteredProducts.length === 0}
                className="ml-4"
              >
                {isGeneratingPDF ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando PDF...
                  </>
                ) : (
                  <>
                    <FileDown className="mr-2 h-4 w-4" />
                    Gerar PDF
                  </>
                )}
              </Button>
              <Button
                onClick={generateExcel}
                disabled={isGeneratingExcel || filteredProducts.length === 0}
                
                className="ml-2"
              >
                {isGeneratingExcel ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando Excel...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Gerar Excel
                  </>
                )}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1">
              <Label htmlFor="search">Buscar produto</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Digite o código..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="group">Grupo/Marca</Label>
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger id="group">
                  <SelectValue placeholder="Selecione o grupo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Grupos</SelectItem>
                  {productGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id.toString()}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="discount">Desconto</Label>
              <Select value={selectedDiscount} onValueChange={setSelectedDiscount}>
                <SelectTrigger id="discount">
                  <SelectValue placeholder="Sem desconto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Sem desconto</SelectItem>
                  {discounts.map((discount) => (
                    <SelectItem 
                      key={discount.id} 
                      value={discount.discount_percentage.toString()}
                    >
                      {discount.name} ({discount.discount_percentage}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={handleSearch} 
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Buscar Produtos
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Informação sobre filtros aplicados */}
          {filteredProducts.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {filteredProducts.length} produtos encontrados
              {selectedDiscount !== "0" && ` • Desconto de ${selectedDiscount}% aplicado`}
            </div>
          )}

          {/* Alerta para limite de 100 produtos */}
          {filteredProducts.length > 100 && (
            <Alert className="mb-4">
              <AlertDescription>
                ⚠️ Mostrando apenas os primeiros 100 produtos de {filteredProducts.length} encontrados.
                Para ver todos, gere o PDF ou Excel.
              </AlertDescription>
            </Alert>
          )}

          {/* Tabela de produtos */}
          {filteredProducts.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Aplicação</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    {selectedDiscount !== "0" && (
                      <TableHead className="text-right">Preço c/ Desconto</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.slice(0, 100).map((product) => {
                    const discountedPrice = calculateDiscountedPrice(product.price);
                    return (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.product}</TableCell>
                        <TableCell className="max-w-[300px] truncate">
                          {product.application || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(product.price)}
                        </TableCell>
                        {selectedDiscount !== "0" && (
                          <TableCell className="text-right font-semibold text-green-600">
                            {formatCurrency(discountedPrice)}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {filteredProducts.length > 100 && (
                <div className="p-4 text-center text-sm text-muted-foreground bg-muted/50">
                  Mostrando 100 de {filteredProducts.length} produtos. 
                  Gere o PDF para ver todos os produtos.
                </div>
              )}
            </div>
          )}

          {/* Estado vazio */}
          {!isLoading && filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Search className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Nenhum produto encontrado</h3>
              <p className="text-muted-foreground">
                Use os filtros acima para buscar produtos e gerar sua lista de preços.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}