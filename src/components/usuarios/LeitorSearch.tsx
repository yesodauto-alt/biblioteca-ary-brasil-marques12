import { useState, useRef, useEffect } from 'react'
import { User, Phone, Loader2, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { searchLeitores, type Leitor } from '@/services/leitores'
import { formatNumeroCadastro } from '@/lib/code-formatter'

interface LeitorSearchProps {
  onLeitorSelected: (leitor: Leitor) => void
  autoFocus?: boolean
}

export function LeitorSearch({ onLeitorSelected, autoFocus = true }: LeitorSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Leitor[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  const handleSearch = async () => {
    const q = query.trim()
    if (!q) return
    setLoading(true)
    setSearched(true)
    try {
      const leitores = await searchLeitores(q)
      setResults(leitores)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (leitor: Leitor) => {
    onLeitorSelected(leitor)
    setQuery('')
    setResults([])
    setSearched(false)
  }

  const handleChange = (v: string) => {
    setQuery(v)
    setResults([])
    setSearched(false)
  }

  return (
    <div className="space-y-3">
      <Input
        ref={inputRef}
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            handleSearch()
          }
        }}
        placeholder="Busque pelo nome ou número do usuário"
        className="h-14 text-lg font-medium border-gray-300"
        autoFocus={autoFocus}
      />

      {loading && (
        <div className="flex items-center gap-2 text-gray-500 py-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-base">Buscando usuários...</span>
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="flex items-center gap-2 text-gray-500 py-2">
          <AlertCircle className="w-5 h-5" />
          <span className="text-base">Nenhum usuário encontrado.</span>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-2">
          {results.map((leitor) => (
            <button
              key={leitor.id}
              onClick={() => handleSelect(leitor)}
              className="w-full text-left bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-[#1F5C8B] hover:bg-[#1F5C8B]/5 transition-colors duration-200"
            >
              <div className="flex items-center gap-2">
                <User className="w-6 h-6 text-[#1F5C8B] shrink-0" />
                <span className="text-lg font-bold text-gray-900">{leitor.nome_completo}</span>
                <Badge
                  className={
                    leitor.status === 'ativo'
                      ? 'bg-green-100 text-green-800 hover:bg-green-100 shrink-0'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-200 shrink-0'
                  }
                >
                  {leitor.status === 'ativo' ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 ml-8">
                <span className="text-base text-gray-600">Cadastro: {formatNumeroCadastro(leitor.numero_cadastro)}</span>
                {leitor.telefone && (
                  <span className="text-base text-gray-600 flex items-center gap-1">
                    <Phone className="w-4 h-4" /> {leitor.telefone}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
