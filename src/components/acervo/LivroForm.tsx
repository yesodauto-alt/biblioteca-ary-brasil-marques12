import { useState, useEffect } from 'react'
import { BookPlus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  createLivro,
  updateLivro,
  STATUS_LABELS,
  type LivroFormData,
  type Livro,
  type LivroStatus,
} from '@/services/livros'
import { extractFieldErrors, type FieldErrors } from '@/lib/pocketbase/errors'

interface LivroFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  livro?: Livro | null
}

const STATUS_VALUES = Object.keys(STATUS_LABELS) as LivroStatus[]

export function LivroForm({ open, onOpenChange, onSaved, livro }: LivroFormProps) {
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [form, setForm] = useState<LivroFormData>({
    numero_cadastro: '',
    titulo: '',
    autor: '',
    editora: '',
    categoria: '',
    observacoes: '',
    cdd: '',
    descricao: '',
    cutter: '',
    data_aquisicao: '',
    volume: '',
    serie: '',
    escola: '',
    status: 'disponível',
  })

  useEffect(() => {
    if (open) {
      if (livro) {
        setForm({
          numero_cadastro: livro.numero_cadastro,
          titulo: livro.titulo,
          autor: livro.autor,
          editora: livro.editora,
          categoria: livro.categoria || '',
          observacoes: livro.observacoes || '',
          cdd: livro.cdd || '',
          descricao: livro.descricao || '',
          cutter: livro.cutter || '',
          data_aquisicao: livro.data_aquisicao || '',
          volume: livro.volume || '',
          serie: livro.serie || '',
          escola: livro.escola || '',
          status: livro.status,
        })
      } else {
        setForm({
          numero_cadastro: '',
          titulo: '',
          autor: '',
          editora: '',
          categoria: '',
          observacoes: '',
          cdd: '',
          descricao: '',
          cutter: '',
          data_aquisicao: '',
          volume: '',
          serie: '',
          escola: '',
          status: 'disponível',
        })
      }
      setFieldErrors({})
    }
  }, [open, livro])

  const handleFieldChange = (field: keyof LivroFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setFieldErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setFieldErrors({})
    try {
      const data: LivroFormData = {
        numero_cadastro: form.numero_cadastro.trim(),
        titulo: form.titulo.trim(),
        autor: form.autor.trim(),
        editora: form.editora.trim(),
        status: form.status || 'disponível',
      }
      if (form.categoria?.trim()) data.categoria = form.categoria.trim()
      if (form.observacoes?.trim()) data.observacoes = form.observacoes.trim()
      if (form.cdd?.trim()) data.cdd = form.cdd.trim()
      if (form.descricao?.trim()) data.descricao = form.descricao.trim()
      if (form.cutter?.trim()) data.cutter = form.cutter.trim()
      if (form.data_aquisicao) data.data_aquisicao = form.data_aquisicao
      if (form.volume?.trim()) data.volume = form.volume.trim()
      if (form.serie?.trim()) data.serie = form.serie.trim()
      if (form.escola?.trim()) data.escola = form.escola.trim()

      if (livro) {
        await updateLivro(livro.id, data)
      } else {
        await createLivro(data)
      }
      onSaved()
      onOpenChange(false)
    } catch (error) {
      setFieldErrors(extractFieldErrors(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {livro ? 'Editar Livro' : 'Novo Livro'}
          </DialogTitle>
          <DialogDescription className="text-base">
            {livro
              ? 'Edite os dados do livro no acervo.'
              : 'Cadastre um novo livro no acervo da biblioteca.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="numero_cadastro" className="text-base font-semibold">
              Número de Cadastro *
            </Label>
            <Input
              id="numero_cadastro"
              value={form.numero_cadastro}
              onChange={(e) => handleFieldChange('numero_cadastro', e.target.value)}
              className="h-12 text-base"
              placeholder="Ex: 0001"
              required
            />
            {fieldErrors.numero_cadastro && (
              <p className="text-sm text-red-500 font-medium">{fieldErrors.numero_cadastro}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="titulo" className="text-base font-semibold">
              Título *
            </Label>
            <Input
              id="titulo"
              value={form.titulo}
              onChange={(e) => handleFieldChange('titulo', e.target.value)}
              className="h-12 text-base"
              placeholder="Título do livro"
              required
            />
            {fieldErrors.titulo && (
              <p className="text-sm text-red-500 font-medium">{fieldErrors.titulo}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="autor" className="text-base font-semibold">
              Autor *
            </Label>
            <Input
              id="autor"
              value={form.autor}
              onChange={(e) => handleFieldChange('autor', e.target.value)}
              className="h-12 text-base"
              placeholder="Nome do autor"
              required
            />
            {fieldErrors.autor && (
              <p className="text-sm text-red-500 font-medium">{fieldErrors.autor}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="editora" className="text-base font-semibold">
              Editora *
            </Label>
            <Input
              id="editora"
              value={form.editora}
              onChange={(e) => handleFieldChange('editora', e.target.value)}
              className="h-12 text-base"
              placeholder="Nome da editora"
              required
            />
            {fieldErrors.editora && (
              <p className="text-sm text-red-500 font-medium">{fieldErrors.editora}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoria" className="text-base font-semibold">
              Categoria (opcional)
            </Label>
            <Input
              id="categoria"
              value={form.categoria}
              onChange={(e) => handleFieldChange('categoria', e.target.value)}
              className="h-12 text-base"
              placeholder="Ex: Romance, Espiritismo, Infantil..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cdd" className="text-base font-semibold">
                CDD (opcional)
              </Label>
              <Input
                id="cdd"
                value={form.cdd}
                onChange={(e) => handleFieldChange('cdd', e.target.value)}
                className="h-12 text-base"
                placeholder="Ex: FCX"
              />
              {fieldErrors.cdd && (
                <p className="text-sm text-red-500 font-medium">{fieldErrors.cdd}</p>
              )}{' '}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cutter" className="text-base font-semibold">
                CUTTER (opcional)
              </Label>
              <Input
                id="cutter"
                value={form.cutter}
                onChange={(e) => handleFieldChange('cutter', e.target.value)}
                className="h-12 text-base"
                placeholder="Ex: C-001"
              />
              {fieldErrors.cutter && (
                <p className="text-sm text-red-500 font-medium">{fieldErrors.cutter}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="data_aquisicao" className="text-base font-semibold">Aquisição</Label>
              <Input id="data_aquisicao" type="date" value={form.data_aquisicao} onChange={(e) => handleFieldChange('data_aquisicao', e.target.value)} className="h-12 text-base" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="volume" className="text-base font-semibold">Volume</Label>
              <Input id="volume" value={form.volume} onChange={(e) => handleFieldChange('volume', e.target.value)} className="h-12 text-base" placeholder="Ex: 1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="serie" className="text-base font-semibold">Série</Label>
              <Input id="serie" value={form.serie} onChange={(e) => handleFieldChange('serie', e.target.value)} className="h-12 text-base" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="escola" className="text-base font-semibold">Escola</Label>
              <Input id="escola" value={form.escola} onChange={(e) => handleFieldChange('escola', e.target.value)} className="h-12 text-base" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao" className="text-base font-semibold">
              Descrição do COD (opcional)
            </Label>
            <Input
              id="descricao"
              value={form.descricao}
              onChange={(e) => handleFieldChange('descricao', e.target.value)}
              className="h-12 text-base"
              placeholder="Ex: Francisco Cândido Xavier"
            />
            {fieldErrors.descricao && (
              <p className="text-sm text-red-500 font-medium">{fieldErrors.descricao}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status" className="text-base font-semibold">
              Status
            </Label>
            <Select value={form.status} onValueChange={(v) => handleFieldChange('status', v)}>
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_VALUES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.status && (
              <p className="text-sm text-red-500 font-medium">{fieldErrors.status}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes" className="text-base font-semibold">
              Observações (opcional)
            </Label>
            <Textarea
              id="observacoes"
              value={form.observacoes}
              onChange={(e) => handleFieldChange('observacoes', e.target.value)}
              className="text-base min-h-[80px]"
              placeholder="Anotações sobre o livro"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-12 text-base font-semibold"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 h-12 text-base font-bold bg-[#1F5C8B] hover:bg-[#174A73]"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <BookPlus className="w-5 h-5 mr-2" />
              )}
              {livro ? 'Salvar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
