import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  UserPlus,
  Pencil,
  Power,
  Loader2,
  Trash2,
  Shield,
  ShieldAlert,
  Users,
  Search,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'
import { VolunteerForm } from '@/components/configuracoes/VolunteerForm'
import {
  getVoluntarios,
  updateVoluntario,
  deleteVoluntario,
  type Voluntario,
  type VoluntarioRole,
} from '@/services/voluntarios'
import { hasActiveLoansByResponsavel } from '@/services/emprestimos'
import { useRealtime } from '@/hooks/use-realtime'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type FilterRole = 'todos' | 'administrador' | 'voluntario' | 'ativo' | 'inativo'

function getInitials(name: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function VolunteerManagement() {
  const [voluntarios, setVoluntarios] = useState<Voluntario[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState<FilterRole>('todos')
  const [formOpen, setFormOpen] = useState(false)
  const [editingVoluntario, setEditingVoluntario] = useState<Voluntario | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [voluntarioToDelete, setVoluntarioToDelete] = useState<Voluntario | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setVoluntarios(await getVoluntarios())
    } catch {
      toast.error('Erro ao carregar lista de membros.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('voluntarios', () => {
    loadData()
  })

  const stats = useMemo(() => {
    const total = voluntarios.length
    const admins = voluntarios.filter((v) => v.role === 'administrador').length
    const volsAtivos = voluntarios.filter((v) => v.role !== 'administrador' && v.status === 'ativo').length
    const inativos = voluntarios.filter((v) => v.status === 'inativo').length
    return { total, admins, volsAtivos, inativos }
  }, [voluntarios])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return voluntarios.filter((v) => {
      if (filterRole === 'administrador' && v.role !== 'administrador') return false
      if (filterRole === 'voluntario' && v.role === 'administrador') return false
      if (filterRole === 'ativo' && v.status !== 'ativo') return false
      if (filterRole === 'inativo' && v.status !== 'inativo') return false
      if (!q) return true
      const nome = String(v.nome || '').toLowerCase()
      const mat = String(v.matricula || '').toLowerCase()
      return nome.includes(q) || mat.includes(q)
    })
  }, [voluntarios, search, filterRole])

  const handleDeleteClick = (v: Voluntario) => {
    setVoluntarioToDelete(v)
    setDeleteOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!voluntarioToDelete) return
    setDeleting(true)
    try {
      const hasActive = await hasActiveLoansByResponsavel(voluntarioToDelete.id)
      if (hasActive) {
        toast.error('Este voluntário é responsável por empréstimos ativos e não pode ser excluído.')
        setDeleteOpen(false)
        return
      }
      await deleteVoluntario(voluntarioToDelete.id)
      toast.success('Membro excluído com sucesso.')
      setDeleteOpen(false)
      setVoluntarioToDelete(null)
      loadData()
    } catch {
      toast.error('Erro ao excluir membro.')
    } finally {
      setDeleting(false)
    }
  }

  const handleEdit = (v: Voluntario) => {
    setEditingVoluntario(v)
    setFormOpen(true)
  }

  const handleNew = () => {
    setEditingVoluntario(null)
    setFormOpen(true)
  }

  const handleToggleStatus = async (v: Voluntario) => {
    const newStatus = v.status === 'ativo' ? 'inativo' : 'ativo'
    setTogglingId(v.id)
    try {
      await updateVoluntario(v.id, { status: newStatus })
      toast.success(newStatus === 'ativo' ? `${v.nome} ativado.` : `${v.nome} inativado.`)
      loadData()
    } catch {
      toast.error('Erro ao alterar status do membro.')
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header card with action */}
      <div className="bg-gradient-to-r from-slate-900 via-[#174A73] to-[#1F5C8B] rounded-2xl p-6 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-sky-300" />
            <span className="text-xs font-semibold uppercase tracking-wider text-sky-200">
              Controle de Acessos
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight">Equipe & Voluntários</h3>
          <p className="text-sm text-sky-100/90 mt-1 max-w-xl">
            Gerencie administradores com controle total do sistema e voluntários responsáveis pelo
            atendimento diário.
          </p>
        </div>
        <Button
          onClick={handleNew}
          className="bg-white text-[#174A73] hover:bg-sky-50 font-bold h-11 px-5 shadow-sm shrink-0"
        >
          <UserPlus className="w-4 h-4 mr-2 text-[#1F5C8B]" />
          Novo Membro
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-xs font-semibold uppercase">Total Equipe</span>
            <Users className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>

        <div className="bg-white border border-purple-100 rounded-xl p-4 shadow-xs bg-purple-50/20">
          <div className="flex items-center justify-between text-purple-700 mb-1">
            <span className="text-xs font-semibold uppercase">Administradores</span>
            <ShieldAlert className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-900">{stats.admins}</p>
        </div>

        <div className="bg-white border border-blue-100 rounded-xl p-4 shadow-xs bg-blue-50/20">
          <div className="flex items-center justify-between text-blue-700 mb-1">
            <span className="text-xs font-semibold uppercase">Voluntários Ativos</span>
            <Shield className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-900">{stats.volsAtivos}</p>
        </div>

        <div className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-xs font-semibold uppercase">Inativos</span>
            <XCircle className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-700">{stats.inativos}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou número de matrícula..."
            className="h-11 pl-10 text-sm border-gray-200 bg-white"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Todos', value: 'todos' },
            { label: 'Administradores', value: 'administrador' },
            { label: 'Voluntários', value: 'voluntario' },
            { label: 'Ativos', value: 'ativo' },
            { label: 'Inativos', value: 'inativo' },
          ].map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilterRole(f.value as FilterRole)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150',
                filterRole === f.value
                  ? 'bg-[#1F5C8B] text-white shadow-xs'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Member List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white border border-dashed border-gray-300 rounded-xl p-6">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-base font-semibold text-gray-700">Nenhum membro encontrado</p>
          <p className="text-sm text-gray-400 mt-1">
            {search || filterRole !== 'todos'
              ? 'Tente ajustar os filtros ou a busca digitada.'
              : 'Clique em "Novo Membro" para cadastrar o primeiro integrante da equipe.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((v) => {
            const isAdmin = v.role === 'administrador'
            const isAtivo = v.status === 'ativo'
            return (
              <div
                key={v.id}
                className={cn(
                  'bg-white border rounded-xl p-4 transition-all duration-150 hover:shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4',
                  !isAtivo ? 'opacity-70 bg-gray-50/60 border-gray-200' : 'border-gray-200/90',
                )}
              >
                {/* Left profile info */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={cn(
                      'w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-xs',
                      isAdmin
                        ? 'bg-gradient-to-tr from-purple-700 to-indigo-600 text-white'
                        : 'bg-gradient-to-tr from-[#174A73] to-[#1F5C8B] text-white',
                    )}
                  >
                    {getInitials(v.nome)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-bold text-gray-900 break-words">
                        {v.nome}
                      </span>
                      {isAdmin ? (
                        <Badge className="bg-purple-100 text-purple-800 border border-purple-200/60 font-semibold text-xs gap-1 hover:bg-purple-100">
                          <ShieldAlert className="w-3 h-3 text-purple-600" />
                          Administrador
                        </Badge>
                      ) : (
                        <Badge className="bg-blue-100 text-blue-800 border border-blue-200/60 font-semibold text-xs gap-1 hover:bg-blue-100">
                          <Shield className="w-3 h-3 text-blue-600" />
                          Voluntário
                        </Badge>
                      )}
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full',
                          isAtivo ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700',
                        )}
                      >
                        <span
                          className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            isAtivo ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500',
                          )}
                        />
                        {isAtivo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>
                        Matrícula: <strong className="text-gray-700">#{v.matricula || '—'}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right actions */}
                <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(v)}
                    className="h-9 px-3 text-xs font-semibold text-gray-700 border-gray-300 hover:bg-gray-50"
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1 text-gray-500" />
                    Editar
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleStatus(v)}
                    disabled={togglingId === v.id}
                    className={cn(
                      'h-9 px-3 text-xs font-semibold border-gray-300',
                      isAtivo
                        ? 'text-amber-700 hover:bg-amber-50 hover:border-amber-200'
                        : 'text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200',
                    )}
                  >
                    {togglingId === v.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                    ) : (
                      <Power className="w-3.5 h-3.5 mr-1" />
                    )}
                    {isAtivo ? 'Inativar' : 'Ativar'}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteClick(v)}
                    className="h-9 px-2.5 text-xs font-semibold border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                    title="Excluir membro"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Form Dialog */}
      <VolunteerForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editingVoluntario={editingVoluntario}
        onSaved={(created) => {
          loadData()
          if (created?.matricula) {
            toast.success('Membro cadastrado com sucesso.', {
              description: `Matrícula: #${created.matricula}`,
            })
          } else {
            toast.success('Alterações salvas com sucesso.')
          }
        }}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDeleteConfirm}
        loading={deleting}
        title="Excluir Membro da Equipe"
        description={`Tem certeza que deseja excluir ${voluntarioToDelete?.nome}? Esta ação é irreversível.`}
        confirmLabel="Sim, excluir membro"
      />
    </div>
  )
}
