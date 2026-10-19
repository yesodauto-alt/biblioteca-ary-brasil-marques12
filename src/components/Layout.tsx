import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ArrowLeftRight,
  CornerDownLeft,
  RefreshCw,
  BarChart3,
  GraduationCap,
  Settings,
  Upload,
  LogOut,
  Menu,
} from 'lucide-react'
import { DateTimeIndicator } from '@/components/DateTimeIndicator'
import logoImg from '@/assets/image-fd362.png'

interface NavItem {
  to: string
  label: string
  icon: typeof LayoutDashboard
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/usuarios', label: 'Usuários', icon: Users },
  { to: '/acervo', label: 'Acervo', icon: BookOpen },
  { to: '/emprestimos', label: 'Empréstimos', icon: ArrowLeftRight },
  { to: '/devolucao', label: 'Devolução', icon: CornerDownLeft },
  { to: '/renovacao', label: 'Renovação', icon: RefreshCw },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { to: '/cursos', label: 'Cursos', icon: GraduationCap },
]

const ADMIN_ITEMS: NavItem[] = [
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
  { to: '/importacao', label: 'Importação', icon: Upload },
]

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation()
  const { user, signOut } = useAuth()
  const items = user?.role === 'administrador' ? [...NAV_ITEMS, ...ADMIN_ITEMS] : NAV_ITEMS

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 shrink-0">
        <img
          src={logoImg}
          alt="Biblioteca - Centro Espírita"
          className="h-11 w-auto max-w-full object-contain object-left"
        />
      </div>
      <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.to
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-[#1F5C8B] text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              )}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="p-4 border-t border-gray-100 shrink-0">
        <div className="flex items-center justify-between gap-1 mb-1">
          <p className="text-sm font-semibold text-gray-800 truncate">{user?.name || 'Usuário'}</p>
          <span
            className={cn(
              'text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full',
              user?.role === 'administrador'
                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                : 'bg-blue-100 text-blue-800 border border-blue-200',
            )}
          >
            {user?.role === 'administrador' ? 'Administrador' : 'Voluntário'}
          </span>
        </div>
        <p className="text-xs text-gray-400 truncate mb-2">{user?.email}</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="w-full justify-start text-gray-500 hover:text-gray-700"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
      </div>
    </div>
  )
}

export default function Layout() {
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-100 flex-col z-30">
        <SidebarContent />
      </aside>

      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-gray-100 sticky top-0 z-30">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SidebarContent onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <img
          src={logoImg}
          alt="Biblioteca - Centro Espírita"
          className="h-8 w-auto object-contain"
        />
        <DateTimeIndicator />
      </div>

      <main className="md:ml-64 max-w-[1400px]">
        <div className="hidden md:flex items-center justify-end px-6 py-2 bg-white border-b border-gray-100 sticky top-0 z-20">
          <DateTimeIndicator />
        </div>
        <div className="p-4 md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
