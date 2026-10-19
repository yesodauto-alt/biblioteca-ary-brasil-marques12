import { supabase } from '@/lib/supabase/client'

type RecordValue = Record<string, any>

const TABLES: Record<string, string> = {
  leitores: 'leitores',
  livros: 'livros',
  voluntarios: 'voluntarios',
  cursos: 'cursos',
  cursos_livros: 'cursos_livros',
  configuracoes: 'configuracoes',
  emprestimos: 'emprestimos',
  auditoria: 'auditoria',
}

const SELECTS: Record<string, string> = {
  emprestimos: '*, leitor:leitores(*), livro:livros(*), responsavel_voluntario:voluntarios!emprestimos_responsavel_voluntario_id_fkey(*)',
  cursos_livros: '*, livro:livros(*)',
}

const FIELD_MAP: Record<string, string> = {
  leitor: 'leitor_id',
  livro: 'livro_id',
  curso: 'curso_id',
  responsavel_voluntario: 'responsavel_voluntario_id',
  responsavel: 'responsavel_id',
  created: 'created_at',
  updated: 'updated_at',
}

function dbField(field: string) {
  return FIELD_MAP[field] ?? field
}

function fromDb(collection: string, row: RecordValue): RecordValue {
  if (!row) return row
  const value: RecordValue = {
    ...row,
    created: row.created_at ?? row.created,
    updated: row.updated_at ?? row.updated,
  }
  if (collection === 'emprestimos') {
    value.leitor = row.leitor_id ?? (typeof row.leitor === 'object' ? row.leitor?.id : row.leitor)
    value.livro = row.livro_id ?? (typeof row.livro === 'object' ? row.livro?.id : row.livro)
    value.responsavel_voluntario =
      row.responsavel_voluntario_id ??
      (typeof row.responsavel_voluntario === 'object'
        ? row.responsavel_voluntario?.id
        : row.responsavel_voluntario)
    value.expand = {
      ...(row.leitor && typeof row.leitor === 'object' ? { leitor: fromDb('leitores', row.leitor) } : {}),
      ...(row.livro && typeof row.livro === 'object' ? { livro: fromDb('livros', row.livro) } : {}),
      ...(row.responsavel_voluntario && typeof row.responsavel_voluntario === 'object'
        ? { responsavel_voluntario: fromDb('voluntarios', row.responsavel_voluntario) }
        : {}),
    }
  }
  if (collection === 'cursos_livros') {
    value.curso = row.curso_id ?? (typeof row.curso === 'object' ? row.curso?.id : row.curso)
    value.livro = row.livro_id ?? (typeof row.livro === 'object' ? row.livro?.id : row.livro)
    value.expand =
      row.livro && typeof row.livro === 'object' ? { livro: fromDb('livros', row.livro) } : {}
  }
  if (collection === 'voluntarios' && row.matricula != null) value.matricula = String(row.matricula)
  return value
}

function toDb(data: RecordValue) {
  const payload: RecordValue = {}
  for (const [key, value] of Object.entries(data)) {
    if (key === 'id' || key === 'created' || key === 'updated' || key === 'expand') continue
    payload[dbField(key)] = value
  }
  return payload
}

function compare(value: unknown, op: string, expected: string) {
  const actual = value == null ? '' : String(value)
  if (op === '~') return actual.toLocaleLowerCase().includes(expected.toLocaleLowerCase())
  if (op === '=') return actual === expected
  if (op === '!=') return actual !== expected
  if (op === '>=') return actual >= expected
  return actual <= expected
}

function matchesFilter(record: RecordValue, filter?: string) {
  if (!filter) return true
  return filter.split(' || ').some((orPart) =>
    orPart.split(' && ').every((term) => {
      const match = term.trim().match(/^([\w_]+)\s*(=|!=|>=|<=|~)\s*"([^"]*)"$/)
      if (!match) return false
      return compare(record[match[1]], match[2], match[3])
    }),
  )
}

function sortRecords(records: RecordValue[], sort?: string) {
  if (!sort) return records
  const descending = sort.startsWith('-')
  const field = dbField(descending ? sort.slice(1) : sort)
  return [...records].sort((a, b) => {
    const result = String(a[field] ?? '').localeCompare(String(b[field] ?? ''))
    return descending ? -result : result
  })
}

class Collection {
  constructor(private readonly name: string) {}

