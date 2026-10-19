import { Settings } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { LoanSettings } from '@/components/configuracoes/LoanSettings'
import { LibrarySettings } from '@/components/configuracoes/LibrarySettings'
import { VolunteerManagement } from '@/components/configuracoes/VolunteerManagement'

export default function Configuracoes() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#1F5C8B] flex items-center justify-center text-white shrink-0">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Configurações</h2>
          <p className="text-sm text-gray-500">Ajustes gerais do sistema</p>
        </div>
      </div>

      <Tabs defaultValue="emprestimos" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-xl h-11">
          <TabsTrigger value="emprestimos" className="text-sm font-medium">
            Empréstimos
          </TabsTrigger>
          <TabsTrigger value="biblioteca" className="text-sm font-medium">
            Biblioteca
          </TabsTrigger>
          <TabsTrigger value="voluntarios" className="text-sm font-medium">
            Equipe & Voluntários
          </TabsTrigger>
        </TabsList>
        <TabsContent value="emprestimos" className="mt-6">
          <LoanSettings />
        </TabsContent>
        <TabsContent value="biblioteca" className="mt-6">
          <LibrarySettings />
        </TabsContent>
        <TabsContent value="voluntarios" className="mt-6">
          <VolunteerManagement />
        </TabsContent>
      </Tabs>
    </div>
  )
}
