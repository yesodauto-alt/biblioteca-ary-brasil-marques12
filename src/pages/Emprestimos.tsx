import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowLeftRight, Search, BookOpen, User, Calendar, Plus, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmprestimoForm } from '@/components/emprestimos/EmprestimoForm'
import { EmprestimoDetalhes } from '@/components/emprestimos/EmprestimoDetalhes'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { LeitorFicha } from '@/components/usuarios/LeitorFicha'
import { LivroFicha } from '@/components/acervo/LivroFicha'
import { getActiveEmprestimos, type EmprestimoWithLeitor } from '@/services/emprestimos'
import { searchLeitores, type Leitor } from '@/services/leitores'
import { useRealtime } from '@/hooks/use-realtime'
import {
  getSituacao,
  SITUACAO_LABELS,
  SITUACAO_BADGE,
  SITUACAO_PRIORITY,
  formatDate,
} from '@/lib/loan-utils'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatNumeroCadastro } from '@/lib/code-formatter'

type FilterType = 'todos' | 'em-dia' | 'vence-hoje' | 'atrasados' | 'comum' | 'estudo'

const FILTERS: { label: string; value: FilterType }[] = [
  { label: 'Todos', value: 'todos' },
  { label: 'Em dia', value: 'em-dia' },
  { label: 'Vence hoje', value: 'vence-hoje' },
  { label: 'Atrasados', value: 'atrasados' },
  { label: 'Comum', value: 'comum' },
  { label: 'Estudo', value: 'estudo' },
]

const TIPO_LABELS: Record<string, string> = { comum: 'Comum', estudo: 'Estudo' }

