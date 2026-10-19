import { useEffect, useState, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { UserPlus, Search, Users, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { LeitorForm } from '@/components/usuarios/LeitorForm'
import { LeitorFicha } from '@/components/usuarios/LeitorFicha'
import { getLeitores, type Leitor } from '@/services/leitores'
import { formatNumeroCadastro } from '@/lib/code-formatter'
import { useRealtime } from '@/hooks/use-realtime'
import { toast } from 'sonner'

export default function Usuarios() {
  const [leitores, setLeitores] = useState<Leitor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [fichaId, setFichaId] = useState<string | null>(null)
  const [fichaOpen, setFichaOpen] = useState(false)
  const [searchParams] = useSearchParams()
  const statusFilter = searchParams.get('filter') || ''

  const loadData = useCallback(async () => {
    try {
      const data = await getLeitores()
      setLeitores(data)
    } catch {
      toast.error('Erro ao carregar usuários.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('leitores', () => {
    loadData()
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return leitores.filter((l) => {
      if (statusFilter && l.status !== statusFilter) return false
      if (!q) return true
      const numRaw = String(l.numero_cadastro || '').toLowerCase()
      const numFmt = formatNumeroCadastro(l.numero_cadastro).toLowerCase()
      const nome = String(l.nome_completo || '').toLowerCase()
      const tel = String(l.telefone || '').toLowerCase()
      return (
        numRaw.includes(q) ||
        numFmt.includes(q) ||
        nome.includes(q) ||
        tel.includes(q)
      )
    })
  }, [leitores, search, statusFilter])

  const handleRowClick = (id: string) => {
    setFichaId(id)
    setFichaOpen(true)
  }

  const handleCreated = (created?: Leitor) => {
    if (created?.numero_cadastro) {
      toast.success('Usuário cadastrado com sucesso.', {
        description: `Número de cadastro: ${formatNumeroCadastro(created.numero_cadastro)}`,
      })
    } else {
      toast.success('Dados atualizados com sucesso.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with New User button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#1F5C8B] flex items-center justify-center text-white shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Usuários</h2>
            <p className="text-sm text-gray-500">Cadastro e acompanhamento dos leitores</p>
          </div>
        </div>
        <Button
          onClick={() => setFormOpen(true)}
          className="h-11 px-4 text-sm font-semibold bg-[#1F5C8B] hover:bg-[#174A73] shadow-sm"
        >
          <UserPlus className="w-5 h-5 mr-2" />
          Novo usuário
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por número, nome ou telefone..."
          className="h-12 pl-12 text-base border-gray-200"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-600">
            {search ? 'Nenhum usuário encontrado.' : 'Nenhum usuário cadastrado.'}
          </p>
          {!search && (
            <p className="text-base text-gray-400 mt-1">
              Clique em "Novo usuário" para cadastrar o primeiro leitor.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {/* Column headers (desktop) */}
          <div className="hidden md:grid grid-cols-[120px_1fr_180px_120px] gap-4 px-4 py-2 text-sm font-bold text-gray-500 uppercase tracking-wide">
            <span>Cadastro</span>
            <span>Nome</span>
            <span>Telefone</span>
            <span>Status</span>
          </div>
          {filtered.map((leitor) => (
            <button
              key={leitor.id}
              onClick={() => handleRowClick(leitor.id)}
              className="w-full text-left bg-white border border-gray-200/80 rounded-lg p-4 hover:border-[#1F5C8B]/40 hover:bg-[#1F5C8B]/5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#1F5C8B]/30 md:grid md:grid-cols-[120px_1fr_180px_120px] md:items-center md:gap-4 flex flex-col gap-2"
            >
              <div className="flex items-center gap-2">
                <span className="md:hidden text-sm font-bold text-gray-500">Nº </span>
                <span className="text-base font-bold text-[#1F5C8B]">{formatNumeroCadastro(leitor.numero_cadastro)}</span>
              </div>
              <span className="text-base font-semibold text-gray-900 break-words">
                {leitor.nome_completo}
              </span>
              <div className="flex items-center gap-2">
                <span className="md:hidden text-sm font-bold text-gray-500">Tel: </span>
                <span className="text-base text-gray-700">{leitor.telefone}</span>
              </div>
              <div>
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
            </button>
          ))}
        </div>
      )}

      {/* New User Form Dialog */}
      <LeitorForm open={formOpen} onOpenChange={setFormOpen} onSaved={handleCreated} />

      {/* User Ficha Sheet */}
      <LeitorFicha leitorId={fichaId} open={fichaOpen} onOpenChange={setFichaOpen} />
    </div>
  )
}
