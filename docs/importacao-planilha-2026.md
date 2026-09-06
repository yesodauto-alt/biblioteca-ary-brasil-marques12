# Preparação da importação — cadastro 2026

## Objetivo

Preparar uma importação segura para a planilha `CADASTRO DE LEITORES 2026.xlsx`, sem inserir nem sobrescrever dados enquanto os conflitos não forem revisados.

## Diagnóstico do arquivo recebido

| Conjunto | Linhas com dados | Pendências relevantes |
| --- | ---: | --- |
| Cadastro do Leitor | 2.203 | 27 sem número, 28 sem nome, 13 números duplicados e 335 linhas com observações |
| Cadastro de Livros | 4.849 | 11 códigos duplicados e 51 registros sem autor |
| Cadastro de Empréstimos | 2.159 | 383 sem devolução real; 2.145 linhas com referências quebradas |

A planilha de leitores não possui uma linha de cabeçalho compatível com o importador atual. Os contatos também incluem observações como “sem telefone” e “e-mail falhou”, que não podem ser gravadas como telefone/e-mail válidos.

## Mapeamento inicial

| Origem | Destino | Regra |
| --- | --- | --- |
| Número do leitor | `leitores.numero_cadastro` | obrigatório, único, tratado como texto |
| Nome do leitor | `leitores.nome_completo` | obrigatório, espaços normalizados |
| E-mail / telefone | `leitores.email` / `telefone` | normalizar; valores informais vão para revisão |
| Comentários | `leitores.observacoes` | preservar sem substituir os contatos |
| Cadastro do livro / título / autor / CDD / Cutter | `livros` | importar antes dos empréstimos |
| Dados de empréstimo | `emprestimos` | importar por último, após conciliar leitor e livro |

## Solução proposta

1. Criar um lote de importação com área de preparação, mantendo a linha original e o resultado da normalização.
2. Oferecer um assistente para voluntários: escolher planilha, confirmar aba/cabeçalho, visualizar a prévia, corrigir conflitos e confirmar o lote.
3. Aplicar validações de número de cadastro, nome, e-mail, telefone, datas e duplicidade (exata e por possível coincidência).
4. Não sobrescrever cadastros existentes automaticamente; cada conflito deve permitir criar, atualizar campos vazios, ignorar ou revisar.
5. Gerar relatório final e trilha de auditoria; manter os registros recusados para correção e nova tentativa.
6. Separar o histórico de empréstimos dos empréstimos em aberto. Somente vínculos válidos entre leitor e livro poderão ser confirmados.

## Ordem de execução

1. Leitores: importação piloto, revisão e aprovação.
2. Livros: importação piloto, revisão e aprovação.
3. Empréstimos: conciliação, revisão dos pendentes e importação controlada.
4. Treinamento curto para voluntários, com instruções visuais na própria tela.

## Critérios para iniciar a importação real

- números duplicados e cadastros sem nome resolvidos ou marcados para revisão;
- regra aprovada para registros sem telefone/e-mail;
- prévia e relatório de erros disponíveis;
- backup lógico do lote e confirmação explícita do administrador;
- teste em preview com uma amostra aprovada.
