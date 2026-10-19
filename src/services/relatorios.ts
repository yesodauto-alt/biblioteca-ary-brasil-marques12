import pb from '@/lib/pocketbase/client'
import { getTodayInTimezone } from '@/lib/loan-utils'

export interface PeriodFilter {
  start: string
  end: string
}

export interface EmprestimoRow {
  id: string
  leitorId: string
  leitorNome: string
  leitorNumero: string
  livroId: string
  livroTitulo: string
  livroNumero: string
  dataEmprestimo: string
  dataPrevistaDevolucao: string
  dataDevolucaoReal: string
  status: string
  quantidadeRenovacoes: number
}

export interface RenovacaoRow {
  id: string
  leitorId: string
  leitorNome: string
  leitorNumero: string
  livroId: string
  livroTitulo: string
  dataRenovacao: string
  novaDataPrevista: string
  responsavelNome: string
}

export interface LivroDisponivelRow {
  id: string
  numeroCadastro: string
  titulo: string
  autor: string
  editora: string
  categoria: string
  localizacaoFisica: string
  status: string
}

export interface LivroMaisEmprestadoRow {
  livroId: string
  titulo: string
  numeroCadastro: string
  autor: string
  quantidade: number
}

export interface UsuarioMaisUtilizaRow {
  leitorId: string
  nome: string
  numeroCadastro: string
  telefone: string
  quantidade: number
}

function mapEmprestimo(r: any): EmprestimoRow {
  return {
    id: r.id,
    leitorId: r.leitor || '',
    leitorNome: r.expand?.leitor?.nome_completo || '—',
    leitorNumero: r.expand?.leitor?.numero_cadastro || '—',
    livroId: r.livro || '',
    livroTitulo: r.expand?.livro?.titulo || '—',
    livroNumero: r.expand?.livro?.numero_cadastro || '—',
    dataEmprestimo: r.data_emprestimo || '',
    dataPrevistaDevolucao: r.data_prevista_devolucao || '',
    dataDevolucaoReal: r.data_devolucao_real || '',
    status: r.status || '',
    quantidadeRenovacoes: r.quantidade_renovacoes || 0,
  }
}

export async function fetchEmprestimosRealizados(period: PeriodFilter): Promise<EmprestimoRow[]> {
  const records = await pb.collection('emprestimos').getFullList({
    filter: `data_emprestimo >= "${period.start}" && data_emprestimo <= "${period.end}"`,
    sort: '-data_emprestimo',
    expand: 'leitor,livro',
  })
  return records.map(mapEmprestimo)
}

export async function fetchDevolucoesRealizadas(period: PeriodFilter): Promise<EmprestimoRow[]> {
  const records = await pb.collection('emprestimos').getFullList({
    filter: `data_devolucao_real != "" && data_devolucao_real >= "${period.start}" && data_devolucao_real <= "${period.end}"`,
    sort: '-data_devolucao_real',
    expand: 'leitor,livro',
  })
  return records.map(mapEmprestimo)
}

export async function fetchRenovacoesRealizadas(period: PeriodFilter): Promise<RenovacaoRow[]> {
  const auditRecords = await pb.collection('auditoria').getFullList({
    filter: `acao = "renovacao" && created >= "${period.start}T00:00:00" && created <= "${period.end}T23:59:59"`,
    sort: '-created',
    expand: 'usuario',
  })
  if (auditRecords.length === 0) return []

  const uniqueIds = [...new Set(auditRecords.map((r: any) => r.registro_id).filter(Boolean))]
  const idFilter = uniqueIds.map((id: string) => `id = "${id}"`).join(' || ')
  const emprestimos = await pb
    .collection('emprestimos')
    .getFullList({ filter: idFilter, expand: 'leitor,livro' })
  const empMap = new Map(emprestimos.map((e: any) => [e.id, e]))

  return auditRecords.map((audit: any) => {
    const emp = empMap.get(audit.registro_id) as any
    return {
      id: audit.id,
      leitorId: emp?.leitor || '',
      leitorNome: emp?.expand?.leitor?.nome_completo || '—',
      leitorNumero: emp?.expand?.leitor?.numero_cadastro || '—',
      livroId: emp?.livro || '',
      livroTitulo: emp?.expand?.livro?.titulo || '—',
      dataRenovacao: audit.created,
      novaDataPrevista: emp?.data_prevista_devolucao || '—',
      responsavelNome: audit.expand?.usuario?.name || audit.expand?.usuario?.email || '—',
    }
  })
}

