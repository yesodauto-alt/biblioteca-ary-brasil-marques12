import { useState, useRef, useEffect } from 'react'
import {
  CornerUpLeft,
  BookOpen,
  User,
  Calendar,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  Search,
  X,
  ArrowLeft,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { VolunteerSelect } from '@/components/volunteers/VolunteerSelect'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useRealtime } from '@/hooks/use-realtime'
import {
  getActiveEmprestimoByLivroCadastro,
  devolverEmprestimo,
  renovarEmprestimo,
  getEmprestimosByLeitor,
  type EmprestimoWithLeitor,
} from '@/services/emprestimos'
import { searchLeitores, type Leitor } from '@/services/leitores'
import { getConfiguracoes, type Configuracoes } from '@/services/configuracoes'
import { formatDate, formatDateTime, normalizeToDate } from '@/lib/loan-utils'
import { formatNumeroCadastro } from '@/lib/code-formatter'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

function getLoanSituation(dataPrevista: string): { label: string; isLate: boolean } {
  if (!dataPrevista) return { label: 'Data não informada', isLate: false }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const normalized = normalizeToDate(dataPrevista)
  if (!normalized) return { label: 'Data não informada', isLate: false }
  const due = new Date(normalized + 'T00:00:00')
  if (isNaN(due.getTime())) return { label: 'Data não informada', isLate: false }
  due.setHours(0, 0, 0, 0)
  return { label: today > due ? 'Atrasado' : 'No prazo', isLate: today > due }
}

