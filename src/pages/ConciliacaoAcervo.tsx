import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, FileCheck2, FileWarning, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'

type Status = 'confere' | 'somente_pdf' | 'somente_planilha' | 'duplicado' | 'revisar'
type Item = { id: string; numero_cadastro: string; titulo_pdf: string | null; titulo_planilha: string | null; status: Status; observacoes: string }

const LABELS: Record<Status, string> = {
  confere: 'Confere',
  somente_pdf: 'Somente no PDF',
  somente_planilha: 'Somente na planilha',
  duplicado: 'Duplicado',
  revisar: 'Revisar',
}

export default function ConciliacaoAcervo() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('acervo_conciliacoes')
      .select('id, numero_cadastro, titulo_pdf, titulo_planilha, status, observacoes')
      .order('numero_cadastro')
    setItems((data ?? []) as Item[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const totals = useMemo(() => ({
    confere: items.filter((item) => item.status === 'confere').length,
    pendentes: items.filter((item) => item.status !== 'confere').length,
    duplicados: items.filter((item) => item.status === 'duplicado').length,
  }), [items])

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#1F5C8B] flex items-center justify-center text-white shrink-0"><FileCheck2 className="w-5 h-5" /></div>
        <div><h2 className="text-xl font-bold text-gray-900">Conciliação do acervo</h2><p className="text-sm text-gray-500">Conferência entre o PDF atualizado e a planilha histórica.</p></div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Itens conferidos</p><p className="text-3xl font-bold text-green-700">{totals.confere}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Pendências</p><p className="text-3xl font-bold text-amber-600">{totals.pendentes}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Duplicados</p><p className="text-3xl font-bold text-red-600">{totals.duplicados}</p></CardContent></Card>
      </div>
      <div className="border rounded-lg bg-blue-50 border-blue-200 p-4 text-sm text-blue-950">
        Esta tela recebe somente resultados revisados. A próxima etapa adicionará a leitura do PDF e o cruzamento automático com a planilha; nenhum livro será criado ou alterado sem confirmação.
      </div>
      {loading ? <div className="flex justify-center p-10"><Loader2 className="animate-spin text-[#1F5C8B]" /></div> : items.length === 0 ? (
        <div className="border rounded-lg bg-white p-10 text-center"><CheckCircle2 className="w-10 h-10 text-green-600 mx-auto mb-3" /><p className="font-semibold text-gray-900">Nenhuma pendência carregada</p><p className="text-sm text-gray-500 mt-1">Quando o lote PDF–planilha for analisado, os itens que exigem decisão aparecerão aqui.</p></div>
      ) : <div className="space-y-2">{items.map((item) => <div key={item.id} className="border rounded-lg bg-white p-4 flex gap-3"><FileWarning className="w-5 h-5 text-amber-500 shrink-0" /><div><p className="font-semibold">#{item.numero_cadastro} · {LABELS[item.status]}</p><p className="text-sm text-gray-600">{item.titulo_pdf || item.titulo_planilha || 'Título não informado'}</p>{item.observacoes && <p className="text-sm text-gray-500 mt-1">{item.observacoes}</p>}</div></div>)}</div>}
    </div>
  )
}
