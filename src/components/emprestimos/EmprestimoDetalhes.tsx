import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2, User, BookOpen, Calendar, RefreshCw, UserCheck } from 'lucide-react'
import { getEmprestimo, excluirEmprestimo, type EmprestimoWithLeitor } from '@/services/emprestimos'
import { EmprestimoEditForm } from '@/components/emprestimos/EmprestimoEditForm'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import {
  formatDate,
  formatDateTime,
  getSituacao,
  SITUACAO_LABELS,
  SITUACAO_BADGE,
} from '@/lib/loan-utils'

const TIPO_LABELS: Record<string, string> = { comum: 'Comum', estudo: 'Estudo' }

interface EmprestimoDetalhesProps {
  emprestimoId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onChanged?: () => void
}

export function EmprestimoDetalhes({
  emprestimoId,
  open,
  onOpenChange,
  onChanged,
}: EmprestimoDetalhesProps) {
  const { isAdmin } = useAuth()
  const [emprestimo, setEmprestimo] = useState<EmprestimoWithLeitor | null>(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'details' | 'edit'>('details')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (open && emprestimoId) {
      setMode('details')
      setLoading(true)
      getEmprestimo(emprestimoId)
        .then(setEmprestimo)
        .catch(() => toast.error('Erro ao carregar empréstimo.'))
        .finally(() => setLoading(false))
    } else {
      setEmprestimo(null)
      setMode('details')
    }
  }, [open, emprestimoId])

  const handleDelete = async () => {
    if (!emprestimoId) return
    setDeleting(true)
    try {
      await excluirEmprestimo(emprestimoId)
      toast.success('Empréstimo excluído com sucesso.')
      setDeleteOpen(false)
      onOpenChange(false)
      onChanged?.()
    } catch {
      toast.error('Erro ao excluir empréstimo.')
    } finally {
      setDeleting(false)
    }
  }

  const handleEditSaved = () => {
    setMode('details')
    if (emprestimoId) {
      getEmprestimo(emprestimoId)
        .then(setEmprestimo)
        .catch(() => {})
    }
    onChanged?.()
  }

  const situacao = emprestimo ? getSituacao(emprestimo.data_prevista_devolucao) : 'sem-data'
  const voluntarioResp = emprestimo?.expand?.responsavel_voluntario
  const responsavelDisplay = voluntarioResp
    ? `${voluntarioResp.matricula} — ${voluntarioResp.nome}`
    : 'Não informado'
  const dataEmprestimoDisplay = emprestimo?.data_emprestimo
    ? formatDateTime(emprestimo.data_emprestimo)
    : 'Não informado'
  const dataPrevistaDisplay = emprestimo?.data_prevista_devolucao
    ? formatDate(emprestimo.data_prevista_devolucao)
    : 'Não informado'

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {mode === 'edit' ? 'Editar Empréstimo' : 'Detalhes do Empréstimo'}
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-6 w-2/3" />
            </div>
          ) : mode === 'edit' && emprestimo ? (
            <EmprestimoEditForm
              emprestimo={emprestimo}
              onSaved={handleEditSaved}
              onCancel={() => setMode('details')}
            />
          ) : emprestimo ? (
            <div className="space-y-4">
              <div className="bg-[#1F5C8B]/5 rounded-lg p-4 border border-[#1F5C8B]/15 space-y-3">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-[#1F5C8B] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Usuário</p>
                    <p className="text-base font-bold text-gray-900">
                      {emprestimo.expand?.leitor?.nome_completo || 'Registro não encontrado'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {emprestimo.expand?.leitor?.numero_cadastro
                        ? `Nº ${emprestimo.expand.leitor.numero_cadastro}`
                        : '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <BookOpen className="w-5 h-5 text-[#1F5C8B] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Livro</p>
                    <p className="text-base font-bold text-gray-900">
                      {emprestimo.expand?.livro?.titulo || 'Registro não encontrado'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {emprestimo.expand?.livro?.numero_cadastro
                        ? `Nº ${emprestimo.expand.livro.numero_cadastro} · ${emprestimo.expand.livro.autor || '—'}`
                        : '—'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Tipo</p>
                  <Badge
                    className={cn(
                      'mt-1',
                      emprestimo.tipo_emprestimo === 'estudo'
                        ? 'bg-purple-100 text-purple-800 hover:bg-purple-100'
                        : 'bg-blue-100 text-blue-800 hover:bg-blue-100',
                    )}
                  >
                    {TIPO_LABELS[emprestimo.tipo_emprestimo || 'comum'] || 'Comum'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Situação</p>
                  <Badge className={cn('mt-1', SITUACAO_BADGE[situacao])}>
                    {SITUACAO_LABELS[situacao]}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Data do empréstimo</p>
                  <p className="text-base font-semibold text-gray-900 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {dataEmprestimoDisplay}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Devolução prevista</p>
                  <p className="text-base font-semibold text-gray-900 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {dataPrevistaDisplay}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Voluntário responsável</p>
                  <p className="text-base font-semibold text-gray-900 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-gray-400" />
                    {responsavelDisplay}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Renovações</p>
                  <p className="text-base font-semibold text-gray-900 flex items-center gap-1.5">
                    <RefreshCw className="w-4 h-4 text-gray-400" />
                    {emprestimo.quantidade_renovacoes || 0}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => setMode('edit')}
                  className="flex-1 h-11 text-sm font-semibold bg-[#1F5C8B] hover:bg-[#174A73]"
                >
                  <Pencil className="w-4 h-4 mr-2" /> Editar empréstimo
                </Button>
                {isAdmin && (
                  <Button
                    onClick={() => setDeleteOpen(true)}
                    variant="outline"
                    className="flex-1 h-11 text-sm font-semibold border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Excluir empréstimo
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        loading={deleting}
        title="Excluir empréstimo"
        description="Tem certeza que deseja excluir este empréstimo?"
        confirmLabel="Excluir empréstimo"
      />
    </>
  )
}
