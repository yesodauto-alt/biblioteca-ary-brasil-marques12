/**
 * Helper para formatação e limpeza de números de cadastro e códigos de livros/leitores.
 * Trata fórmulas residuais de importação do Excel (ex: =A4570+1, =4570+1, +1, etc.)
 */
export function formatNumeroCadastro(val: unknown): string {
  if (val == null) return '—'
  let str = String(val).trim()
  if (!str) return '—'

  // Trata fórmulas com referências de célula e soma: =A4570+1, =B12+1, =4570+1, A4570+1, 4570+1
  const formulaAdd = str.match(/^=?[A-Za-z]*(\d+)\s*\+\s*(\d+)$/)
  if (formulaAdd) {
    const base = parseInt(formulaAdd[1], 10)
    const add = parseInt(formulaAdd[2], 10)
    return String(base + add)
  }

  // Trata apenas +1 ou =+1 ou + 1
  if (/^=?\s*\+\s*\d+$/.test(str)) {
    return str.replace(/^=?\s*\+\s*/, '')
  }

  // Trata fórmulas de referência simples: =A4570 ou =4570
  const simpleFormula = str.match(/^=?[A-Za-z]*(\d+)$/)
  if (str.startsWith('=') && simpleFormula) {
    return simpleFormula[1]
  }

  // Remove qualquer "+ 1" ou "+1" solto no final
  str = str.replace(/\s*\+\s*\d+$/, '').trim()

  // Remove sinal de igual no início caso tenha sobrado
  if (str.startsWith('=')) {
    str = str.slice(1).trim()
  }

  return str || '—'
}

/**
 * Função segura para ordenação numérica ou alfanumérica de códigos de cadastro
 */
export function parseNumeroCadastroSortKey(val: unknown): { num: number; raw: string } {
  const cleaned = formatNumeroCadastro(val)
  const num = parseInt(cleaned.replace(/\D/g, ''), 10)
  return {
    num: isNaN(num) ? Number.MAX_SAFE_INTEGER : num,
    raw: cleaned.toLowerCase(),
  }
}
