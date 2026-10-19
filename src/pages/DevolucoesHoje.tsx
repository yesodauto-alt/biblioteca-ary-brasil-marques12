import { useState, useEffect, useCallback } from 'react'
import { CornerUpLeft, User, BookOpen, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { LeitorFicha } from '@/components/usuarios/LeitorFicha'
import { getDevolucoesHoje, type EmprestimoWithLeitor } from '@/services/emprestimos'
import { useRealtime } from '@/hooks/use-realtime'
import { toast } from 'sonner'
import { formatDateTime } from '@/lib/loan-utils'
import { formatNumeroCadastro } from '@/lib/code-formatter'

export default function DevolucoesHoje() {
  const [devolucoes, setDevolucoes] = useState<EmprestimoWithLeitor[]>([])
  const [loading, setLoading] = useState(true)
  const [leitorFichaId, setLeitorFichaId] = useState<string | null>(null)
  const [leitorFichaOpen, setLeitorFichaOpen] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const data = await getDevolucoesHoje()
      setDevolucoes(data)
    } catch {
      toast.error('Erro ao carregar devoluções.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('emprestimos', () => loadData())

  const openLeitor = (id: string) => {
    setLeitorFichaId(id)
    setLeitorFichaOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-[#1F5C8B] flex items-center justify-center text-white shrink-0">
          <CornerUpLeft className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Devoluções realizadas hoje</h2>
          <p className="text-base text-gray-500">Livros devolvidos na data de hoje</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : devolucoes.length === 0 ? (
        <div className="text-center py-16">
          <CornerUpLeft className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-600">Nenhuma devolução realizada hoje.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {devolucoes.map((emp) => (
            <div key={emp.id} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <button
                  onClick={() => emp.expand?.leitor && openLeitor(emp.expand.leitor.id)}
                  className="flex items-start gap-3 text-left hover:opacity-80 transition-opacity flex-1"
                >
                  <User className="w-6 h-6 text-[#1F5C8B] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-lg font-bold text-gray-900 break-words">
                      {emp.expand?.leitor?.nome_completo || 'Leitor não encontrado'}
                    </p>
                    <p className="text-base text-gray-600">
                      Nº {formatNumeroCadastro(emp.expand?.leitor?.numero_cadastro)}
                    </p>
                  </div>
                </button>
                <div className="flex items-start gap-3 flex-1">
                  <BookOpen className="w-6 h-6 text-[#1F5C8B] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-lg font-bold text-gray-900 break-words">
                      {emp.expand?.livro?.titulo || 'Livro não encontrado'}
                    </p>
                    <p className="text-base text-gray-600">
                      Nº {formatNumeroCadastro(emp.expand?.livro?.numero_cadastro)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-start md:items-end gap-1">
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Devolvido
                  </Badge>
                  <p className="text-sm text-gray-500">{formatDateTime(emp.updated)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <LeitorFicha
        leitorId={leitorFichaId}
        open={leitorFichaOpen}
        onOpenChange={setLeitorFichaOpen}
      />
    </div>
  )
}
