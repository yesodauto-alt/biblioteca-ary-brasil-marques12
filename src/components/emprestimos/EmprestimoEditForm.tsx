import { useState, useEffect } from 'react'
import { Loader2, AlertCircle, ArrowLeft, Search } from 'lucide-react'
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
import {
  editarEmprestimo,
  getEmprestimosByLeitor,
  type EmprestimoWithLeitor,
  type Emprestimo,
} from '@/services/emprestimos'
import { getConfiguracoes, type Configuracoes } from '@/services/configuracoes'
import { toast } from 'sonner'
import type { Leitor } from '@/services/leitores'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { cn } from '@/lib/utils'
import { formatNumeroCadastro } from '@/lib/code-formatter'

function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  return new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00').toLocaleDateString(
    'pt-BR',
  )
}

function makeLeitorFromExpand(emp: EmprestimoWithLeitor): Leitor | null {
  if (!emp.expand?.leitor) return null
  return {
    id: emp.leitor,
    numero_cadastro: emp.expand.leitor.numero_cadastro || '',
    nome_completo: emp.expand.leitor.nome_completo || '',
    telefone: '',
    email: '',
    data_nascimento: '',
    endereco: '',
    data_cadastro: '',
    status: 'ativo',
    observacoes: '',
    created: '',
    updated: '',
  }
}

function makeLivroFromExpand(emp: EmprestimoWithLeitor): Livro | null {
  if (!emp.expand?.livro) return null
  return {
    id: emp.livro,
    numero_cadastro: emp.expand.livro.numero_cadastro || '',
    titulo: emp.expand.livro.titulo || '',
    autor: emp.expand.livro.autor || '',
    editora: '',
    categoria: '',
    observacoes: '',
    cdd: '',
    descricao: '',
    cutter: '',
    status: 'emprestado',
    created: '',
    updated: '',
  }
}

interface EmprestimoEditFormProps {
  emprestimo: EmprestimoWithLeitor
  onSaved: () => void
  onCancel: () => void
}

export function EmprestimoEditForm({ emprestimo, onSaved, onCancel }: EmprestimoEditFormProps) {
  const [leitor, setLeitor] = useState<Leitor | null>(null)
  const [editingLeitor, setEditingLeitor] = useState(false)
  const [bookSearch, setBookSearch] = useState('')
  const [bookResults, setBookResults] = useState<Livro[]>([])
  const [foundLivro, setFoundLivro] = useState<Livro | null>(null)
  const [editingBook, setEditingBook] = useState(false)
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
    setLeitor(makeLeitorFromExpand(emprestimo))
    setFoundLivro(makeLivroFromExpand(emprestimo))
    setTipo(emprestimo.tipo_emprestimo || 'comum')
    setSelectedVoluntario(emprestimo.responsavel_voluntario || '')
    setEditingLeitor(false)
    setEditingBook(false)
    setBookSearch('')
    setBookResults([])
  }, [emprestimo])

  useEffect(() => {
    if (leitor) {
      getEmprestimosByLeitor(leitor.id)
        .then((loans) => setActiveLoans(loans.filter((l) => l.id !== emprestimo.id)))
        .catch(() => setActiveLoans([]))
    }
  }, [leitor, emprestimo.id])

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

  const currentTipo = emprestimo.tipo_emprestimo || 'comum'
  const returnDate = (() => {
    if (tipo === currentTipo) return emprestimo.data_prevista_devolucao
    const days = tipo === 'estudo' ? 90 : config?.prazo_devolucao_dias || 15
    const d = new Date()
    d.setDate(d.getDate() + days)
    return d.toISOString().split('T')[0]
  })()

  const handleLeitorSelected = async (l: Leitor) => {
    setLeitor(l)
    setEditingLeitor(false)
    try {
      const loans = await getEmprestimosByLeitor(l.id)
      setActiveLoans(loans.filter((loan) => loan.id !== emprestimo.id))
    } catch {
      setActiveLoans([])
    }
  }

  const handleSubmit = async () => {
    if (!leitor || !foundLivro || wouldExceed) return
    if (!selectedVoluntario) {
      toast.error('Selecione o voluntário responsável por esta operação.')
      return
    }
    setSubmitting(true)
    try {
      await editarEmprestimo(emprestimo.id, {
        leitor: leitor.id,
        livro: foundLivro.id,
        tipo_emprestimo: tipo,
        voluntario_id: selectedVoluntario,
      })
      toast.success('Empréstimo atualizado com sucesso.')
      onSaved()
    } catch (error) {
      toast.error(getErrorMessage(error) || 'Não foi possível atualizar o empréstimo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-base font-semibold">Usuário</Label>
        {leitor && !editingLeitor ? (
          <div className="bg-[#1F5C8B]/5 rounded-lg p-3 border border-[#1F5C8B]/15">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-900">{leitor.nome_completo}</p>
                <p className="text-sm text-gray-600">Nº {formatNumeroCadastro(leitor.numero_cadastro)}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setEditingLeitor(true)}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Trocar
              </Button>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Empréstimos ativos — Comum: {comumCount}/{limiteComum} · Estudo: {estudoCount}/1
            </div>
          </div>
        ) : (
          <LeitorSearch onLeitorSelected={handleLeitorSelected} />
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-base font-semibold">Livro</Label>
        {foundLivro && !editingBook ? (
          <div className="bg-[#1F5C8B]/5 rounded-lg p-3 border border-[#1F5C8B]/15">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="font-bold text-gray-900">{foundLivro.titulo}</p>
                <p className="text-sm text-gray-600">
                  Nº {formatNumeroCadastro(foundLivro.numero_cadastro)} · {foundLivro.autor}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingBook(true)
                  setFoundLivro(null)
                }}
              >
                Trocar
              </Button>
            </div>
          </div>
        ) : (
          <>
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
                  const isAvailable = livro.status === 'disponível' || livro.id === emprestimo.livro
                  return (
                    <button
                      key={livro.id}
                      type="button"
                      onClick={() => {
                        if (isAvailable) {
                          setFoundLivro(livro)
                          setBookSearch('')
                          setBookResults([])
                          setEditingBook(false)
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
                            {formatNumeroCadastro(livro.numero_cadastro)}
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
            {foundLivro === null && !bookSearch && editingBook && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingBook(false)
                  setFoundLivro(makeLivroFromExpand(emprestimo))
                }}
              >
                Cancelar troca
              </Button>
            )}
          </>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-base font-semibold">Tipo de empréstimo</Label>
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
        <Button variant="outline" onClick={onCancel} className="flex-1 h-11 text-sm font-medium">
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={submitting || !selectedVoluntario || wouldExceed || !leitor || !foundLivro}
          className="flex-1 h-11 text-sm font-semibold bg-[#1F5C8B] hover:bg-[#174A73]"
        >
          {submitting && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
          Salvar alterações
        </Button>
      </div>
    </div>
  )
}
