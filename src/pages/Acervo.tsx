import { useEffect, useState, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  BookPlus,
  Search,
  BookOpen,
  Library,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ArrowDownAZ,
  ArrowUpAZ,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LivroForm } from '@/components/acervo/LivroForm'
import { LivroFicha } from '@/components/acervo/LivroFicha'
import { getLivros, STATUS_LABELS, STATUS_BADGE_CLASSES, type Livro } from '@/services/livros'
import { useRealtime } from '@/hooks/use-realtime'
import { toast } from 'sonner'

type SortField = 'numero_cadastro' | 'titulo' | 'autor' | 'cdd' | 'cutter'
type SortOrder = 'asc' | 'desc'

const SORT_LABELS: Record<SortField, string> = {
  numero_cadastro: 'Número de Cadastro',
  titulo: 'Título',
  autor: 'Autor',
  cdd: 'CDD',
  cutter: 'CUTTER',
}

export default function Acervo() {
  const [livros, setLivros] = useState<Livro[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [fichaId, setFichaId] = useState<string | null>(null)
  const [fichaOpen, setFichaOpen] = useState(false)
  const [sortField, setSortField] = useState<SortField>('numero_cadastro')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [searchParams] = useSearchParams()
  const statusFilter = searchParams.get('filter') || ''

  const loadData = useCallback(async () => {
    try {
      const data = await getLivros()
      setLivros(data)
    } catch {
      toast.error('Erro ao carregar o acervo.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('livros', () => {
    loadData()
  })

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return livros.filter((l) => {
      if (statusFilter && l.status !== statusFilter) return false
      if (!q) return true
      return (
        l.numero_cadastro.toLowerCase().includes(q) ||
        l.titulo.toLowerCase().includes(q) ||
        l.autor.toLowerCase().includes(q) ||
        l.editora.toLowerCase().includes(q) ||
        (l.cdd || '').toLowerCase().includes(q) ||
        (l.descricao || '').toLowerCase().includes(q) ||
        (l.cutter || '').toLowerCase().includes(q)
      )
    })
  }, [livros, search, statusFilter])

  const sortedLivros = useMemo(() => {
    const list = [...filtered]
    list.sort((a, b) => {
      const valA = (a[sortField] || '').trim()
      const valB = (b[sortField] || '').trim()

      if (sortField === 'numero_cadastro') {
        const numA = parseInt(valA, 10)
        const numB = parseInt(valB, 10)
        if (!isNaN(numA) && !isNaN(numB)) {
          return sortOrder === 'asc' ? numA - numB : numB - numA
        }
      }

      const cmp = valA.localeCompare(valB, 'pt-BR', { sensitivity: 'base', numeric: true })
      return sortOrder === 'asc' ? cmp : -cmp
    })
    return list
  }, [filtered, sortField, sortOrder])

  const handleRowClick = (id: string) => {
    setFichaId(id)
    setFichaOpen(true)
  }

  const handleCreated = () => {
    toast.success('Livro cadastrado com sucesso!')
  }

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-gray-300 opacity-60" />
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-[#1F5C8B]" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-[#1F5C8B]" />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with New Book button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#1F5C8B] flex items-center justify-center text-white shrink-0">
            <Library className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Acervo</h2>
            <p className="text-sm text-gray-500">Cadastro e organização dos livros da biblioteca</p>
          </div>
        </div>
        <Button
          onClick={() => setFormOpen(true)}
          className="h-11 px-4 text-sm font-semibold bg-[#1F5C8B] hover:bg-[#174A73] shadow-sm"
        >
          <BookPlus className="w-5 h-5 mr-2" />
          Novo livro
        </Button>
      </div>

      {/* Search and Sort Toolbar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por número, título, autor, editora, CDD, descrição ou CUTTER..."
            className="h-12 pl-12 text-base border-gray-200"
          />
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 h-12 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 whitespace-nowrap hidden sm:inline">
            Classificar por:
          </span>
          <Select
            value={sortField}
            onValueChange={(val) => setSortField(val as SortField)}
          >
            <SelectTrigger className="h-9 border-0 bg-transparent text-sm font-medium focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="numero_cadastro">Número de Cadastro</SelectItem>
              <SelectItem value="titulo">Título</SelectItem>
              <SelectItem value="autor">Autor</SelectItem>
              <SelectItem value="cdd">CDD</SelectItem>
              <SelectItem value="cutter">CUTTER</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
            className="h-9 px-2.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
            title={sortOrder === 'asc' ? 'Ordem Crescente (clique para Decrescente)' : 'Ordem Decrescente (clique para Crescente)'}
          >
            {sortOrder === 'asc' ? (
              <span className="flex items-center gap-1">
                <ArrowUpAZ className="w-4 h-4 text-[#1F5C8B]" />
                <span className="hidden sm:inline">Crescente</span>
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <ArrowDownAZ className="w-4 h-4 text-[#1F5C8B]" />
                <span className="hidden sm:inline">Decrescente</span>
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Subheader info */}
      <div className="flex items-center justify-between text-sm text-gray-500 px-1">
        <span>
          {loading ? 'Carregando acervo...' : `${sortedLivros.length} livro(s) encontrado(s)`}
        </span>
        <span className="text-xs text-gray-400 hidden sm:inline">
          Ordenado por: <strong className="text-gray-700">{SORT_LABELS[sortField]}</strong> ({sortOrder === 'asc' ? 'Crescente' : 'Decrescente'})
        </span>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : sortedLivros.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-600">
            {search ? 'Nenhum livro encontrado.' : 'Nenhum livro cadastrado.'}
          </p>
          {!search && (
            <p className="text-base text-gray-400 mt-1">
              Clique em "Novo livro" para cadastrar o primeiro livro.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {/* Column headers (desktop, interactive sort) */}
          <div className="hidden md:grid grid-cols-[110px_1.5fr_1.5fr_90px_1fr_90px_120px] gap-3 px-4 py-2 text-sm font-bold text-gray-500 uppercase tracking-wide select-none">
            <button
              onClick={() => toggleSort('numero_cadastro')}
              className="flex items-center gap-1 hover:text-[#1F5C8B] transition-colors text-left"
            >
              <span>Cadastro</span>
              {renderSortIndicator('numero_cadastro')}
            </button>
            <button
              onClick={() => toggleSort('titulo')}
              className="flex items-center gap-1 hover:text-[#1F5C8B] transition-colors text-left"
            >
              <span>Título</span>
              {renderSortIndicator('titulo')}
            </button>
            <button
              onClick={() => toggleSort('autor')}
              className="flex items-center gap-1 hover:text-[#1F5C8B] transition-colors text-left"
            >
              <span>Autor</span>
              {renderSortIndicator('autor')}
            </button>
            <button
              onClick={() => toggleSort('cdd')}
              className="flex items-center gap-1 hover:text-[#1F5C8B] transition-colors text-left"
            >
              <span>CDD</span>
              {renderSortIndicator('cdd')}
            </button>
            <span>Descrição</span>
            <button
              onClick={() => toggleSort('cutter')}
              className="flex items-center gap-1 hover:text-[#1F5C8B] transition-colors text-left"
            >
              <span>Cutter</span>
              {renderSortIndicator('cutter')}
            </button>
            <span>Status</span>
          </div>
          {sortedLivros.map((livro) => (
            <button
              key={livro.id}
              onClick={() => handleRowClick(livro.id)}
              className="w-full text-left bg-white border border-gray-200/80 rounded-lg p-4 hover:border-[#1F5C8B]/40 hover:bg-[#1F5C8B]/5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#1F5C8B]/30 md:grid md:grid-cols-[110px_1.5fr_1.5fr_90px_1fr_90px_120px] md:items-center md:gap-3 flex flex-col gap-2"
            >
              <div className="flex items-center gap-2">
                <span className="md:hidden text-sm font-bold text-gray-500">Nº </span>
                <span className="text-base font-bold text-[#1F5C8B]">{livro.numero_cadastro}</span>
              </div>
              <span className="text-base font-semibold text-gray-900 break-words">
                {livro.titulo}
              </span>
              <span className="text-base text-gray-700 break-words">{livro.autor}</span>
              <span className="text-sm font-semibold text-gray-700 break-words">
                {livro.cdd || '—'}
              </span>
              <span className="text-sm text-gray-600 break-words">{livro.descricao || '—'}</span>
              <span className="text-sm font-semibold text-gray-700 break-words">
                {livro.cutter || '—'}
              </span>
              <div>
                <Badge className={STATUS_BADGE_CLASSES[livro.status]}>
                  {STATUS_LABELS[livro.status]}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* New Book Form Dialog */}
      <LivroForm open={formOpen} onOpenChange={setFormOpen} onSaved={handleCreated} />

      {/* Book Ficha Sheet */}
      <LivroFicha livroId={fichaId} open={fichaOpen} onOpenChange={setFichaOpen} />
    </div>
  )
}
