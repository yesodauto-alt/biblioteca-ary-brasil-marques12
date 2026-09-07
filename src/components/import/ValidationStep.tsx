import { useState } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { IMPORT_CONFIGS, type ValidationResult } from '@/lib/import-utils'

interface ValidationStepProps {
  importType: string
  validation: ValidationResult | null
  validating: boolean
  importing: boolean
  progress: { processed: number; total: number; imported: number; failed: number }
  onBack: () => void
  onConfirm: () => void
}

export function ValidationStep({
  importType,
  validation,
  validating,
  importing,
  progress,
  onBack,
  onConfirm,
}: ValidationStepProps) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const config = IMPORT_CONFIGS[importType]

  const toggle = (idx: number) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  if (validating) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-12 h-12 text-[#1F5C8B] animate-spin mb-4" />
        <p className="text-lg font-semibold text-gray-700">Validando registros...</p>
      </div>
    )
  }

  if (!validation) return null
  const { valid, problems } = validation
  const percentage = progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Validação</h2>
        <p className="text-base text-gray-500 mt-1">
          Revise os resultados antes de confirmar a importação.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex items-center gap-4">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
          <div>
            <p className="text-3xl font-bold text-green-700">{valid.length}</p>
            <p className="text-sm font-medium text-green-600">Registros válidos</p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-center gap-4">
          <AlertTriangle className="w-10 h-10 text-red-600" />
          <div>
            <p className="text-3xl font-bold text-red-700">{problems.length}</p>
            <p className="text-sm font-medium text-red-600">Registros com problema</p>
          </div>
        </div>
      </div>

      {importing && (
        <div
          className="rounded-xl border border-blue-200 bg-blue-50 p-5 space-y-3"
          aria-live="polite"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-bold text-blue-900">Importação em andamento</p>
              <p className="text-sm text-blue-700">Aguarde nesta tela até a conclusão.</p>
            </div>
            <p className="text-lg font-bold text-blue-900">
              {progress.processed} de {progress.total} ({percentage}%)
            </p>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-blue-100">
            <div
              className="h-full rounded-full bg-[#1F5C8B] transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <p className="text-sm font-medium text-blue-800">
            {progress.imported} importado(s)
            {progress.failed > 0 ? ` · ${progress.failed} com falha` : ''}
          </p>
        </div>
      )}

      {problems.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-gray-900">
            Registros com problema ({problems.length})
          </h3>
          <div className="space-y-2">
            {problems.map((item, idx) => {
              const num = item.record.data.numero_cadastro || '—'
              const name = item.record.data.nome_completo || item.record.data.titulo || '—'
              return (
                <div
                  key={idx}
                  className="bg-white border border-gray-200 rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => toggle(idx)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      <div>
                        <p className="font-semibold text-gray-900">
                          Linha {item.record.rowIndex}: {num} — {name}
                        </p>
                        <p className="text-sm text-gray-500">{item.issues.length} problema(s)</p>
                      </div>
                    </div>
                    {expanded.has(idx) ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  {expanded.has(idx) && (
                    <div className="border-t border-gray-100 p-4 space-y-2 bg-gray-50">
                      {item.issues.map((issue, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-xs">
                            {config.fields.find((f) => f.name === issue.field)?.label ||
                              issue.field}
                          </Badge>
                          <span className="text-sm text-gray-700">{issue.message}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {valid.length === 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
          <p className="text-lg font-semibold text-amber-800">
            Nenhum registro válido para importar.
          </p>
          <p className="text-sm text-amber-600 mt-1">
            Ajuste o mapeamento ou corrija os dados e tente novamente.
          </p>
        </div>
      )}

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={onBack}
          className="h-12 px-6 text-base font-semibold"
          disabled={importing}
        >
          <ArrowLeft className="w-5 h-5 mr-2" /> Voltar
        </Button>
        <Button
          onClick={onConfirm}
          disabled={valid.length === 0 || importing}
          className="h-12 px-6 text-base font-bold bg-green-600 hover:bg-green-700"
        >
          {importing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Importando {progress.processed} de {progress.total}
            </>
          ) : (
            <>Confirmar importação ({valid.length})</>
          )}
        </Button>
      </div>
    </div>
  )
}
