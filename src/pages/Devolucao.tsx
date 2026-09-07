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
  searchActiveEmprestimos,
  devolverEmprestimo,
  renovarEmprestimo,
  type EmprestimoWithLeitor,
} from '@/services/emprestimos'
import { getConfiguracoes, type Configuracoes } from '@/services/configuracoes'
import { formatDate, formatDateTime, normalizeToDate } from '@/lib/loan-utils'
import { toast } from 'sonner'

function getLoanSituation(dataPrevista: string): { label: string; isLate: boolean } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const normalized = normalizeToDate(dataPrevista)
  const due = new Date(normalized + 'T00:00:00')
  due.setHours(0, 0, 0, 0)
  return { label: today > due ? 'Atrasado' : 'No prazo', isLate: today > due }
}

export default function Devolucao() {
  const [bookSearch, setBookSearch] = useState('')
  const [emprestimo, setEmprestimo] = useState<EmprestimoWithLeitor | null>(null)
  const [matches, setMatches] = useState<EmprestimoWithLeitor[]>([])
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
      }
    }
  })

  const handleBookLookup = async () => {
    const num = bookSearch.trim()
    if (!num) return
    setEmprestimo(null)
    setMatches([])
    setError(null)
    setSuccess(null)
    try {
      const results = await searchActiveEmprestimos(num)
      if (results.length === 0) {
        setError('Nenhum empréstimo ativo encontrado para esta busca.')
        inputRef.current?.focus()
        return
      }
      if (results.length === 1) {
        setEmprestimo(results[0])
        setTimeout(() => confirmRef.current?.focus(), 50)
        return
      }
      setMatches(results)
    } catch {
      setError('Não foi possível realizar a busca. Tente novamente.')
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
      setSuccess('Devolução realizada com sucesso.')
      setBookSearch('')
      setEmprestimo(null)
      setError(null)
      setSelectedVoluntario('')
      setTimeout(() => inputRef.current?.focus(), 100)
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
        <div className="space-y-2">
          <label className="text-lg font-bold text-gray-800">Livro ou leitor</label>
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
            placeholder="Número, título do livro ou nome do leitor..."
            className="h-12 text-base font-medium border-gray-200"
            autoFocus
          />
          {error && (
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span className="font-semibold">{error}</span>
            </div>
          )}
        </div>

        {matches.length > 1 && !emprestimo && (
          <div className="space-y-2">
            <p className="font-semibold text-gray-700">Selecione o empréstimo para devolver:</p>
            {matches.map((match) => (
              <button
                key={match.id}
                type="button"
                onClick={() => {
                  setEmprestimo(match)
                  setMatches([])
                  setTimeout(() => confirmRef.current?.focus(), 50)
                }}
                className="w-full rounded-lg border border-gray-200 p-3 text-left hover:border-[#1F5C8B] hover:bg-[#1F5C8B]/5"
              >
                <p className="font-bold text-gray-900">{match.expand?.livro?.titulo || 'Livro não encontrado'}</p>
                <p className="text-sm text-gray-600">
                  Livro Nº {match.expand?.livro?.numero_cadastro || '—'} · Leitor: {match.expand?.leitor?.nome_completo || '—'}
                </p>
              </button>
            ))}
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
                  Nº {emprestimo.expand?.livro?.numero_cadastro || '—'}
                </Badge>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <User className="w-5 h-5 text-[#1F5C8B]" />
                <span className="text-base font-semibold text-gray-900">
                  {emprestimo.expand?.leitor?.nome_completo || 'Leitor não encontrado'}
                </span>
                <Badge className="bg-gray-200 text-gray-700 hover:bg-gray-200">
                  Nº {emprestimo.expand?.leitor?.numero_cadastro || '—'}
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
