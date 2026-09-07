export interface ImportFieldConfig {
  name: string
  label: string
  required: boolean
  type: 'text' | 'email' | 'date' | 'select'
  options?: string[]
}

export interface ImportConfig {
  label: string
  collection: string
  fields: ImportFieldConfig[]
}

export const IMPORT_CONFIGS: Record<string, ImportConfig> = {
  leitores: {
    label: 'Usuários',
    collection: 'leitores',
    fields: [
      { name: 'numero_cadastro', label: 'Número de Cadastro', required: true, type: 'text' },
      { name: 'nome_completo', label: 'Nome Completo', required: true, type: 'text' },
      { name: 'telefone', label: 'Telefone', required: true, type: 'text' },
      { name: 'email', label: 'E-mail', required: false, type: 'email' },
      { name: 'data_nascimento', label: 'Data de Nascimento', required: false, type: 'date' },
      { name: 'endereco', label: 'Endereço', required: false, type: 'text' },
      { name: 'data_cadastro', label: 'Data de Cadastro', required: false, type: 'date' },
      {
        name: 'status',
        label: 'Status',
        required: false,
        type: 'select',
        options: ['ativo', 'inativo'],
      },
      { name: 'observacoes', label: 'Observações', required: false, type: 'text' },
    ],
  },
  livros: {
    label: 'Livros',
    collection: 'livros',
    fields: [
      { name: 'numero_cadastro', label: 'Número de Cadastro', required: true, type: 'text' },
      { name: 'titulo', label: 'Título', required: true, type: 'text' },
      { name: 'autor', label: 'Autor', required: true, type: 'text' },
      { name: 'coautor', label: 'Coautor', required: false, type: 'text' },
      { name: 'editora', label: 'Editora', required: false, type: 'text' },
      { name: 'categoria', label: 'Categoria', required: false, type: 'text' },
      { name: 'cdd', label: 'CDD', required: false, type: 'text' },
      { name: 'descricao', label: 'Descrição', required: false, type: 'text' },
      { name: 'cutter', label: 'CUTTER', required: false, type: 'text' },
      {
        name: 'status',
        label: 'Status',
        required: false,
        type: 'select',
        options: ['disponível', 'emprestado', 'manutenção', 'extraviado', 'baixado'],
      },
      { name: 'observacoes', label: 'Observações', required: false, type: 'text' },
    ],
  },
}

export interface MappedRecord {
  rowIndex: number
  data: Record<string, string>
}

export interface ValidationIssue {
  field: string
  message: string
}

export interface ValidationResult {
  valid: MappedRecord[]
  problems: { record: MappedRecord; issues: ValidationIssue[] }[]
}

export function autoMapColumns(headers: string[], importType: string): Record<string, string> {
  const config = IMPORT_CONFIGS[importType]
  if (!config) return {}
  const mapping: Record<string, string> = {}
  for (const header of headers) {
    const normalized = header.toLowerCase().replace(/^\uFEFF/, '').trim()
    const exactMatch = config.fields.find((field) => {
      const fieldLabel = field.label.toLowerCase().replace(/\s+/g, '_')
      const fieldName = field.name.toLowerCase()
      return normalized === fieldName || normalized === fieldLabel
    })
    if (exactMatch) {
      mapping[header] = exactMatch.name
      continue
    }
    const partialMatch = config.fields.find((field) => {
      const fieldLabel = field.label.toLowerCase().replace(/\s+/g, '_')
      const fieldName = field.name.toLowerCase()
      return normalized.includes(fieldName) || normalized.includes(fieldLabel)
    })
    if (partialMatch) mapping[header] = partialMatch.name
  }
  return mapping
}

export function mapRecords(
  headers: string[],
  rows: string[][],
  mapping: Record<string, string>,
): MappedRecord[] {
  return rows.map((row, rowIndex) => {
    const data: Record<string, string> = {}
    headers.forEach((header, i) => {
      const fieldName = mapping[header]
      if (fieldName) {
        data[fieldName] = row[i] || ''
      }
    })
    return { rowIndex, data }
  })
}

export function validateRecords(
  records: MappedRecord[],
  importType: string,
  existing: Set<string>,
): ValidationResult {
  const config = IMPORT_CONFIGS[importType]
  if (!config) return { valid: [], problems: [] }
  const valid: MappedRecord[] = []
  const problems: { record: MappedRecord; issues: ValidationIssue[] }[] = []
  for (const record of records) {
    const issues: ValidationIssue[] = []
    for (const field of config.fields) {
      if (field.required && !record.data[field.name]?.trim()) {
        issues.push({ field: field.name, message: `${field.label} é obrigatório` })
      }
    }
    if (record.data.numero_cadastro && existing.has(record.data.numero_cadastro)) {
      issues.push({ field: 'numero_cadastro', message: 'Número de cadastro já existe' })
    }
    if (issues.length > 0) {
      problems.push({ record, issues })
    } else {
      valid.push(record)
    }
  }
  return { valid, problems }
}

export function normalizeRecord(record: MappedRecord, importType: string): Record<string, string> {
  const config = IMPORT_CONFIGS[importType]
  if (!config) return record.data
  const normalized: Record<string, string> = {}
  for (const field of config.fields) {
    const value = record.data[field.name]?.trim() || ''
    if (value) {
      normalized[field.name] = value
    }
  }
  if (!normalized.status) {
    normalized.status = importType === 'leitores' ? 'ativo' : 'disponível'
  }
  return normalized
}