export default function Emprestimos() {
  const [emprestimos, setEmprestimos] = useState<EmprestimoWithLeitor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchParams] = useSearchParams()
  const [filter, setFilter] = useState<FilterType>(
    (searchParams.get('filter') as FilterType) || 'todos',
  )
  const [leitorFichaId, setLeitorFichaId] = useState<string | null>(null)
  const [leitorFichaOpen, setLeitorFichaOpen] = useState(false)
  const [livroFichaId, setLivroFichaId] = useState<string | null>(null)
  const [livroFichaOpen, setLivroFichaOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [formLeitor, setFormLeitor] = useState<Leitor | null>(null)
  const [leitorResults, setLeitorResults] = useState<Leitor[]>([])
  const [detalhesId, setDetalhesId] = useState<string | null>(null)
  const [detalhesOpen, setDetalhesOpen] = useState(false)

  useEffect(() => {
    const q = search.trim()
    if (!q) {
      setLeitorResults([])
      return
    }
    const timer = setTimeout(async () => {
      try {
        const results = await searchLeitores(q)
        setLeitorResults(results)
      } catch {
        setLeitorResults([])
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const loadData = useCallback(async () => {
    try {
      const data = await getActiveEmprestimos()
      setEmprestimos(data)
    } catch {
      toast.error('Erro ao carregar empréstimos.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('emprestimos', () => {
    loadData()
  })

  const sorted = useMemo(() => {
    return [...emprestimos].sort((a, b) => {
      const sa = getSituacao(a.data_prevista_devolucao)
      const sb = getSituacao(b.data_prevista_devolucao)
      const pa = SITUACAO_PRIORITY[sa] ?? 3
      const pb = SITUACAO_PRIORITY[sb] ?? 3
      if (pa !== pb) return pa - pb
      const da = String(a.data_prevista_devolucao || '')
      const db = String(b.data_prevista_devolucao || '')
      return da.localeCompare(db)
    })
  }, [emprestimos])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return sorted.filter((emp) => {
      const situacao = getSituacao(emp.data_prevista_devolucao)
      if (filter === 'em-dia' && situacao !== 'em-dia') return false
      if (filter === 'vence-hoje' && situacao !== 'vence-hoje') return false
      if (filter === 'atrasados' && situacao !== 'atrasado') return false
      if (filter === 'comum' && (emp.tipo_emprestimo || 'comum') !== 'comum') return false
      if (filter === 'estudo' && emp.tipo_emprestimo !== 'estudo') return false
      if (!q) return true
      const nome = String(emp.expand?.leitor?.nome_completo || '').toLowerCase()
      const numLeitor = String(emp.expand?.leitor?.numero_cadastro || '').toLowerCase()
      const titulo = String(emp.expand?.livro?.titulo || '').toLowerCase()
      const numLivro = String(emp.expand?.livro?.numero_cadastro || '').toLowerCase()
      return nome.includes(q) || numLeitor.includes(q) || titulo.includes(q) || numLivro.includes(q)
    })
  }, [sorted, search, filter])

  const openLeitor = (id: string) => {
    setLeitorFichaId(id)
    setLeitorFichaOpen(true)
  }

  const openLivro = (id: string) => {
    setLivroFichaId(id)
    setLivroFichaOpen(true)
  }

  const openDetalhes = (id: string) => {
    setDetalhesId(id)
    setDetalhesOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#1F5C8B] flex items-center justify-center text-white shrink-0">
            <ArrowLeftRight className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Empréstimos</h2>
            <p className="text-sm text-gray-500">Empréstimos ativos da biblioteca</p>
          </div>
        </div>
        <Button
          onClick={() => {
            setFormLeitor(null)
            setFormOpen(true)
          }}
          className="h-11 px-4 text-sm font-semibold bg-[#1F5C8B] hover:bg-[#174A73] shadow-sm"
        >
          <Plus className="w-5 h-5 mr-2" />+ Novo empréstimo
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por usuário, número, livro..."
          className="h-12 pl-12 text-base border-gray-200"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              'px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
              filter === f.value
                ? 'bg-[#1F5C8B] text-white shadow-sm'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {leitorResults.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Usuários encontrados — clique para iniciar empréstimo
          </p>
          {leitorResults.map((leitor) => (
            <button
              key={leitor.id}
              onClick={() => {
                setFormLeitor(leitor)
                setFormOpen(true)
              }}
              className="w-full text-left bg-white border border-gray-200/80 rounded-lg p-4 hover:border-[#1F5C8B]/40 hover:bg-[#1F5C8B]/5 transition-all duration-200"
            >
              <div className="flex items-center gap-2">
                <User className="w-6 h-6 text-[#1F5C8B] shrink-0" />
                <span className="text-lg font-bold text-gray-900">{leitor.nome_completo}</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 ml-8">
                <span className="text-base text-gray-600">Cadastro: {formatNumeroCadastro(leitor.numero_cadastro)}</span>
                {leitor.telefone && (
                  <span className="text-base text-gray-600 flex items-center gap-1">
                    <Phone className="w-4 h-4" /> {leitor.telefone}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 && leitorResults.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-600">
            {search || filter !== 'todos'
              ? 'Nenhum empréstimo encontrado.'
              : 'Nenhum empréstimo ativo.'}
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div />
      ) : (
        <div className="space-y-3">
          {filtered.map((emp) => {
            const situacao = getSituacao(emp.data_prevista_devolucao)
            const tipo = TIPO_LABELS[emp.tipo_emprestimo || 'comum'] || 'Comum'
            return (
              <div
                key={emp.id}
                onClick={() => openDetalhes(emp.id)}
                className={cn(
                  'bg-white border rounded-lg p-4 transition-all duration-200 cursor-pointer hover:shadow-md',
                  situacao === 'atrasado'
                    ? 'border-red-200 bg-red-50/30'
                    : situacao === 'vence-hoje'
                      ? 'border-yellow-200 bg-yellow-50/30'
                      : 'border-gray-200/80',
                )}
              >
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        const targetId = emp.expand?.leitor?.id || emp.leitor
                        if (targetId) openLeitor(targetId)
                      }}
                      className="flex items-start gap-3 text-left hover:opacity-80 transition-opacity flex-1"
                    >
                      <User className="w-6 h-6 text-[#1F5C8B] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-lg font-bold text-gray-900 break-words">
                          {emp.expand?.leitor?.nome_completo || 'Leitor não encontrado'}
                        </p>
                        <p className="text-base text-gray-600">
                          {emp.expand?.leitor?.numero_cadastro
                            ? `Nº ${formatNumeroCadastro(emp.expand.leitor.numero_cadastro)}`
                            : '—'}
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        const targetId = emp.expand?.livro?.id || emp.livro
                        if (targetId) openLivro(targetId)
                      }}
                      className="flex items-start gap-3 text-left hover:opacity-80 transition-opacity flex-1"
                    >
                      <BookOpen className="w-6 h-6 text-[#1F5C8B] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-lg font-bold text-gray-900 break-words">
                          {emp.expand?.livro?.titulo || 'Livro não encontrado'}
                        </p>
                        <p className="text-base text-gray-600">
                          {emp.expand?.livro?.numero_cadastro
                            ? `Nº ${formatNumeroCadastro(emp.expand.livro.numero_cadastro)}`
                            : '—'}
                        </p>
                      </div>
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-100">
                    <Badge
                      className={cn(
                        emp.tipo_emprestimo === 'estudo'
                          ? 'bg-purple-100 text-purple-800 hover:bg-purple-100'
                          : 'bg-blue-100 text-blue-800 hover:bg-blue-100',
                      )}
                    >
                      {tipo}
                    </Badge>
                    <div className="flex items-center gap-1.5 text-base text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>Empréstimo: {formatDate(emp.data_emprestimo)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-base text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>Devolução: {formatDate(emp.data_prevista_devolucao)}</span>
                    </div>
                    <Badge className={SITUACAO_BADGE[situacao]}>{SITUACAO_LABELS[situacao]}</Badge>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <EmprestimoForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setFormLeitor(null)
        }}
        onCreated={() => loadData()}
        preselectedLeitor={formLeitor}
      />
      <LeitorFicha
        leitorId={leitorFichaId}
        open={leitorFichaOpen}
        onOpenChange={setLeitorFichaOpen}
      />
      <LivroFicha livroId={livroFichaId} open={livroFichaOpen} onOpenChange={setLivroFichaOpen} />
      <EmprestimoDetalhes
        emprestimoId={detalhesId}
        open={detalhesOpen}
        onOpenChange={setDetalhesOpen}
        onChanged={loadData}
      />
    </div>
  )
}
