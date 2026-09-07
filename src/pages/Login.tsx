import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookMarked, LogIn, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { signIn, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  if (isAuthenticated) {
    navigate('/', { replace: true })
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    setIsSubmitting(true)

    if (!email || !password) {
      setErrorMessage('Por favor, preencha o e-mail e a senha.')
      setIsSubmitting(false)
      return
    }

    const { error } = await signIn(email, password)

    if (error) {
      const msg = error?.message || ''
      setErrorMessage(
        msg.includes('inativa') ? msg : 'E-mail ou senha incorretos. Tente novamente.',
      )
      setIsSubmitting(false)
    } else {
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg border border-gray-200/80 shadow-elevation p-8 space-y-6 animate-fade-in">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 bg-[#1F5C8B] text-white rounded-xl flex items-center justify-center mx-auto shadow-sm">
            <BookMarked className="w-8 h-8" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">
            Biblioteca do Centro Espírita
          </h1>
          <p className="text-gray-500 text-sm">Acesso ao Sistema de Gestão</p>
        </div>

        {errorMessage && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start gap-3 font-medium text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-lg font-semibold text-gray-800">
              E-mail
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="seu.email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 text-base px-4 border-gray-200 focus-visible:ring-2 focus-visible:ring-[#1F5C8B]/30"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-lg font-semibold text-gray-800">
              Senha
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 text-base px-4 pr-12 border-gray-200 focus-visible:ring-2 focus-visible:ring-[#1F5C8B]/30"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#1F5C8B]"
                aria-label={showPassword ? 'Ocultar senha' : 'Visualizar senha'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 bg-[#1F5C8B] hover:bg-[#174A73] text-white font-semibold text-base rounded-lg flex items-center justify-center gap-2 shadow-sm"
          >
            <LogIn className="w-5 h-5" />
            <span>{isSubmitting ? 'Entrando...' : 'Entrar'}</span>
          </Button>
        </form>

        <p className="text-center text-gray-400 text-sm border-t border-gray-100 pt-4">
          Este sistema é de uso interno dos voluntários.
        </p>
      </div>
    </div>
  )
}
