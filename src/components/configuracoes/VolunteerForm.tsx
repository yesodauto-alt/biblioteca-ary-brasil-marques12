import { useState, useEffect } from 'react'
import {
  Loader2,
  UserPlus,
  BadgeCheck,
  ShieldAlert,
  Shield,
  User,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import {
  createVoluntario,
  updateVoluntario,
  type Voluntario,
  type VoluntarioStatus,
  type VoluntarioRole,
} from '@/services/voluntarios'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface VolunteerFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingVoluntario: Voluntario | null
  onSaved: (created?: Voluntario) => void
}

export function VolunteerForm({
  open,
  onOpenChange,
  editingVoluntario,
  onSaved,
}: VolunteerFormProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nome: '',
    status: 'ativo' as VoluntarioStatus,
    role: 'voluntario' as VoluntarioRole,
  })

  useEffect(() => {
    if (open) {
      if (editingVoluntario) {
        setForm({
          nome: editingVoluntario.nome,
          status: editingVoluntario.status,
          role: editingVoluntario.role || 'voluntario',
        })
      } else {
        setForm({ nome: '', status: 'ativo', role: 'voluntario' })
      }
    }
  }, [open, editingVoluntario])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nome.trim()) {
      toast.error('Informe o nome completo do membro.')
      return
    }

    setLoading(true)
    try {
      if (editingVoluntario) {
        await updateVoluntario(editingVoluntario.id, {
          nome: form.nome.trim(),
          status: form.status,
          role: form.role,
        })
        onSaved()
        onOpenChange(false)
      } else {
        const created = await createVoluntario({
          nome: form.nome.trim(),
          status: form.status,
          role: form.role,
        })
        onSaved(created)
        onOpenChange(false)
      }
    } catch (error) {
      console.error('VolunteerForm submit error:', error)
      toast.error('Não foi possível salvar os dados. Verifique a conexão e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-6">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-bold tracking-tight">
            {editingVoluntario ? 'Editar Membro da Equipe' : 'Cadastrar Membro da Equipe'}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            {editingVoluntario
              ? 'Atualize as informações cadastrais e o nível de acesso do colaborador.'
              : 'Preencha o nome e selecione o nível de permissão (Administrador ou Voluntário).'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {editingVoluntario?.matricula && (
            <div className="bg-[#1F5C8B]/5 border border-[#1F5C8B]/20 rounded-xl p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BadgeCheck className="w-5 h-5 text-[#1F5C8B] shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase">Matrícula Cadastrada</p>
                  <p className="text-base font-bold text-[#1F5C8B]">#{editingVoluntario.matricula}</p>
                </div>
              </div>
              <span className="text-xs font-medium text-gray-500 bg-white px-2.5 py-1 rounded-md border border-gray-200">
                Gerada pelo sistema
              </span>
            </div>
          )}

          {/* Nome Input */}
          <div className="space-y-1.5">
            <Label className="text-sm font-bold text-gray-700">Nome Completo *</Label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                className="h-11 pl-10 text-sm border-gray-200 focus-visible:ring-[#1F5C8B]"
                placeholder="Ex: Maria dos Santos"
                required
                autoFocus
              />
            </div>
          </div>

          {/* Role Cards (Interactive selection) */}
          <div className="space-y-2">
            <Label className="text-sm font-bold text-gray-700">
              Nível de Acesso (Perfil no Sistema) *
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Voluntário Card */}
              <button
                type="button"
                onClick={() => setForm({ ...form, role: 'voluntario' })}
                className={cn(
                  'text-left p-3.5 rounded-xl border-2 transition-all relative flex flex-col justify-between',
                  form.role === 'voluntario'
                    ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50',
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
                    <Shield className="w-4 h-4" />
                  </div>
                  {form.role === 'voluntario' ? (
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  ) : (
                    <span className="text-xs font-semibold text-gray-400 border border-gray-200 px-1.5 py-0.5 rounded">
                      Operacional
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Voluntário</p>
                  <p className="text-xs text-gray-600 mt-1 leading-snug">
                    Atendimento diário, empréstimos, devoluções e renovações no acervo.
                  </p>
                </div>
              </button>

              {/* Administrador Card */}
              <button
                type="button"
                onClick={() => setForm({ ...form, role: 'administrador' })}
                className={cn(
                  'text-left p-3.5 rounded-xl border-2 transition-all relative flex flex-col justify-between',
                  form.role === 'administrador'
                    ? 'border-purple-600 bg-purple-50/50 shadow-xs'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50',
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  {form.role === 'administrador' ? (
                    <CheckCircle2 className="w-4 h-4 text-purple-600" />
                  ) : (
                    <span className="text-xs font-semibold text-purple-600 border border-purple-200 px-1.5 py-0.5 rounded bg-purple-50">
                      Total
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Administrador</p>
                  <p className="text-xs text-gray-600 mt-1 leading-snug">
                    Acesso completo a configurações, relatórios analíticos e exclusão de registros.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Status Selection (only when editing) */}
          {editingVoluntario && (
            <div className="space-y-1.5">
              <Label className="text-sm font-bold text-gray-700">Situação Cadastral</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as VoluntarioStatus })}
              >
                <SelectTrigger className="h-11 text-sm border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Ativo (apto para operar empréstimos)
                    </span>
                  </SelectItem>
                  <SelectItem value="inativo">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-gray-400" />
                      Inativo (bloqueado temporariamente)
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-10 px-4 text-sm font-semibold border-gray-300"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="h-10 px-5 text-sm font-bold bg-[#1F5C8B] hover:bg-[#174A73] shadow-xs"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4 mr-2" />
              )}
              {editingVoluntario ? 'Salvar Alterações' : 'Cadastrar Membro'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
