# Funcionalidade de Comparação XML - Documentação

## Visão Geral
A funcionalidade de **Comparação XML** permite comparar pedidos salvos no sistema com arquivos XML de Notas Fiscais eletrônicas (NFe) recebidas dos fornecedores. Esta funcionalidade identifica quais itens foram entregues completamente, parcialmente ou estão pendentes.

## Objetivo
- Verificar se os pedidos foram atendidos conforme solicitado
- Identificar itens pendentes ou entregues parcialmente
- Gerar relatórios de pendências com informações financeiras
- Facilitar o controle de entregas e follow-up com fornecedores

## Como Funciona

### 1. Acesso à Funcionalidade
- **Localização**: Lista de Pedidos → Coluna "Ações"
- **Botão**: Ícone de arquivo com check (FileCheck)
- **Disponível para**: Pedidos com status `confirmed`, `processing`, `shipped` ou `delivered`

### 2. Processo de Comparação

#### Etapa 1: Upload do XML
- Arraste e solte o arquivo XML da NFe ou clique para selecionar
- **Formatos aceitos**: Apenas arquivos `.xml`
- **Tamanho máximo**: 10MB
- **Validação**: Verificação automática de formato e tamanho

#### Etapa 2: Processamento
- Parser automático do XML da NFe
- Extração de dados dos produtos
- Comparação com itens do pedido
- Cálculo de diferenças e status

#### Etapa 3: Resultados
- Visualização das informações da Nota Fiscal
- Resumo estatístico da comparação
- Detalhes por item com status individual
- Opção de exportar relatório PDF

## Tipos de Status

### 🟢 Completo
- **Descrição**: Item foi entregue na quantidade exata solicitada
- **Critério**: Quantidade na nota = Quantidade do pedido

### 🟡 Parcial
- **Descrição**: Item foi entregue parcialmente
- **Critério**: 0 < Quantidade na nota < Quantidade do pedido

### 🔴 Pendente
- **Descrição**: Item não foi entregue ou entregue com quantidade zero
- **Critério**: Quantidade na nota = 0

### 🔵 Extra
- **Descrição**: Item presente na nota mas não estava no pedido
- **Critério**: Item existe na nota mas não no pedido

## Algoritmo de Comparação

### Matching de Produtos
1. **Extração de código**: Busca código do produto no início da descrição da NFe
2. **Normalização**: Converte para maiúsculas para comparação
3. **Mapeamento**: Cria mapas de lookup para eficiência
4. **Comparação**: Compara códigos entre pedido e nota

### Cálculo de Diferenças
```typescript
diferenca = quantidadePedido - quantidadeNota
```

### Validação de Preços
- Captura preços unitários do pedido e da nota
- Identifica diferenças de preço
- Calcula valor total das pendências

## Relatório de Pendências

### Nomenclatura do Arquivo PDF
O arquivo segue o padrão dos pedidos normais:

**Formato:**
```
PENDENCIA_{clientName}_{orderCode}_{date}.pdf
```

**Exemplo:**
```
PENDENCIA_FABER_FILTROS_P001_2025-07-18.pdf
```

**Componentes:**
- `PENDENCIA_` (prefixo identificador)
- `{clientName}` (nome do cliente sanitizado)
- `{orderCode}` (código do pedido sanitizado)
- `{date}` (data atual no formato YYYY-MM-DD)
- `.pdf` (extensão)

### Informações Incluídas
- **Cabeçalho**: Dados do pedido, cliente, data de geração
- **Resumo**: Estatísticas da comparação
- **Detalhes da Nota**: Número, data, emitente, valor total
- **Tabela de Itens**: Apenas itens pendentes e parciais

### Colunas da Tabela
1. **#**: Numeração sequencial
2. **Código**: Código do produto
3. **Descrição**: Nome/descrição do produto
4. **Qtd Pedido**: Quantidade solicitada
5. **Qtd Nota**: Quantidade entregue
6. **Pendente**: Quantidade pendente (diferença)
7. **Preço Unit. Pedido**: Preço unitário do pedido
8. **Preço Unit. Nota**: Preço unitário da nota
9. **Valor Pendência**: Valor total da pendência
10. **Status**: Badge visual do status

