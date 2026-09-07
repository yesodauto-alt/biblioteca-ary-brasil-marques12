import { useState } from 'react'
import { Upload } from 'lucide-react'
import { ImportStepper } from '@/components/import/ImportStepper'
import { TypeStep } from '@/components/import/TypeStep'
import { FileStep } from '@/components/import/FileStep'
import { MappingStep } from '@/components/import/MappingStep'
import { ValidationStep } from '@/components/import/ValidationStep'
import { ResultStep, type ImportResult } from '@/components/import/ResultStep'
import {
  IMPORT_CONFIGS,
  mapRecords,
  validateRecords,
  normalizeRecord,
  autoMapColumns,
  type ValidationResult,
} from '@/lib/import-utils'
import { getExistingCadastroNumbers, createImportedRecord } from '@/services/import'
import { toast } from 'sonner'

type Step = 'type' | 'file' | 'mapping' | 'validation' | 'result'

type ImportProgress = {
  processed: number
  total: number
  imported: number
  failed: number
}

export default function Importacao() {
  const [step, setStep] = useState<Step>('type')
  const [importType, setImportType] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [validating, setValidating] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<ImportProgress>({
    processed: 0,
    total: 0,
    imported: 0,
    failed: 0,
  })
  const [result, setResult] = useState<ImportResult | null>(null)

  const handleTypeSelect = (type: string) => {
    setImportType(type)
    setStep('file')
  }

  const handleFileSelect = (name: string, hdrs: string[], dataRows: string[][]) => {
    setFileName(name)
    setHeaders(hdrs)
    setRows(dataRows)
    if (importType) {
      setMapping(autoMapColumns(hdrs, importType))
    }
  }

  const handleValidation = async () => {
    if (!importType) return
    setStep('validation')
    setValidating(true)
    try {
      const mapped = mapRecords(headers, rows, mapping)
      const existing = await getExistingCadastroNumbers(IMPORT_CONFIGS[importType].collection)
      const result = validateRecords(mapped, importType, existing)
      setValidation(result)
    } catch {
      toast.error('Erro ao validar registros.')
    } finally {
      setValidating(false)
    }
  }

  const handleConfirmImport = async () => {
    if (!validation || !importType) return
    const total = validation.valid.length
    setImporting(true)
    setImportProgress({ processed: 0, total, imported: 0, failed: 0 })
    let imported = 0
    let failed = 0
    const collection = IMPORT_CONFIGS[importType].collection
    for (const [index, record] of validation.valid.entries()) {
      const data = normalizeRecord(record, importType)
      const ok = await createImportedRecord(collection, data)
      if (ok) imported++
      else failed++
      setImportProgress({
        processed: index + 1,
        total,
        imported,
        failed,
      })
    }
    setResult({
      total: validation.valid.length + validation.problems.length,
      imported,
      ignored: validation.problems.length,
      problems: failed,
    })
    setImporting(false)
    setStep('result')
    if (imported > 0) toast.success(`${imported} registro(s) importado(s) com sucesso!`)
  }

  const handleReset = () => {
    setStep('type')
    setImportType(null)
    setFileName('')
    setHeaders([])
    setRows([])
    setMapping({})
    setValidation(null)
    setImportProgress({ processed: 0, total: 0, imported: 0, failed: 0 })
    setResult(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-[#1F5C8B] flex items-center justify-center text-white shrink-0">
          <Upload className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Importar Dados</h2>
          <p className="text-base text-gray-500">Importação em lote de usuários e livros</p>
        </div>
      </div>

      {step !== 'result' && <ImportStepper currentStep={step} />}

      {step === 'type' && <TypeStep onSelect={handleTypeSelect} />}

      {step === 'file' && importType && (
        <FileStep
          importType={importType}
          fileName={fileName}
          headers={headers}
          rows={rows}
          onFileSelect={handleFileSelect}
          onBack={() => setStep('type')}
          onNext={() => setStep('mapping')}
        />
      )}

      {step === 'mapping' && importType && (
        <MappingStep
          importType={importType}
          headers={headers}
          mapping={mapping}
          onMappingChange={setMapping}
          onBack={() => setStep('file')}
          onNext={handleValidation}
        />
      )}

      {step === 'validation' && importType && (
        <ValidationStep
          importType={importType}
          validation={validation}
          validating={validating}
          importing={importing}
          progress={importProgress}
          onBack={() => setStep('mapping')}
          onConfirm={handleConfirmImport}
        />
      )}

      {step === 'result' && result && <ResultStep result={result} onReset={handleReset} />}
    </div>
  )
}
