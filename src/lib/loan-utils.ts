export type Situacao = 'em-dia' | 'vence-hoje' | 'atrasado' | 'sem-data'

const DEFAULT_TIMEZONE = 'America/Sao_Paulo'

export function getTodayInTimezone(timezone: string = DEFAULT_TIMEZONE): string {
  try {
    return new Intl.DateTimeFormat('sv-SE', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
  } catch {
    const d = new Date()
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
}

export function parseSafeDate(val: unknown): Date | null {
  if (val == null) return null
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val
  if (typeof val === 'number') {
    if (val > 10000 && val < 100000) {
      // Excel serial date number
      const ms = (val - 25569) * 86400 * 1000
      const d = new Date(ms)
      return isNaN(d.getTime()) ? null : d
    }
    const ms = val < 10000000000 ? val * 1000 : val
    const d = new Date(ms)
    return isNaN(d.getTime()) ? null : d
  }
  const str = String(val).trim()
  if (!str) return null

  // Brazilian format DD/MM/YYYY or DD/MM/YYYY HH:mm:ss
  const brMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/)
  if (brMatch) {
    const day = parseInt(brMatch[1], 10)
    const month = parseInt(brMatch[2], 10) - 1
    const year = parseInt(brMatch[3], 10)
    const hour = brMatch[4] ? parseInt(brMatch[4], 10) : 0
    const min = brMatch[5] ? parseInt(brMatch[5], 10) : 0
    const sec = brMatch[6] ? parseInt(brMatch[6], 10) : 0
    const d = new Date(year, month, day, hour, min, sec)
    return isNaN(d.getTime()) ? null : d
  }

  // YYYY-MM-DD prefix (clean date without timezone shift issues)
  const ymdMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (ymdMatch) {
    const d = new Date(parseInt(ymdMatch[1], 10), parseInt(ymdMatch[2], 10) - 1, parseInt(ymdMatch[3], 10))
    if (!isNaN(d.getTime())) return d
  }

  const isoStr = str.includes(' ') && !str.includes('T') ? str.replace(' ', 'T') : str
  const d = new Date(isoStr)
  return isNaN(d.getTime()) ? null : d
}

export function normalizeToDate(val: unknown): string {
  if (val == null) return ''
  const str = String(val).trim()
  if (!str) return ''

  // If already YYYY-MM-DD, return direct match
  const ymdMatch = str.match(/^(\d{4}-\d{2}-\d{2})/)
  if (ymdMatch) return ymdMatch[1]

  const d = parseSafeDate(val)
  if (!d) return ''
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isValidDate(val: unknown): boolean {
  return parseSafeDate(val) !== null
}

export function getSituacao(dataPrevista: unknown, timezone: string = DEFAULT_TIMEZONE): Situacao {
  const normalized = normalizeToDate(dataPrevista)
  if (!normalized) return 'sem-data'
  const today = getTodayInTimezone(timezone)
  if (normalized > today) return 'em-dia'
  if (normalized === today) return 'vence-hoje'
  return 'atrasado'
}

export function getDaysOverdue(
  dataPrevista: unknown,
  timezone: string = DEFAULT_TIMEZONE,
): number | null {
  const dateOnly = normalizeToDate(dataPrevista)
  if (!dateOnly) return null
  const today = getTodayInTimezone(timezone)
  if (dateOnly >= today) return 0
  const prevista = new Date(dateOnly + 'T00:00:00')
  const hoje = new Date(today + 'T00:00:00')
  const diffMs = hoje.getTime() - prevista.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

export const SITUACAO_LABELS: Record<Situacao, string> = {
  'em-dia': 'Em dia',
  'vence-hoje': 'Vence hoje',
  atrasado: 'Atrasado',
  'sem-data': 'Data não informada',
}

export const SITUACAO_BADGE: Record<Situacao, string> = {
  'em-dia': 'bg-green-100 text-green-800 hover:bg-green-100',
  'vence-hoje': 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  atrasado: 'bg-red-100 text-red-800 hover:bg-red-100',
  'sem-data': 'bg-gray-100 text-gray-600 hover:bg-gray-100',
}

export const SITUACAO_PRIORITY: Record<Situacao, number> = {
  atrasado: 0,
  'vence-hoje': 1,
  'em-dia': 2,
  'sem-data': 3,
}

export function formatDate(val: unknown): string {
  const d = parseSafeDate(val)
  if (!d) return 'Data não informada'
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

export function formatDateTime(val: unknown, timezone: string = DEFAULT_TIMEZONE): string {
  const d = parseSafeDate(val)
  if (!d) return 'Data não informada'
  try {
    const datePart = new Intl.DateTimeFormat('pt-BR', {
      timeZone: timezone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d)
    const timePart = new Intl.DateTimeFormat('pt-BR', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
    return `${datePart} às ${timePart}`
  } catch {
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    const hours = String(d.getHours()).padStart(2, '0')
    const mins = String(d.getMinutes()).padStart(2, '0')
    return `${day}/${month}/${year} às ${hours}:${mins}`
  }
}