### Recursos Visuais
- **Design profissional**: Layout neutro com tons de cinza
- **Destaques seletivos**: Vermelho usado apenas para dados críticos (pendências)
- **Alertas de preço**: Indicação quando preços diferem
- **Formatação monetária**: Valores em Real brasileiro (R$)
- **Status badges**: Indicadores visuais coloridos

## Especificações Técnicas

### Estrutura do XML NFe
```xml
<det nItem="1">
  <prod>
    <cProd>8855</cProd>
    <xProd>WAP148 Elemento Filtrante do Ar Seco</xProd>
    <qCom>2.0000</qCom>
    <vUnCom>205.3100</vUnCom>
    <vProd>410.62</vProd>
  </prod>
</det>
```

### Campos Extraídos
- `cProd`: Código do produto
- `xProd`: Descrição do produto
- `qCom`: Quantidade
- `vUnCom`: Valor unitário
- `vProd`: Valor total

### Arquivos Modificados
- `src/presentation/components/orders/OrderList.tsx`
- `src/presentation/components/orders/XMLComparisonModal.tsx`
- `src/app/(dashboard)/orders/page.tsx`

## Casos de Uso

### Cenário 1: Entrega Completa
```
Pedido: 10 unidades do produto A
Nota: 10 unidades do produto A
Resultado: Status "Completo"
```

### Cenário 2: Entrega Parcial
```
Pedido: 10 unidades do produto A
Nota: 7 unidades do produto A
Resultado: Status "Parcial" - 3 unidades pendentes
```

### Cenário 3: Item Não Entregue
```
Pedido: 10 unidades do produto A
Nota: Produto A não consta
Resultado: Status "Pendente" - 10 unidades pendentes
```

### Cenário 4: Item Extra
```
Pedido: Produto A não consta
Nota: 5 unidades do produto A
Resultado: Status "Extra" - Item adicional
```

## Benefícios

### Para o Usuário
- **Controle preciso**: Saber exatamente o que foi entregue
- **Agilidade**: Processamento automático vs. conferência manual
- **Rastreabilidade**: Histórico de entregas e pendências
- **Relatórios**: Documentação profissional para follow-up

### Para o Negócio
- **Redução de erros**: Eliminação de conferência manual
- **Melhoria no relacionamento**: Follow-up assertivo com fornecedores
- **Controle financeiro**: Visão clara de valores pendentes
- **Eficiência operacional**: Automação de processos repetitivos

## Limitações e Considerações

### Limitações Técnicas
- **Dependência de XML**: Requer XML válido da NFe
- **Matching por código**: Baseado no código do produto no início da descrição
- **Tamanho de arquivo**: Máximo 10MB por arquivo
- **Formato específico**: Apenas XMLs de NFe brasileiras

### Considerações de Uso
- **Verificação manual**: Sempre validar resultados críticos
- **Códigos padronizados**: Manter consistência nos códigos de produto
- **Backup de dados**: Manter XMLs organizados para consultas futuras

## Troubleshooting

### Problemas Comuns

#### "Arquivo XML inválido"
- **Causa**: Arquivo corrompido ou não é um XML válido
- **Solução**: Baixar novamente o XML da NFe

#### "Produto não encontrado"
- **Causa**: Código do produto não corresponde entre pedido e nota
- **Solução**: Verificar códigos de produto no cadastro

#### "Erro ao gerar PDF"
- **Causa**: Problema com biblioteca html2pdf
- **Solução**: Recarregar página e tentar novamente

#### "Nenhum item pendente"
- **Causa**: Todos os itens foram entregues completamente
- **Solução**: Informativo normal, pedido foi totalmente atendido

## Manutenção

### Atualizações Futuras
- Suporte a outros formatos de documento fiscal
- Integração com APIs de consulta de NFe
- Histórico de comparações
- Alertas automáticos para pendências

### Monitoramento
- Acompanhar taxa de sucesso do parsing
- Monitorar performance com arquivos grandes
- Validar precisão do matching de produtos

---

**Versão**: 1.0  
**Data**: Julho 2025  
**Autor**: Sistema SGP  
**Última atualização**: 18/07/2025