export default function Devolucao() {
  const [searchMode, setSearchMode] = useState<'livro' | 'leitor'>('livro')
  const [bookSearch, setBookSearch] = useState('')
  const [leitorSearch, setLeitorSearch] = useState('')
  const [leitorResults, setLeitorResults] = useState<Leitor[]>([])
  const [selectedLeitor, setSelectedLeitor] = useState<Leitor | null>(null)
  const [leitorLoans, setLeitorLoans] = useState<EmprestimoWithLeitor[]>([])
  const [loadingLoans, setLoadingLoans] = useState(false)

  const [emprestimo, setEmprestimo] = useState<EmprestimoWithLeitor | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [config, setConfig] = useState<Configuracoes | null>(null)
  const [selectedVoluntario, setSelectedVoluntario] = useState('')

  const [renewOpen, setRenewOpen] = useState(false)
  const [newReturnDate, setNewReturnDate] = useState('')
  const [renewing, setRenewing] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    getConfiguracoes()
      .then(setConfig)
      .catch(() => {})
  }, [])

  useEffect(() => {
    const q = leitorSearch.trim()
    if (!q || selectedLeitor) {
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
  }, [leitorSearch, selectedLeitor])

  useRealtime('emprestimos', (e) => {
    if (!emprestimo) return
    if (e.record.id === emprestimo.id) {
      if (e.action === 'update') {
        setEmprestimo({
          ...emprestimo,
          ...e.record,
          expand: emprestimo.expand,
        } as EmprestimoWithLeitor)
      } else if (e.action === 'delete') {
        setEmprestimo(null)
        setBookSearch('')
        if (selectedLeitor) {
          loadLeitorLoans(selectedLeitor)
        }
      }
    }
  })

  const loadLeitorLoans = async (leitor: Leitor) => {
    setLoadingLoans(true)
    setError(null)
    try {
      const loans = await getEmprestimosByLeitor(leitor.id)
      const active = loans
        .filter((e) => e.status === 'ativo' || e.status === 'atrasado')
        .map((e) => ({
          ...e,
          expand: {
            ...e.expand,
            leitor: {
              id: leitor.id,
              nome_completo: leitor.nome_completo,
              numero_cadastro: leitor.numero_cadastro,
            },
          },
        })) as EmprestimoWithLeitor[]
      setLeitorLoans(active)
      if (active.length === 0) {
        setError(`O leitor ${leitor.nome_completo} não possui empréstimos ativos no momento.`)
        setEmprestimo(null)
      } else if (active.length === 1) {
        setEmprestimo(active[0])
        setTimeout(() => confirmRef.current?.focus(), 50)
      } else {
        setEmprestimo(null)
      }
    } catch {
      setError('Erro ao carregar empréstimos deste leitor.')
    } finally {
      setLoadingLoans(false)
    }
  }

  const handleSelectLeitor = (l: Leitor) => {
    setSelectedLeitor(l)
    setLeitorSearch(l.nome_completo)
    setLeitorResults([])
    setSuccess(null)
    loadLeitorLoans(l)
  }

  const handleClearLeitor = () => {
    setSelectedLeitor(null)
    setLeitorSearch('')
    setLeitorResults([])
    setLeitorLoans([])
    setEmprestimo(null)
    setError(null)
  }

  const handleBookLookup = async () => {
    const num = bookSearch.trim()
    if (!num) return
    setEmprestimo(null)
    setError(null)
    setSuccess(null)
    try {
      const emp = await getActiveEmprestimoByLivroCadastro(num)
      setEmprestimo(emp)
      setTimeout(() => confirmRef.current?.focus(), 50)
    } catch {
      setError('Nenhum empréstimo ativo encontrado para este livro.')
      inputRef.current?.focus()
    }
  }

  const situation = emprestimo ? getLoanSituation(emprestimo.data_prevista_devolucao) : null
  const renewLimitReached =
    !!config && !!emprestimo && emprestimo.quantidade_renovacoes >= config.limite_renovacoes
  const canRenew =
    !!config && !!emprestimo && emprestimo.quantidade_renovacoes < config.limite_renovacoes

  const handleOpenRenew = () => {
    if (!emprestimo || !config || !canRenew) return
    if (!selectedVoluntario) {
      toast.error('Selecione o voluntário responsável por esta operação.')
      return
    }
    const due = new Date(normalizeToDate(emprestimo.data_prevista_devolucao) + 'T00:00:00')
    due.setDate(due.getDate() + config.prazo_devolucao_dias)
    setNewReturnDate(due.toISOString().split('T')[0])
    setRenewOpen(true)
  }

  const handleConfirmRenew = async () => {
    if (!emprestimo || !newReturnDate || !selectedVoluntario) return
    setRenewing(true)
    try {
      const updated = await renovarEmprestimo(emprestimo.id, newReturnDate, selectedVoluntario)
      setEmprestimo({
        ...emprestimo,
        data_prevista_devolucao: updated.data_prevista_devolucao,
        quantidade_renovacoes: updated.quantidade_renovacoes,
      })
      if (selectedLeitor) {
        await loadLeitorLoans(selectedLeitor)
      }
      setRenewOpen(false)
      toast.success('Empréstimo renovado com sucesso!', {
        description: `A ENTREGA SERÁ DIA ${formatDate(newReturnDate)}`,
      })
    } catch (error) {
      console.error('Devolucao renew error:', error)
      toast.error('Não foi possível concluir a operação. Verifique os dados e tente novamente.')
    } finally {
      setRenewing(false)
    }
  }

  const handleConfirmDevolution = async () => {
    if (!emprestimo || submitting) return
    if (!selectedVoluntario) {
      toast.error('Selecione o voluntário responsável por esta operação.')
      return
    }
    setSubmitting(true)
    try {
      await devolverEmprestimo(emprestimo.id, selectedVoluntario)
      setSuccess(`Livro "${emprestimo.expand?.livro?.titulo || ''}" devolvido com sucesso!`)
      setBookSearch('')
      setEmprestimo(null)
      setError(null)
      setSelectedVoluntario('')
      if (selectedLeitor) {
        await loadLeitorLoans(selectedLeitor)
      } else {
        setTimeout(() => inputRef.current?.focus(), 100)
      }
    } catch (error) {
      console.error('Devolucao error:', error)
      toast.error('Não foi possível concluir a operação. Verifique os dados e tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const onBookChange = (v: string) => {
    setBookSearch(v)
    setEmprestimo(null)
    setError(null)
    setSuccess(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#1F5C8B] flex items-center justify-center text-white shrink-0">
          <CornerUpLeft className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Devolução</h2>
          <p className="text-sm text-gray-500">Registro rápido de devoluções</p>
        </div>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          <p className="text-base font-semibold text-green-800">{success}</p>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
        {/* Mode Selector Tabs */}
        <div className="flex border-b border-gray-200 gap-2">
          <button
            type="button"
            onClick={() => {
              setSearchMode('livro')
              setEmprestimo(null)
              setError(null)
            }}
            className={cn(
              'pb-3 px-4 text-base font-semibold border-b-2 transition-colors flex items-center gap-2',
              searchMode === 'livro'
                ? 'border-[#1F5C8B] text-[#1F5C8B]'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            )}
          >
            <BookOpen className="w-4 h-4" />
            Buscar por Nº do Livro
          </button>
          <button
            type="button"
            onClick={() => {
              setSearchMode('leitor')
              setEmprestimo(null)
              setError(null)
            }}
            className={cn(
              'pb-3 px-4 text-base font-semibold border-b-2 transition-colors flex items-center gap-2',
              searchMode === 'leitor'
                ? 'border-[#1F5C8B] text-[#1F5C8B]'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            )}
          >
            <User className="w-4 h-4" />
            Buscar por Nome do Leitor
          </button>
        </div>

        {/* Mode 1: Search by Book Number */}
        {searchMode === 'livro' && (
          <div className="space-y-2">
            <label className="text-base font-bold text-gray-800">
              Número de cadastro do livro
            </label>
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={bookSearch}
                onChange={(e) => onBookChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleBookLookup()
                  }
                }}
                placeholder="Digite o número do livro e pressione ENTER..."
                className="h-12 text-base font-medium border-gray-200 flex-1"
                autoFocus
              />
              <Button
                type="button"
                onClick={handleBookLookup}
                className="h-12 px-6 bg-[#1F5C8B] hover:bg-[#174A73] text-white font-semibold"
              >
                <Search className="w-4 h-4 mr-2" />
                Buscar
              </Button>
            </div>
            {error && (
              <div className="flex items-center gap-2 text-red-600 mt-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span className="font-semibold text-sm">{error}</span>
              </div>
            )}
          </div>
        )}

        {/* Mode 2: Search by Reader Name */}
        {searchMode === 'leitor' && (
          <div className="space-y-3">
            <label className="text-base font-bold text-gray-800">
              Nome ou cadastro do leitor
            </label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                value={leitorSearch}
                onChange={(e) => {
                  setLeitorSearch(e.target.value)
                  if (selectedLeitor) {
                    setSelectedLeitor(null)
                    setLeitorLoans([])
                    setEmprestimo(null)
                    setError(null)
                  }
                }}
                placeholder="Digite o nome ou número de cadastro do leitor..."
                className="h-12 pl-12 pr-20 text-base font-medium border-gray-200"
                autoFocus
              />
              {selectedLeitor && (
                <button
                  type="button"
                  onClick={handleClearLeitor}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1.5 rounded transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Trocar
                </button>
              )}
            </div>

            {/* Results dropdown/list when searching */}
            {!selectedLeitor && leitorResults.length > 0 && (
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-64 overflow-y-auto bg-white shadow-md">
                {leitorResults.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => handleSelectLeitor(l)}
                    className="w-full text-left p-3 hover:bg-blue-50/60 flex items-center justify-between transition-colors"
                  >
                    <div>
                      <p className="font-bold text-gray-900">{l.nome_completo}</p>
                      <p className="text-xs text-gray-500">
                        Cadastro: {formatNumeroCadastro(l.numero_cadastro)} {l.telefone ? `• Tel: ${l.telefone}` : ''}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs text-[#1F5C8B] border-[#1F5C8B]/40">
                      Selecionar
                    </Badge>
                  </button>
                ))}
              </div>
            )}

            {loadingLoans && (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#1F5C8B]" />
                Buscando livros com este leitor...
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-red-600 mt-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span className="font-semibold text-sm">{error}</span>
              </div>
            )}

            {/* Multiple loans selector if reader has > 1 active loan and none is selected */}
            {selectedLeitor && !emprestimo && leitorLoans.length > 1 && (
              <div className="mt-4 space-y-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm font-semibold text-gray-700">
                  O leitor <strong className="text-gray-900">{selectedLeitor.nome_completo}</strong> possui <strong className="text-[#1F5C8B]">{leitorLoans.length} livros</strong> emprestados. Selecione qual deseja devolver:
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {leitorLoans.map((loan) => (
                    <div
                      key={loan.id}
                      className="border border-gray-200 rounded-lg p-3.5 bg-white flex flex-col justify-between gap-3 shadow-sm hover:border-[#1F5C8B]/50 transition-colors"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <Badge
                            className={
                              loan.tipo_emprestimo === 'estudo'
                                ? 'bg-purple-100 text-purple-800 hover:bg-purple-100'
                                : 'bg-blue-100 text-blue-800 hover:bg-blue-100'
                            }
                          >
                            {loan.tipo_emprestimo === 'estudo' ? 'Estudo' : 'Comum'}
                          </Badge>
                          <span className="text-xs font-semibold text-gray-500">
                            Livro Nº {formatNumeroCadastro(loan.expand?.livro?.numero_cadastro)}
                          </span>
                        </div>
                        <p className="font-bold text-gray-900 line-clamp-2">
                          {loan.expand?.livro?.titulo || 'Livro não identificado'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Devolução prevista: <strong>{formatDate(loan.data_prevista_devolucao)}</strong>
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setEmprestimo(loan)}
                        className="bg-[#1F5C8B] hover:bg-[#174A73] text-white w-full font-semibold"
                      >
                        Devolver este livro
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Back button if multiple loans were available and one is currently active */}
            {selectedLeitor && emprestimo && leitorLoans.length > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEmprestimo(null)}
                className="text-xs font-semibold text-gray-600 hover:bg-gray-100 mb-2"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                Voltar à lista de livros de {selectedLeitor.nome_completo}
              </Button>
            )}
          </div>
        )}

        {emprestimo && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-[#1F5C8B]/5 border border-[#1F5C8B]/15 rounded-lg p-4 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <BookOpen className="w-5 h-5 text-[#1F5C8B]" />
                <span className="text-lg font-bold text-gray-900">
                  {emprestimo.expand?.livro?.titulo || 'Título não encontrado'}
                </span>
                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                  Nº {formatNumeroCadastro(emprestimo.expand?.livro?.numero_cadastro)}
                </Badge>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <User className="w-5 h-5 text-[#1F5C8B]" />
                <span className="text-base font-semibold text-gray-900">
                  {emprestimo.expand?.leitor?.nome_completo || 'Leitor não encontrado'}
                </span>
                <Badge className="bg-gray-200 text-gray-700 hover:bg-gray-200">
                  Nº {formatNumeroCadastro(emprestimo.expand?.leitor?.numero_cadastro)}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="flex items-start gap-2">
                  <Calendar className="w-5 h-5 text-[#1F5C8B] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Empréstimo</p>
                    <p className="text-base font-semibold text-gray-900">
                      {formatDateTime(emprestimo.data_emprestimo)}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="w-5 h-5 text-[#1F5C8B] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Devolução prevista</p>
                    <p className="text-base font-semibold text-gray-900">
                      {formatDate(emprestimo.data_prevista_devolucao)}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="w-5 h-5 text-[#1F5C8B] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Situação atual</p>
                    {situation && (
                      <Badge
                        className={
                          situation.isLate
                            ? 'bg-red-100 text-red-800 hover:bg-red-100'
                            : 'bg-green-100 text-green-800 hover:bg-green-100'
                        }
                      >
                        {situation.label}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {emprestimo.quantidade_renovacoes > 0 && (
                <p className="text-sm text-gray-500">
                  Renovações: {emprestimo.quantidade_renovacoes}
                  {config && ` de ${config.limite_renovacoes} permitidas`}
                </p>
              )}
            </div>

            <VolunteerSelect value={selectedVoluntario} onChange={setSelectedVoluntario} />

            {renewLimitReached && (
              <div className="flex items-center gap-2 text-orange-600 bg-orange-50 border border-orange-200 rounded-lg p-3">
                <AlertCircle className="w-5 h-5" />
                <span className="font-semibold">
                  Limite de renovações atingido ({config?.limite_renovacoes} renovações).
                </span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                ref={confirmRef}
                onClick={handleConfirmDevolution}
                disabled={submitting}
                className="flex-1 h-12 text-base font-semibold bg-[#1F5C8B] hover:bg-[#174A73] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Confirmar devolução
              </Button>
              <Button
                onClick={handleOpenRenew}
                disabled={!canRenew}
                variant="outline"
                className="flex-1 h-12 text-base font-semibold border-2 border-[#1F5C8B] text-[#1F5C8B] hover:bg-[#1F5C8B]/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Renovar empréstimo
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={renewOpen} onOpenChange={setRenewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-[#1F5C8B]" />
              Renovar empréstimo
            </DialogTitle>
            <DialogDescription className="text-base">
              A nova data de devolução será calculada adicionando{' '}
              <strong>{config?.prazo_devolucao_dias} dias</strong> à data prevista atual.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {emprestimo && (
              <>
                <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <span className="text-base text-gray-600">Data prevista atual</span>
                  <span className="text-base font-bold text-gray-900">
                    {formatDate(emprestimo.data_prevista_devolucao)}
                  </span>
                </div>
                <div className="bg-red-50 rounded-lg p-4 border-2 border-red-300 text-center">
                  <p className="text-lg font-bold text-red-600 uppercase">
                    A ENTREGA SERÁ DIA {formatDate(newReturnDate)}
                  </p>
                </div>
              </>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setRenewOpen(false)}
              className="h-11 text-sm font-medium"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmRenew}
              disabled={renewing}
              className="h-11 text-sm font-semibold bg-[#1F5C8B] hover:bg-[#174A73]"
            >
              {renewing ? 'Renovando...' : 'Confirmar renovação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