  private async load(options: RecordValue = {}) {
    const table = TABLES[this.name]
    const pageSize = 1000
    let allData: any[] = []
    let from = 0

    while (true) {
      const { data, error } = await supabase
        .from(table)
        .select(SELECTS[this.name] ?? '*')
        .range(from, from + pageSize - 1)
      if (error) throw error
      if (!data || data.length === 0) break
      allData.push(...data)
      if (data.length < pageSize) break
      from += pageSize
    }

    return sortRecords(allData.map((row) => fromDb(this.name, row)), options.sort).filter((row) =>
      matchesFilter(row, options.filter),
    )
  }

  async getFullList<T = RecordValue>(options: RecordValue = {}): Promise<T[]> {
    return (await this.load(options)) as T[]
  }

  async getList<T = RecordValue>(page: number, perPage: number, options: RecordValue = {}) {
    const rows = await this.load(options)
    const start = (page - 1) * perPage
    return { items: rows.slice(start, start + perPage) as T[], totalItems: rows.length }
  }

  async getOne<T = RecordValue>(id: string): Promise<T> {
    const table = TABLES[this.name]
    try {
      const { data, error } = await supabase
        .from(table)
        .select(SELECTS[this.name] ?? '*')
        .eq('id', id)
        .maybeSingle()
      if (!error && data) {
        return fromDb(this.name, data) as T
      }
    } catch {
      /* ignore and try memory fallback */
    }

    const rows = await this.load()
    const found = rows.find((item) => String(item.id) === String(id))
    if (found) return found as T
    throw new Error('Registro não encontrado')
  }

  async getFirstListItem<T = RecordValue>(filter: string, options: RecordValue = {}): Promise<T> {
    const rows = await this.load({ ...options, filter })
    if (!rows[0]) throw new Error('Registro não encontrado')
    return rows[0] as T
  }

  async create<T = RecordValue>(data: RecordValue): Promise<T> {
    if (this.name === 'emprestimos') {
      const { data: result, error } = await supabase.rpc('criar_emprestimo', {
        p_leitor_id: data.leitor,
        p_livro_id: data.livro,
        p_voluntario_id: data.responsavel_voluntario,
        p_tipo: data.tipo_emprestimo ?? 'comum',
      })
      if (error) throw error
      return fromDb(this.name, result) as T
    }
    const { data: result, error } = await supabase
      .from(TABLES[this.name])
      .insert(toDb(data))
      .select(SELECTS[this.name] ?? '*')
      .single()
    if (error) throw error
    return fromDb(this.name, result) as T
  }

  async update<T = RecordValue>(id: string, data: RecordValue): Promise<T> {
    const { data: result, error } = await supabase
      .from(TABLES[this.name])
      .update(toDb(data))
      .eq('id', id)
      .select(SELECTS[this.name] ?? '*')
      .single()
    if (error) throw error
    return fromDb(this.name, result) as T
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from(TABLES[this.name]).delete().eq('id', id)
    if (error) throw error
  }
}

const pb = {
  collection(name: string) {
    return new Collection(name)
  },
  async send(path: string, options: RecordValue = {}) {
    const body = options.body ? JSON.parse(options.body) : {}
    if (path === '/backend/v1/config') {
      const { data, error } = await supabase.from('configuracoes').select('*').limit(1).single()
      if (error) throw error
      return fromDb('configuracoes', data)
    }
    const rpc: Record<string, { fn: string; args: RecordValue }> = {
      '/backend/v1/emprestimos/devolver': { fn: 'devolver_emprestimo', args: {} },
      '/backend/v1/emprestimos/renovar': { fn: 'renovar_emprestimo', args: {} },
      '/backend/v1/emprestimos/excluir': { fn: 'excluir_emprestimo', args: {} },
      '/backend/v1/emprestimos/editar': { fn: 'editar_emprestimo', args: {} },
    }
    const match = path.match(/^\/backend\/v1\/emprestimos\/([^/]+)\/(devolver|renovar|excluir)$/)
    if (!match) throw new Error('Endpoint não suportado')
    const args =
      match[2] === 'devolver'
        ? { p_id: match[1], p_voluntario_id: body.voluntario_id }
        : match[2] === 'renovar'
          ? { p_id: match[1], p_nova_data: body.nova_data_devolucao, p_voluntario_id: body.voluntario_id }
          : match[2] === 'editar'
          ? { p_id: match[1], p_leitor_id: body.leitor, p_livro_id: body.livro, p_tipo: body.tipo_emprestimo, p_voluntario_id: body.voluntario_id }
          : { p_id: match[1], p_voluntario_id: body.voluntario_id ?? null }
    const { data, error } = await supabase.rpc(rpc['/backend/v1/emprestimos/' + match[2]].fn, args)
    if (error) throw error
    return data ? fromDb('emprestimos', data) : data
  },
}

export default pb
