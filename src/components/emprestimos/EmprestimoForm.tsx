import { useState, useEffect } from 'react'
import { Loader2, AlertCircle, Plus, ArrowLeft, Search } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { LeitorSearch } from '@/components/usuarios/LeitorSearch'
import { VolunteerSelect } from '@/components/volunteers/VolunteerSelect'
import {
  searchLivrosForLoan,
  STATUS_LABELS,
  STATUS_BADGE_CLASSES,
  type Livro,
} from '@/services/livros'
import { createEmprestimo, getEmprestimosByLeitor, type Emprestimo } from '@/services/emprestimos'
import { getConfiguracoes, type Configuracoes } from '@/services/configuracoes'
import { toast } from 'sonner'
import type { Leitor } from '@/services/leitores'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/loan-utils'

interface EmprestimoFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
  preselectedLeitor?: Leitor | null
}

export function EmprestimoForm({
  open,
  onOpenChange,
  onCreated,
  preselectedLeitor,
}: EmprestimoFormProps) {
  const [leitor, setLeitor] = useState<Leitor | null>(null)
  const [bookSearch, setBookSearch] = useState('')
  const [bookResults, setBookResults] = useState<Livro[]>([])
  const [foundLivro, setFoundLivro] = useState<Livro | null>(null)
  const [bookSearching, setBookSearching] = useState(false)
  const [tipo, setTipo] = useState<'comum' | 'estudo'>('comum')
  const [selectedVoluntario, setSelectedVoluntario] = useState('')
  const [config, setConfig] = useState<Configuracoes | null>(null)
  const [activeLoans, setActiveLoans] = useState<Emprestimo[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    getConfiguracoes()
      .then(setConfig)
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (open) {
      if (preselectedLeitor) {
        setLeitor(preselectedLeitor)
        getEmprestimosByLeitor(preselectedLeitor.id)
          .then(setActiveLoans)
          .catch(() => setActiveLoans([]))
      } else {
        setLeitor(null)
        setActiveLoans([])
      }
      setBookSearch('')
      setBookResults([])
      setFoundLivro(null)
      setTipo('comum')
      setSelectedVoluntario('')
    }
  }, [open, preselectedLeitor])

  useEffect(() => {
    const q = bookSearch.trim()
    if (!q || foundLivro) {
      setBookResults([])
      setBookSearching(false)
      return
    }
    setBookSearching(true)
    const timer = setTimeout(async () => {
      try {
        setBookResults(await searchLivrosForLoan(q))
      } catch {
        setBookResults([])
      } finally {
        setBookSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [bookSearch, foundLivro])

  const handleLeitorSelected = async (l: Leitor) => {
    setLeitor(l)
    try {
      setActiveLoans(await getEmprestimosByLeitor(l.id))
    } catch {
      setActiveLoans([])
    }
  }

  const comumCount = activeLoans.filter(
    (e) =>
      (e.status === 'ativo' || e.status === 'atrasado') &&
      (e.tipo_emprestimo || 'comum') === 'comum',
  ).length
  const estudoCount = activeLoans.filter(
    (e) => (e.status === 'ativo' || e.status === 'atrasado') && e.tipo_emprestimo === 'estudo',
  ).length
  const limiteComum = config?.limite_livros_por_usuario || 1
  const wouldExceed = tipo === 'comum' ? comumCount >= limiteComum : estudoCount >= 1

  const handleSubmit = async () => {
    if (!leitor || !foundLivro || wouldExceed) return
    if (!selectedVoluntario) {
      toast.error('Selecione o voluntário responsável por esta operação.')
      return
    }
    setSubmitting(true)
    try {
      const created = await createEmprestimo({
        leitor: leitor.id,
        livro: foundLivro.id,
        responsavel_voluntario: selectedVoluntario,
        tipo_emprestimo: tipo,
      })
      toast.success('Empréstimo registrado com sucesso!', {
        description: `A ENTREGA SERÁ DIA ${formatDate(created.data_prevista_devolucao)}`,
      })
      onCreated()
      onOpenChange(false)
    } catch (error) {
      console.error('EmprestimoForm submit error:', error)
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Não foi possível concluir a operação. Verifique os dados e tente novamente.'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  const returnDate = (() => {
    const days = tipo === 'estudo' ? 90 : config?.prazo_devolucao_dias || 15
    const d = new Date()
    d.setDate(d.getDate() + days)
    return d.toISOString().split('T')[0]
  })()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Plus className="w-5 h-5" /> Novo Empréstimo
          </DialogTitle>
        </DialogHeader>

        {!leitor ? (
          <div className="space-y-4">
            <Label className="text-base font-semibold">1. Selecione o usuário</Label>
            <LeitorSearch onLeitorSelected={handleLeitorSelected} />
          </div>
        ) : !foundLivro ? (
          <div className="space-y-4">
            <div className="bg-[#1F5C8B]/5 rounded-lg p-3 border border-[#1F5C8B]/15">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900">{leitor.nome_completo}</p>
                  <p className="text-sm text-gray-600">Nº {leitor.numero_cadastro}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setLeitor(null)
                    setActiveLoans([])
                  }}
                >
                  <ArrowLeft className="w-4 h-4 mr-1" /> Trocar
                </Button>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                Empréstimos ativos — Comum: {comumCount}/{limiteComum} · Estudo: {estudoCount}/1
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-semibold">2. Buscar livro</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={bookSearch}
                  onChange={(e) => {
                    setBookSearch(e.target.value)
                    setFoundLivro(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.preventDefault()
                  }}
                  placeholder="Digite o número ou título do livro..."
                  className="h-11 pl-10 text-base border-gray-200"
                  autoFocus
                />
              </div>
              {bookSearching && <p className="text-sm text-gray-500">Buscando livros...</p>}
              {bookResults.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {bookResults.map((livro) => {
                    const isAvailable = livro.status === 'disponível'
                    return (
                      <button
                        key={livro.id}
                        type="button"
                        onClick={() => {
                          if (isAvailable) {
                            setFoundLivro(livro)
                            setBookSearch('')
                            setBookResults([])
                          }
                        }}
                        disabled={!isAvailable}
                        className={cn(
                          'w-full text-left p-3 rounded-lg border-2 transition-all duration-150',
                          isAvailable
                            ? 'border-gray-200 hover:border-[#1F5C8B]/40 hover:bg-[#1F5C8B]/5 cursor-pointer'
                            : 'border-gray-200 opacity-50 cursor-not-allowed',
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-base font-bold text-[#1F5C8B]">
                              {livro.numero_cadastro}
                            </span>
                            <span className="text-base font-semibold text-gray-900 ml-2 break-words">
                              {livro.titulo}
                            </span>
                            <span className="text-sm text-gray-600 ml-2">{livro.autor}</span>
                          </div>
                          <Badge className={cn('shrink-0', STATUS_BADGE_CLASSES[livro.status])}>
                            {STATUS_LABELS[livro.status]}
                          </Badge>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
              {bookSearch && bookResults.length === 0 && !bookSearching && (
                <p className="text-sm text-gray-500">Nenhum livro encontrado.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-[#1F5C8B]/5 rounded-lg p-4 border border-[#1F5C8B]/15 space-y-3">
              <p className="text-sm font-semibold text-green-700">✓ Livro selecionado</p>
              <div>
                <p className="text-sm text-gray-500 font-medium">Usuário</p>
                <p className="text-base font-bold text-gray-900">{leitor!.nome_completo}</p>
                <p className="text-sm text-gray-600">Nº {leitor!.numero_cadastro}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Livro</p>
                <p className="text-base font-bold text-gray-900">{foundLivro.titulo}</p>
                <p className="text-sm text-gray-600">
                  Nº {foundLivro.numero_cadastro} · {foundLivro.autor}
                </p>
                <Badge className={cn('mt-1', STATUS_BADGE_CLASSES[foundLivro.status])}>
                  {STATUS_LABELS[foundLivro.status]}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-semibold">3. Tipo de empréstimo</Label>
              <div className="flex gap-2">
                <Button
                  variant={tipo === 'comum' ? 'default' : 'outline'}
                  onClick={() => setTipo('comum')}
                  className={cn(
                    'flex-1 h-11 text-sm font-medium',
                    tipo === 'comum' && 'bg-[#1F5C8B] hover:bg-[#174A73]',
                  )}
                >
                  Comum
                </Button>
                <Button
                  variant={tipo === 'estudo' ? 'default' : 'outline'}
                  onClick={() => setTipo('estudo')}
                  className={cn(
                    'flex-1 h-11 text-sm font-medium',
                    tipo === 'estudo' && 'bg-[#1F5C8B] hover:bg-[#174A73]',
                  )}
                >
                  Estudo
                </Button>
              </div>
              {wouldExceed && (
                <p className="text-sm text-red-500 font-medium flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {tipo === 'comum'
                    ? 'Limite de empréstimos comuns atingido.'
                    : 'Já existe empréstimo de estudo ativo.'}
                </p>
              )}
            </div>

            <VolunteerSelect value={selectedVoluntario} onChange={setSelectedVoluntario} />

            <div className="bg-red-50 rounded-lg p-4 border-2 border-red-300 text-center">
              <p className="text-lg font-bold text-red-600 uppercase">
                A ENTREGA SERÁ DIA {formatDate(returnDate)}
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setFoundLivro(null)
                  setBookSearch('')
                }}
                className="flex-1 h-11 text-sm font-medium"
              >
                Voltar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !selectedVoluntario || wouldExceed}
                className="flex-1 h-11 text-sm font-semibold bg-[#1F5C8B] hover:bg-[#174A73]"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-5 h-5 mr-2" />
                )}
                Confirmar empréstimo
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