export async function fetchEmprestimosAtivos(_period?: PeriodFilter): Promise<EmprestimoRow[]> {
  const records = await pb.collection('emprestimos').getFullList({
    filter: `status = "ativo" || status = "atrasado"`,
    sort: '-data_emprestimo',
    expand: 'leitor,livro',
  })
  return records.map(mapEmprestimo)
}

export async function fetchEmprestimosAtrasados(_period?: PeriodFilter): Promise<EmprestimoRow[]> {
  const today = getTodayInTimezone()
  const records = await pb.collection('emprestimos').getFullList({
    filter: `(status = "ativo" || status = "atrasado") && data_prevista_devolucao != "" && data_prevista_devolucao < "${today}"`,
    sort: 'data_prevista_devolucao',
    expand: 'leitor,livro',
  })
  return records.map(mapEmprestimo)
}

export async function fetchLivrosDisponiveis(
  _period?: PeriodFilter,
): Promise<LivroDisponivelRow[]> {
  const records = await pb
    .collection('livros')
    .getFullList({ filter: `status = "disponível"`, sort: 'titulo' })
  return records.map((r: any) => ({
    id: r.id,
    numeroCadastro: r.numero_cadastro || '',
    titulo: r.titulo || '',
    autor: r.autor || '',
    editora: r.editora || '',
    categoria: r.categoria || '—',
    localizacaoFisica: r.localizacao_fisica || '—',
    status: r.status || '',
  }))
}

export async function fetchLivrosMaisEmprestados(
  _period?: PeriodFilter,
): Promise<LivroMaisEmprestadoRow[]> {
  const records = await pb.collection('emprestimos').getFullList({ expand: 'livro' })
  const counts = new Map<string, { livro: any; count: number }>()
  for (const r of records as any[]) {
    const id = r.livro
    const existing = counts.get(id)
    if (existing) existing.count++
    else counts.set(id, { livro: r.expand?.livro, count: 1 })
  }
  return Array.from(counts.entries())
    .map(([id, { livro, count }]) => ({
      livroId: id,
      titulo: livro?.titulo || '—',
      numeroCadastro: livro?.numero_cadastro || '—',
      autor: livro?.autor || '—',
      quantidade: count,
    }))
    .sort((a, b) => b.quantidade - a.quantidade)
}

export async function fetchUsuariosMaisUtilizam(
  _period?: PeriodFilter,
): Promise<UsuarioMaisUtilizaRow[]> {
  const records = await pb.collection('emprestimos').getFullList({ expand: 'leitor' })
  const counts = new Map<string, { leitor: any; count: number }>()
  for (const r of records as any[]) {
    const id = r.leitor
    const existing = counts.get(id)
    if (existing) existing.count++
    else counts.set(id, { leitor: r.expand?.leitor, count: 1 })
  }
  return Array.from(counts.entries())
    .map(([id, { leitor, count }]) => ({
      leitorId: id,
      nome: leitor?.nome_completo || '—',
      numeroCadastro: leitor?.numero_cadastro || '—',
      telefone: leitor?.telefone || '—',
      quantidade: count,
    }))
    .sort((a, b) => b.quantidade - a.quantidade)
}

export interface TodoAcervoRow {
  id: string
  numeroCadastro: string
  titulo: string
  autor: string
  editora: string
  categoria: string
  cdd: string
  cutter: string
  status: string
}

export async function fetchTodoAcervo(_period?: PeriodFilter): Promise<TodoAcervoRow[]> {
  const records = await pb.collection('livros').getFullList({ sort: 'titulo' })
  return records.map((r: any) => ({
    id: r.id,
    numeroCadastro: r.numero_cadastro || '',
    titulo: r.titulo || '',
    autor: r.autor || '',
    editora: r.editora || '',
    categoria: r.categoria || '—',
    cdd: r.cdd || '—',
    cutter: r.cutter || '—',
    status: r.status || 'disponível',
  }))
}

export interface TodosLeitoresRow {
  id: string
  numeroCadastro: string
  nome: string
  telefone: string
  email: string
  dataCadastro: string
  status: string
}

export async function fetchTodosLeitores(_period?: PeriodFilter): Promise<TodosLeitoresRow[]> {
  const records = await pb.collection('leitores').getFullList({ sort: 'nome_completo' })
  return records.map((r: any) => ({
    id: r.id,
    numeroCadastro: r.numero_cadastro || '',
    nome: r.nome_completo || '',
    telefone: r.telefone || '—',
    email: r.email || '—',
    dataCadastro: r.data_cadastro || '',
    status: r.status || 'ativo',
  }))
}

