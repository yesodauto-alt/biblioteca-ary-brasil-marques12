import { useState, useMemo, useCallback, useEffect } from 'react'
import { BarChart3, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useRealtime } from '@/hooks/use-realtime'
import {
  PeriodFilterBar,
  getDefaultPeriod,
  type PeriodFilterValue,
} from '@/components/relatorios/PeriodFilter'
import { ReportTable } from '@/components/relatorios/ReportTable'
import { getReportDefs, type ReportType, type ReportDef } from '@/components/relatorios/reportDefs'
import { exportToCsv } from '@/components/relatorios/csvExport'
import { LeitorFicha } from '@/components/usuarios/LeitorFicha'
import { LivroFicha } from '@/components/acervo/LivroFicha'

export default function Relatorios() {
  const [reportType, setReportType] = useState<ReportType>('emprestimos-realizados')
  const [period, setPeriod] = useState<PeriodFilterValue>(getDefaultPeriod())
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [leitorFichaId, setLeitorFichaId] = useState<string | null>(null)
  const [leitorFichaOpen, setLeitorFichaOpen] = useState(false)
  const [livroFichaId, setLivroFichaId] = useState<string | null>(null)
  const [livroFichaOpen, setLivroFichaOpen] = useState(false)

  const defs = useMemo(
    () =>
      getReportDefs({
        onLeitorClick: (id) => {
          setLeitorFichaId(id)
          setLeitorFichaOpen(true)
        },
        onLivroClick: (id) => {
          setLivroFichaId(id)
          setLivroFichaOpen(true)
        },
      }),
    [],
  )

  const currentDef: ReportDef = defs[reportType]

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const result = await currentDef.fetchData({ start: period.start, end: period.end })
      setData(result)
    } catch {
      setData([])
      toast.error('Erro ao carregar relatório.')
    } finally {
      setLoading(false)
    }
  }, [currentDef, period.start, period.end])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('emprestimos', () => loadData())
  useRealtime('livros', () => {
    if (['livros-disponiveis', 'livros-mais-emprestados', 'todo-acervo'].includes(reportType)) loadData()
  })
  useRealtime('leitores', () => {
    if (['usuarios-mais-utilizam', 'todos-leitores'].includes(reportType)) loadData()
  })
  useRealtime('auditoria', () => {
    if (reportType === 'renovacoes-realizadas') loadData()
  })

  const handleExport = () => {
    const rows = data.map(currentDef.csvRow)
    exportToCsv(`relatorio-${reportType}`, currentDef.csvHeaders, rows)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#1F5C8B] flex items-center justify-center text-white shrink-0">
          <BarChart3 className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Relatórios</h2>
          <p className="text-sm text-gray-500">Consultas e resumos sobre o uso da biblioteca</p>
        </div>
      </div>

      <PeriodFilterBar value={period} onChange={setPeriod} />

      {!currentDef.usesPeriod && (
        <p className="text-sm text-gray-500 italic">
          Este relatório exibe dados atuais, independente do período selecionado.
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {(Object.entries(defs) as [ReportType, ReportDef][]).map(([key, def]) => (
          <Button
            key={key}
            variant="outline"
            onClick={() => setReportType(key)}
            className={cn(
              'h-auto py-2.5 px-3 text-sm font-medium text-center justify-center break-words',
              reportType === key
                ? 'bg-[#1F5C8B] text-white hover:bg-[#174A73] border-[#1F5C8B] shadow-sm'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50',
            )}
          >
            {def.label}
          </Button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-base text-gray-500">
          {loading ? 'Carregando...' : `${data.length} registro(s)`}
        </p>
        <Button
          onClick={handleExport}
          disabled={loading || data.length === 0}
          variant="outline"
          className="h-11 px-4 text-sm font-medium border-[#1F5C8B] text-[#1F5C8B] hover:bg-[#1F5C8B]/10"
        >
          <Download className="w-4 h-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      <ReportTable
        columns={currentDef.columns}
        data={data}
        loading={loading}
        highlightRow={currentDef.highlightRow}
      />

      <LeitorFicha
        leitorId={leitorFichaId}
        open={leitorFichaOpen}
        onOpenChange={setLeitorFichaOpen}
      />
      <LivroFicha livroId={livroFichaId} open={livroFichaOpen} onOpenChange={setLivroFichaOpen} />
    </div>
  )
}
