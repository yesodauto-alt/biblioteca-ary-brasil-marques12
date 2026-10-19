import { useEffect, useState, useCallback } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { BookOpen, Calendar, Library, StickyNote, User, Building2, Tag } from 'lucide-react'
import {
  getLivro,
  deleteLivro,
  STATUS_LABELS,
  STATUS_BADGE_CLASSES,
  type Livro,
} from '@/services/livros'
import {
  getEmprestimosByLivro,
  hasActiveLoansByLivro,
  type EmprestimoWithLeitor,
} from '@/services/emprestimos'
import { getMovementsFromEmprestimos, getAcaoLabel, type AuditMovement } from '@/services/auditoria'
import { LivroForm } from '@/components/acervo/LivroForm'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatDateTime } from '@/lib/loan-utils'
import { formatNumeroCadastro } from '@/lib/code-formatter'
import { useAuth } from '@/hooks/use-auth'

interface LivroFichaProps {
  livroId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LivroFicha({ livroId, open, onOpenChange }: LivroFichaProps) {
  const { isAdmin } = useAuth()
  const [livro, setLivro] = useState<Livro | null>(null)
  const [emprestimos, setEmprestimos] = useState<EmprestimoWithLeitor[]>([])
  const [movements, setMovements] = useState<AuditMovement[]>([])
  const [loading, setLoading] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!livroId) return
    setDeleting(true)
    try {
      const hasActive = await hasActiveLoansByLivro(livroId)
      if (hasActive) {
        toast.error('Este livro está emprestado e não pode ser excluído neste momento.')
        setDeleteOpen(false)
        return
      }
      await deleteLivro(livroId)
      toast.success('Livro excluído com sucesso.')
      setDeleteOpen(false)
      onOpenChange(false)
    } catch {
      toast.error('Erro ao excluir livro.')
    } finally {
      setDeleting(false)
    }
  }

  const loadData = useCallback(async () => {
    if (!livroId) {
      setLivro(null)
      setEmprestimos([])
      setMovements([])
      return
    }
    setLoading(true)
    try {
      const l = await getLivro(livroId)
      setLivro(l)
    } catch (err) {
      console.error('Erro ao buscar livro:', err)
      toast.error('Erro ao carregar dados do livro.')
    }

    try {
      const emps = await getEmprestimosByLivro(livroId)
      setEmprestimos(emps || [])
      try {
        const movs = await getMovementsFromEmprestimos(emps || [])
        setMovements(movs || [])
      } catch {
        setMovements([])
      }
    } catch (err) {
      console.error('Erro ao buscar empréstimos do livro:', err)
      setEmprestimos([])
      setMovements([])
    } finally {
      setLoading(false)
    }
  }, [livroId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const activeLoan = emprestimos.find((e) => e.status === 'ativo')

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg max-h-[100vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-xl font-bold">Ficha do Livro</SheetTitle>
          </SheetHeader>

          {loading ? (
            <div className="space-y-4 mt-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-6 w-2/3" />
            </div>
          ) : livro ? (
            <div className="mt-6 space-y-6">
              <div className="bg-[#1F5C8B]/5 rounded-lg p-4 border border-[#1F5C8B]/15">
                <h2 className="text-2xl font-bold text-gray-900 break-words">{livro.titulo}</h2>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-base font-medium text-gray-600">
                    Nº {formatNumeroCadastro(livro.numero_cadastro)}
                  </span>
                  <Badge className={STATUS_BADGE_CLASSES[livro.status]}>
                    {STATUS_LABELS[livro.status]}
                  </Badge>
                </div>
              </div>

              <div className="bg-white border-2 border-[#1F5C8B]/20 rounded-lg p-4">
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">
                  Catalogação
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 font-medium">CDD</p>
                    <p className="text-base font-bold text-gray-900">{livro.cdd || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">CUTTER</p>
                    <p className="text-base font-bold text-gray-900">{livro.cutter || '—'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500 font-medium">Descrição</p>
                    <p className="text-base font-semibold text-gray-900">
                      {livro.descricao || '—'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setEditOpen(true)}
                  className="flex-1 h-11 text-sm font-semibold bg-[#1F5C8B] hover:bg-[#174A73]"
                >
                  <Pencil className="w-4 h-4 mr-2" /> Editar livro
                </Button>
                {isAdmin && (
                  <Button
                    onClick={() => setDeleteOpen(true)}
                    variant="outline"
                    className="flex-1 h-11 text-sm font-semibold border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Excluir livro
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-[#1F5C8B] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Autor</p>
                    <p className="text-base font-semibold text-gray-900">{livro.autor}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-[#1F5C8B] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Editora</p>
                    <p className="text-base font-semibold text-gray-900">{livro.editora}</p>
                  </div>
                </div>
                {livro.categoria && (
                  <div className="flex items-start gap-3">
                    <Tag className="w-5 h-5 text-[#1F5C8B] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Categoria</p>
                      <p className="text-base font-semibold text-gray-900">{livro.categoria}</p>
                    </div>
                  </div>
                )}
                {livro.observacoes && (
                  <div className="flex items-start gap-3">
                    <StickyNote className="w-5 h-5 text-[#1F5C8B] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Observações</p>
                      <p className="text-base text-gray-900 whitespace-pre-wrap">
                        {livro.observacoes}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {livro.status === 'emprestado' && activeLoan && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-[#1F5C8B]" /> Livro Emprestado
                  </h3>
                  <div className="space-y-2">
                    <p className="text-base font-semibold text-gray-900">
                      {activeLoan.expand?.leitor?.nome_completo || 'Leitor não encontrado'}
                    </p>
                    <p className="text-sm text-gray-600">
                      Nº {activeLoan.expand?.leitor?.numero_cadastro || '—'}
                    </p>
                    <p className="text-sm text-gray-600">
                      Devolução prevista: {formatDateTime(activeLoan.data_prevista_devolucao)}
                    </p>
                    {activeLoan.expand?.responsavel && (
                      <p className="text-sm text-gray-600">
                        Responsável: {activeLoan.expand.responsavel.matricula || '—'} —{' '}
                        {activeLoan.expand.responsavel.name}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <Library className="w-5 h-5 text-[#1F5C8B]" /> Movimentos
                </h3>
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
                          Usuário: {mov.leitorNome}
                        </p>
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
              <p className="text-base font-semibold">Não foi possível carregar os dados deste livro.</p>
              <p className="text-sm text-gray-400 mt-1">Verifique sua conexão ou tente novamente.</p>
            </div>
          )}
        </SheetContent>
      </Sheet>
      <LivroForm
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={() => {
          loadData()
          toast.success('Dados atualizados com sucesso.')
        }}
        livro={livro}
      />
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </>
  )
}
