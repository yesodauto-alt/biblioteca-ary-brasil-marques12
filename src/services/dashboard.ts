import pb from '@/lib/pocketbase/client'
import { getSituacao, getTodayInTimezone, getDaysOverdue, isValidDate } from '@/lib/loan-utils'
import { formatNumeroCadastro } from '@/lib/code-formatter'

export interface DashboardStats {
  livrosEmprestados: number
  devolucoesPrevistasHoje: number
  emprestimosAtrasados: number
  usuariosAtivos: number
  livrosDisponiveis: number
  devolucoesRealizadasHoje: number
}

export interface AttentionItem {
  id: string
  leitorId: string
  leitorNome: string
  leitorNumero: string
  livroId: string
  livroTitulo: string
  dataPrevistaDevolucao: string
  situacao: 'atrasado' | 'hoje'
  daysOverdue: number | null
}

export interface SearchResult {
  type: 'leitor' | 'livro'
  id: string
  primary: string
  secondary: string
}

export async function fetchDashboardData(): Promise<{
  stats: DashboardStats
  attentionItems: AttentionItem[]
}> {
  const today = getTodayInTimezone()

  const [activeRes, devolvidosRes, leitoresRes, livrosRes] = await Promise.allSettled([
    pb.collection('emprestimos').getFullList({
      filter: 'status = "ativo" || status = "atrasado"',
      sort: 'data_prevista_devolucao',
      expand: 'leitor,livro',
    }),
    pb.collection('emprestimos').getList(1, 1, {
      filter: `status = "devolvido" && data_devolucao_real = "${today}"`,
    }),
    pb.collection('leitores').getList(1, 1, {
      filter: 'status = "ativo"',
    }),
    pb.collection('livros').getList(1, 1, {
      filter: 'status = "disponível"',
    }),
  ])

  const activeEmprestimos = activeRes.status === 'fulfilled' ? activeRes.value : []
  const devolvidosToday = devolvidosRes.status === 'fulfilled' ? devolvidosRes.value.totalItems : 0
  const usuariosAtivos = leitoresRes.status === 'fulfilled' ? leitoresRes.value.totalItems : 0
  const livrosDisponiveis = livrosRes.status === 'fulfilled' ? livrosRes.value.totalItems : 0

  const overdue = activeEmprestimos.filter(
    (e: any) =>
      isValidDate(e.data_prevista_devolucao) &&
      getSituacao(e.data_prevista_devolucao) === 'atrasado',
  )
  const dueToday = activeEmprestimos.filter(
    (e: any) =>
      isValidDate(e.data_prevista_devolucao) &&
      getSituacao(e.data_prevista_devolucao) === 'vence-hoje',
  )

  const stats: DashboardStats = {
    livrosEmprestados: activeEmprestimos.length,
    devolucoesPrevistasHoje: dueToday.length,
    emprestimosAtrasados: overdue.length,
    usuariosAtivos,
    livrosDisponiveis,
    devolucoesRealizadasHoje: devolvidosToday,
  }

  const buildItem = (e: any, situacao: 'atrasado' | 'hoje'): AttentionItem => ({
    id: e.id,
    leitorId: e.leitor,
    leitorNome: e.expand?.leitor?.nome_completo || '—',
    leitorNumero: formatNumeroCadastro(e.expand?.leitor?.numero_cadastro),
    livroId: e.livro,
    livroTitulo: e.expand?.livro?.titulo || '—',
    dataPrevistaDevolucao: e.data_prevista_devolucao,
    situacao,
    daysOverdue: situacao === 'atrasado' ? getDaysOverdue(e.data_prevista_devolucao) : null,
  })

  const attentionItems: AttentionItem[] = [
    ...overdue.map((e: any) => buildItem(e, 'atrasado')),
    ...dueToday.map((e: any) => buildItem(e, 'hoje')),
  ]

  return { stats, attentionItems }
}

export async function searchDashboard(query: string): Promise<SearchResult[]> {
  const q = query.trim().replace(/"/g, '')
  if (!q) return []

  const results: SearchResult[] = []

  const [leitoresRes, livrosRes] = await Promise.allSettled([
    pb.collection('leitores').getList(1, 10, {
      filter: `numero_cadastro ~ "${q}" || nome_completo ~ "${q}" || telefone ~ "${q}"`,
    }),
    pb.collection('livros').getList(1, 10, {
      filter: `numero_cadastro ~ "${q}" || titulo ~ "${q}" || autor ~ "${q}"`,
    }),
  ])

  if (leitoresRes.status === 'fulfilled') {
    leitoresRes.value.items.forEach((l: any) => {
      results.push({
        type: 'leitor',
        id: l.id,
        primary: l.nome_completo,
        secondary: `Nº ${formatNumeroCadastro(l.numero_cadastro)}`,
      })
    })
  }

  if (livrosRes.status === 'fulfilled') {
    livrosRes.value.items.forEach((l: any) => {
      results.push({
        type: 'livro',
        id: l.id,
        primary: l.titulo,
        secondary: `${l.autor} — Nº ${formatNumeroCadastro(l.numero_cadastro)}`,
      })
    })
  }

  return results
}
