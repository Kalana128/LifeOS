import { useState } from 'react'
import { Home, ListChecks, Wallet, Target, BarChart3, Sun, Moon, PanelLeftClose, PanelLeftOpen, X, LogOut, User } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface SidebarProps {
  currentPage: string
  setCurrentPage: (page: string) => void
  isDark: boolean
  setIsDark: (val: boolean) => void
  isCollapsed: boolean
  toggleSidebar: () => void
  isMobileMenuOpen: boolean
  closeMobileMenu: () => void
  user: any
}

export default function Sidebar({ 
  currentPage, 
  setCurrentPage, 
  isDark, 
  setIsDark, 
  isCollapsed, 
  toggleSidebar,
  isMobileMenuOpen,
  closeMobileMenu,
  user
}: SidebarProps) {
  
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)

  const menuItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'tasks', label: 'Tasks', icon: ListChecks },
    { id: 'finances', label: 'Finances', icon: Wallet },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
  ]

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const userInitial = userName.charAt(0).toUpperCase()
  const userEmail = user?.email || ''

  const handleLogout = async () => {
    setIsProfileMenuOpen(false) // Close menu first
    const { error } = await supabase.auth.signOut()
    if (error) console.error('Error signing out:', error)
  }

  const handleProfileClick = () => {
    if (isCollapsed && !isMobileMenuOpen) {
      toggleSidebar() // Expand sidebar if collapsed
    } else {
      setIsProfileMenuOpen(!isProfileMenuOpen) // Toggle dropdown
    }
  }

  return (
    <aside className={`
      h-full flex flex-col border-r transition-all duration-300 ease-in-out
      /* Mobile Drawer Styles */
      fixed top-0 left-0 z-50 w-64 shadow-2xl
      ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      /* Desktop Styles */
      lg:relative lg:z-auto lg:translate-x-0 lg:shadow-none
      ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
      /* Colors */
      ${isDark ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'}
    `}>
      
      {/* Header & Toggle Button */}
      <div className={`flex items-center ${isCollapsed && !isMobileMenuOpen ? 'lg:justify-center lg:py-6' : 'justify-between px-6 py-6'}`}>
        {(!isCollapsed || isMobileMenuOpen) && (
          <h2 className="text-3xl font-bold tracking-tight transition-all duration-300">
            Life<span className="text-blue-500">OS</span>
          </h2>
        )}
        
        <button
          onClick={closeMobileMenu}
          className={`p-2 rounded-lg transition-colors lg:hidden ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
          title="Close menu"
        >
          <X size={24} />
        </button>

        <button
          onClick={toggleSidebar}
          className={`p-2 rounded-lg transition-colors hidden lg:block ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {menuItems.map(item => {
          const Icon = item.icon
          const isActive = currentPage === item.id
          
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full flex items-center rounded-xl transition-all relative 
                ${isCollapsed && !isMobileMenuOpen ? 'lg:justify-center lg:py-3' : 'px-4 py-3 gap-3'} 
                ${isActive ? (isDark ? 'bg-blue-600/10 text-blue-400' : 'bg-blue-50 text-blue-600') : (isDark ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-700')}`}
              title={isCollapsed && !isMobileMenuOpen ? item.label : ''}
            >
              {isActive && !isCollapsed && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-600 rounded-r-full"></div>
              )}
              <Icon size={20} className={isActive ? '' : 'opacity-60'} />
              <span className={`font-medium transition-all duration-300 whitespace-nowrap ${isCollapsed && !isMobileMenuOpen ? 'lg:opacity-0 lg:w-0 lg:overflow-hidden' : 'opacity-100'}`}>
                {item.label}
              </span>
            </button>
          )
        })}
      </nav>

      {/* NEW: User Profile Section with Dropdown */}
      <div className={`relative px-3 pb-3 border-t ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
        
        {/* Dropdown Menu (Floating Above) */}
        {isProfileMenuOpen && !isCollapsed && (
          <div className={`absolute bottom-full left-3 right-3 mb-2 rounded-xl border shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
            <div className={`px-4 py-3 border-b ${isDark ? 'border-gray-800 bg-gray-800/50' : 'border-gray-100 bg-gray-50'}`}>
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Signed in as</p>
              <p className="text-sm font-medium truncate mt-0.5">{userEmail}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors"
            >
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        )}

        {/* Profile Trigger Button */}
        <button
          onClick={handleProfileClick}
          className={`w-full flex items-center rounded-xl transition-colors 
            ${isCollapsed && !isMobileMenuOpen ? 'lg:justify-center lg:p-2' : 'px-3 py-3 gap-3'} 
            ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
          title={isCollapsed && !isMobileMenuOpen ? "Expand sidebar" : "User menu"}
        >
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-700 text-white font-bold text-sm shadow-sm">
            {userInitial}
          </div>
          
          {/* Name (Hidden when collapsed) */}
          <div className={`flex-1 min-w-0 text-left ${isCollapsed && !isMobileMenuOpen ? 'lg:hidden' : ''}`}>
            <p className="text-sm font-medium truncate">{userName}</p>
            <p className="text-[10px] text-gray-500 truncate">View Profile</p>
          </div>
        </button>
      </div>

      {/* Dark Mode Toggle */}
      <div className={`flex items-center ${isCollapsed && !isMobileMenuOpen ? 'lg:justify-center lg:pb-6' : 'px-3 pb-6'}`}>
        <button
          onClick={() => setIsDark(!isDark)}
          className={`flex items-center rounded-xl transition-all 
            ${isCollapsed && !isMobileMenuOpen ? 'lg:p-3' : 'w-full px-4 py-3 gap-3'} 
            ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
          title={isCollapsed && !isMobileMenuOpen ? (isDark ? "Switch to Light Mode" : "Switch to Dark Mode") : ''}
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
          <span className={`font-medium text-sm transition-all duration-300 whitespace-nowrap ${isCollapsed && !isMobileMenuOpen ? 'lg:opacity-0 lg:w-0 lg:overflow-hidden' : 'opacity-100'}`}>
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </span>
        </button>
      </div>
    </aside>
  )
}