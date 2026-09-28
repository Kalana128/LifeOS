import { Home, ListChecks, Wallet, Target, BarChart3, Sun, Moon, PanelLeftClose, PanelLeftOpen } from 'lucide-react'

interface SidebarProps {
  currentPage: string
  setCurrentPage: (page: string) => void
  isDark: boolean
  setIsDark: (val: boolean) => void
  isCollapsed: boolean
  toggleSidebar: () => void
}

export default function Sidebar({ currentPage, setCurrentPage, isDark, setIsDark, isCollapsed, toggleSidebar }: SidebarProps) {
  const menuItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'tasks', label: 'Tasks', icon: ListChecks },
    { id: 'finances', label: 'Finances', icon: Wallet },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
  ]

  return (
    <aside className={`h-full flex flex-col border-r transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'} ${isDark ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
      
      {/* Header & Toggle Button */}
      <div className={`flex items-center ${isCollapsed ? 'justify-center py-6' : 'justify-between px-6 py-6'}`}>
        {!isCollapsed && (
          <h2 className="text-3xl font-bold tracking-tight transition-all duration-300">
            Life<span className="text-blue-500">OS</span>
          </h2>
        )}
        <button
          onClick={toggleSidebar}
          className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        {menuItems.map(item => {
          const Icon = item.icon
          const isActive = currentPage === item.id
          
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full flex items-center rounded-xl transition-all relative ${isCollapsed ? 'justify-center py-3' : 'px-4 py-3 gap-3'} ${isActive ? (isDark ? 'bg-blue-600/10 text-blue-400' : 'bg-blue-50 text-blue-600') : (isDark ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-700')}`}
              title={isCollapsed ? item.label : ''}
            >
              {isActive && !isCollapsed && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-600 rounded-r-full"></div>
              )}
              <Icon size={20} className={isActive ? '' : 'opacity-60'} />
              <span className={`font-medium transition-all duration-300 whitespace-nowrap ${isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
                {item.label}
              </span>
            </button>
          )
        })}
      </nav>

      {/* Sleek Dark Mode Toggle at the bottom */}
      <div className={`flex items-center ${isCollapsed ? 'justify-center pb-6' : 'px-3 pb-6'}`}>
        <button
          onClick={() => setIsDark(!isDark)}
          className={`flex items-center rounded-xl transition-all ${isCollapsed ? 'p-3' : 'w-full px-4 py-3 gap-3'} ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
          title={isCollapsed ? (isDark ? "Switch to Light Mode" : "Switch to Dark Mode") : ''}
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
          <span className={`font-medium text-sm transition-all duration-300 whitespace-nowrap ${isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </span>
        </button>
      </div>
    </aside>
  )
}