# Decisão: Expansão Internacional (Fase 13)

**Data:** 2026-09-12
**Contexto:** O módulo Lumière atual cobre CRUD básico de Businesses, Products,
Customers e Sales. Para uma empresa moçambicana de importação/exportação com
operações multi-país, este escopo é insuficiente.

**Decisão:** Terminar primeiro as Fases 0-12 do manual mestre. Só depois
iniciar uma nova Fase 13 – Expansão Internacional.

**Âmbito previsto para Fase 13 (não vinculativo, a afinar):**

1. **Câmbio** – taxas dinâmicas, multi-moeda (MZN, USD, EUR, CNY, ZAR)
2. **Fornecedores Internacionais** – cadastro, pedidos, comparação de cotações
3. **Armazém + Stock** – multi-localização, movimentos, alertas de reposição
4. **Logística e Embarques** – tracking, custos (frete, porto, seguro), demurrage
5. **Documentação Aduaneira** – DUIMP, certificados, packing list, fatura comercial
6. **Custo Total de Importação (Landed Cost)** – preço + frete + tarifas + seguro
7. **Rentabilidade por Produto/País** – margem real incorporando câmbio e custos
8. **Fiscalidade** – taxas aduaneiras por país, IVA, regimes especiais
9. **Multilíngue** – PT/EN base
10. **Documentos** – geração de PDF (a avaliar)

**Regra mantida:** blocos pequenos, testáveis, reversíveis. Cada sub-bloco
termina com commit + teste em Chrome.

**Estimativa:** ~15-20 sub-blocos. Execução após Fase 12 (Entrega).
