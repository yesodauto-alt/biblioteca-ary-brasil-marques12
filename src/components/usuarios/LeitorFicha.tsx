import { useEffect, useState, useCallback } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { BookOpen, Calendar, Mail, MapPin, Phone, StickyNote, User } from 'lucide-react'
import { getLeitor, deleteLeitor, type Leitor } from '@/services/leitores'
import {
  getEmprestimosByLeitor,
  hasActiveLoansByLeitor,
  type Emprestimo,
} from '@/services/emprestimos'
import { getMovementsFromEmprestimos, getAcaoLabel, type AuditMovement } from '@/services/auditoria'
import { LeitorForm } from '@/components/usuarios/LeitorForm'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'
import { EmprestimoDetalhes } from '@/components/emprestimos/EmprestimoDetalhes'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import { formatNumeroCadastro } from '@/lib/code-formatter'
import {
  formatDateTime,
  formatDate,
  getSituacao,
  SITUACAO_LABELS,
  SITUACAO_BADGE,
} from '@/lib/loan-utils'

interface LeitorFichaProps {
  leitorId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const TIPO_LABELS: Record<string, string> = { comum: 'Comum', estudo: 'Estudo' }

export function LeitorFicha({ leitorId, open, onOpenChange }: LeitorFichaProps) {
  const { isAdmin } = useAuth()
  const [leitor, setLeitor] = useState<Leitor | null>(null)
  const [emprestimos, setEmprestimos] = useState<Emprestimo[]>([])
  const [movements, setMovements] = useState<AuditMovement[]>([])
  const [loading, setLoading] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [detalhesId, setDetalhesId] = useState<string | null>(null)
  const [detalhesOpen, setDetalhesOpen] = useState(false)

  const handleDelete = async () => {
    if (!leitorId) return
    setDeleting(true)
    try {
      const hasActive = await hasActiveLoansByLeitor(leitorId)
      if (hasActive) {
        toast.error('Este usuário possui empréstimos ativos e não pode ser excluído.')
        setDeleteOpen(false)
        return
      }
      await deleteLeitor(leitorId)
      toast.success('Usuário excluído com sucesso.')
      setDeleteOpen(false)
      onOpenChange(false)
    } catch {
      toast.error('Erro ao excluir usuário.')
    } finally {
      setDeleting(false)
    }
  }

  const loadData = useCallback(async () => {
    if (!leitorId) {
      setLeitor(null)
      setEmprestimos([])
      setMovements([])
      return
    }
    setLoading(true)
    try {
      const l = await getLeitor(leitorId)
      setLeitor(l)
    } catch (err) {
      console.error('Erro ao buscar leitor:', err)
      toast.error('Erro ao carregar dados do usuário.')
    }

    try {
      const emps = await getEmprestimosByLeitor(leitorId)
      setEmprestimos(emps || [])
      try {
        const movs = await getMovementsFromEmprestimos(emps || [])
        setMovements(movs || [])
      } catch {
        setMovements([])
      }
    } catch (err) {
      console.error('Erro ao buscar empréstimos do usuário:', err)
      setEmprestimos([])
      setMovements([])
    } finally {
      setLoading(false)
    }
  }, [leitorId])

  useEffect(() => {
    loadData()
  }, [loadData])
  useRealtime(
    'emprestimos',
    () => {
      loadData()
    },
    open,
  )

  const activeLoans = emprestimos.filter(
    (e) => (e.status === 'ativo' || e.status === 'atrasado') && !e.data_devolucao_real,
  )
  const comumCount = activeLoans.filter((e) => (e.tipo_emprestimo || 'comum') === 'comum').length
  const estudoCount = activeLoans.filter((e) => e.tipo_emprestimo === 'estudo').length

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg max-h-[100vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-xl font-bold">Ficha do Usuário</SheetTitle>
            <SheetDescription className="sr-only">
              Informações do usuário e histórico de empréstimos
            </SheetDescription>
          </SheetHeader>

          {loading ? (
            <div className="space-y-4 mt-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
            </div>
          ) : leitor ? (
            <div className="mt-6 space-y-6">
              <div className="bg-[#1F5C8B]/5 rounded-lg p-4 border border-[#1F5C8B]/15">
                <h2 className="text-2xl font-bold text-gray-900 break-words">
                  {leitor.nome_completo}
                </h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-base font-medium text-gray-600">
                    Nº {formatNumeroCadastro(leitor.numero_cadastro)}
                  </span>
                  <Badge
                    className={
                      leitor.status === 'ativo'
                        ? 'bg-green-100 text-green-800 hover:bg-green-100'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-200'
                    }
                  >
                    {leitor.status === 'ativo' ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setEditOpen(true)}
                  className="flex-1 h-11 text-sm font-semibold bg-[#1F5C8B] hover:bg-[#174A73]"
                >
                  <Pencil className="w-4 h-4 mr-2" /> Editar usuário
                </Button>
                {isAdmin && (
                  <Button
                    onClick={() => setDeleteOpen(true)}
                    variant="outline"
                    className="flex-1 h-11 text-sm font-semibold border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Excluir usuário
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-[#1F5C8B] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Telefone</p>
                    <p className="text-base font-semibold text-gray-900">{leitor.telefone}</p>
                  </div>
                </div>
                {leitor.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-[#1F5C8B] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 font-medium">E-mail</p>
                      <p className="text-base font-semibold text-gray-900 break-all">
                        {leitor.email}
                      </p>
                    </div>
                  </div>
                )}
                {leitor.data_nascimento && (
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-[#1F5C8B] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Data de Nascimento</p>
                      <p className="text-base font-semibold text-gray-900">
                        {formatDate(leitor.data_nascimento)}
                      </p>
                    </div>
                  </div>
                )}
                {leitor.endereco && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-[#1F5C8B] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Endereço</p>
                      <p className="text-base font-semibold text-gray-900">{leitor.endereco}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-[#1F5C8B] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Cadastrado em</p>
                    <p className="text-base font-semibold text-gray-900">
                      {formatDate(leitor.data_cadastro)}
                    </p>
                  </div>
                </div>
                {leitor.observacoes && (
                  <div className="flex items-start gap-3">
                    <StickyNote className="w-5 h-5 text-[#1F5C8B] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Observações</p>
                      <p className="text-base text-gray-900 whitespace-pre-wrap">
                        {leitor.observacoes}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#1F5C8B]" /> Empréstimos ativos
                </h3>
                {activeLoans.length === 0 ? (
                  <p className="text-base text-gray-500 italic">
                    Nenhum livro emprestado no momento.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {activeLoans.map((emp) => {
                      const situacao = getSituacao(emp.data_prevista_devolucao)
                      const tipo = TIPO_LABELS[emp.tipo_emprestimo || 'comum'] || 'Comum'
                      return (
                        <div
                          key={emp.id}
                          onClick={() => {
                            setDetalhesId(emp.id)
                            setDetalhesOpen(true)
                          }}
                          className={cn(
                            'border rounded-lg p-4 cursor-pointer hover:shadow-md transition-all duration-200',
                            situacao === 'atrasado'
                              ? 'bg-red-50/60 border-red-200'
                              : situacao === 'sem-data'
                                ? 'bg-gray-50 border-gray-200'
                                : 'bg-white border-gray-200/80',
                          )}
                        >
                          <p className="text-lg font-bold text-gray-900">
                            {emp.expand?.livro?.titulo || 'Livro não encontrado'}
                          </p>
                          <div className="mt-1 space-y-1 text-base text-gray-700">
                            <p>
                              Livro nº{' '}
                              <span className="font-semibold">
                                {formatNumeroCadastro(emp.expand?.livro?.numero_cadastro)}
                              </span>
                            </p>
                            <p>
                              Tipo: <span className="font-semibold">{tipo}</span>
                            </p>
                            <p>Empréstimo: {formatDate(emp.data_emprestimo)}</p>
                            <p>Devolução: {formatDate(emp.data_prevista_devolucao)}</p>
                            <p className="flex items-center gap-2">
                              Situação:{' '}
                              <Badge className={SITUACAO_BADGE[situacao] || SITUACAO_BADGE['sem-data']}>
                                {SITUACAO_LABELS[situacao] || 'Data não informada'}
                              </Badge>
                            </p>{' '}
                            {emp.expand?.responsavel_voluntario && typeof emp.expand.responsavel_voluntario === 'object' ? (
                              <p className="text-sm text-gray-600">
                                Responsável: {emp.expand.responsavel_voluntario.matricula || '—'} —{' '}
                                {emp.expand.responsavel_voluntario.nome || '—'}
                              </p>
                            ) : emp.expand?.responsavel && typeof emp.expand.responsavel === 'object' ? (
                              <p className="text-sm text-gray-600">
                                Responsável: {emp.expand.responsavel.matricula || '—'} —{' '}
                                {emp.expand.responsavel.nome || (emp.expand.responsavel as any).name || '—'}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm font-semibold text-gray-700 mb-1">Empréstimos atuais:</p>
                  <p className="text-base text-gray-600">Comum: {comumCount} de 1</p>
                  <p className="text-base text-gray-600">Estudo: {estudoCount} de 1</p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Movimentos</h3>
                {movements.length === 0 ? (
                  <p className="text-base text-gray-500 italic">Nenhum movimento registrado.</p>
                ) : (
                  <div className="space-y-2">
                    {movements.map((mov) => (
                      <div key={mov.id} className="bg-white border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between gap-2">
                          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 shrink-0">
                            {getAcaoLabel(mov.acao)}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {formatDateTime(mov.created)}
                          </span>
                        </div>
                        <p className="text-base font-semibold text-gray-900 mt-1">
                          {mov.bookTitle}
                        </p>
                        <p className="text-sm text-gray-600">Nº {formatNumeroCadastro(mov.bookNumeroCadastro)}</p>
                        <p className="text-sm text-gray-600">
                          Responsável: {mov.volunteerMatricula} — {mov.volunteerName}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p className="text-base font-semibold">Não foi possível carregar os dados deste leitor.</p>
              <p className="text-sm text-gray-400 mt-1">Verifique sua conexão ou tente novamente.</p>
            </div>
          )}
        </SheetContent>
      </Sheet>
      <LeitorForm
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={() => {
          loadData()
          toast.success('Dados atualizados com sucesso.')
        }}
        leitor={leitor}
      />
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        loading={deleting}
      />
      <EmprestimoDetalhes
        emprestimoId={detalhesId}
        open={detalhesOpen}
        onOpenChange={setDetalhesOpen}
        onChanged={loadData}
      />
    </>
  )
}
