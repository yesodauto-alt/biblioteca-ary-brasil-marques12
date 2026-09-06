import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/hooks/use-auth'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import Layout from '@/components/Layout'

import Index from '@/pages/Index'
import Login from '@/pages/Login'
import Usuarios from '@/pages/Usuarios'
import Acervo from '@/pages/Acervo'
import Emprestimos from '@/pages/Emprestimos'
import Devolucao from '@/pages/Devolucao'
import DevolucoesHoje from '@/pages/DevolucoesHoje'
import Renovacao from '@/pages/Renovacao'
import Relatorios from '@/pages/Relatorios'
import Configuracoes from '@/pages/Configuracoes'
import Cursos from '@/pages/Cursos'
import Importacao from '@/pages/Importacao'
import ConciliacaoAcervo from '@/pages/ConciliacaoAcervo'
import NotFound from '@/pages/NotFound'

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Index />} />
            <Route path="/usuarios" element={<Usuarios />} />
            <Route path="/acervo" element={<Acervo />} />
            <Route path="/emprestimos" element={<Emprestimos />} />
            <Route path="/devolucao" element={<Devolucao />} />
            <Route path="/devolucoes-hoje" element={<DevolucoesHoje />} />
            <Route path="/renovacao" element={<Renovacao />} />
            <Route path="/relatorios" element={<Relatorios />} />
            <Route path="/cursos" element={<Cursos />} />
            <Route
              path="/configuracoes"
              element={
                <ProtectedRoute requiredRole="administrador">
                  <Configuracoes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/conciliacao-acervo"
              element={
                <ProtectedRoute requiredRole="administrador">
                  <ConciliacaoAcervo />
                </ProtectedRoute>
              }
            />
            <Route
              path="/importacao"
              element={
                <ProtectedRoute requiredRole="administrador">
                  <Importacao />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
