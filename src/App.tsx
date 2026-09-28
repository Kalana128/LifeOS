import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Home from './components/Home'
import Tasks from './components/Tasks'
import Finances from './components/Finances'
import Goals from './components/Goals'
import Reports from './components/Reports'
import { supabase } from './lib/supabase'

function App() {
  const [currentPage, setCurrentPage] = useState('home')
  const [isDark, setIsDark] = useState(true)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  useEffect(() => {
    supabase.from('tasks').select('count').then(res => {
      console.log('Supabase connected! Response:', res)
    })
  }, [])

  const mainBg = isDark ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'

  // Helper to get the exact same max-width classes for the header as the content below it
  const getMaxWidthClasses = () => {
    const base = "w-full mx-auto px-4 sm:px-0 transition-all duration-300";
    if (currentPage === 'home') return `${base} ${isSidebarCollapsed ? 'max-w-7xl' : 'max-w-5xl'}`;
    if (currentPage === 'tasks') return `${base} ${isSidebarCollapsed ? 'max-w-5xl' : 'max-w-3xl'}`;
    // For Finances, Goals, and Reports
    return `${base} ${isSidebarCollapsed ? 'max-w-6xl' : 'max-w-4xl'}`; 
  };

  const getPageTitle = () => {
    if (currentPage === 'home') return '';
    if (currentPage === 'tasks') return 'Daily Tasks';
    if (currentPage === 'finances') return 'Finances';
    if (currentPage === 'goals') return 'Goals';
    if (currentPage === 'reports') return 'Reports';
    return '';
  };

  const getPageSubtitle = () => {
    if (currentPage === 'home') return '';
    if (currentPage === 'tasks') return 'Manage your daily to-do list.';
    if (currentPage === 'finances') return 'Track your income, expenses, and savings.';
    if (currentPage === 'goals') return 'Work towards your personal goals.';
    if (currentPage === 'reports') return 'View your progress and achievements.';
    return '';
  };

  return (
    <div className={`flex h-screen ${mainBg} transition-colors`}>
      <Sidebar 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage} 
        isDark={isDark} 
        setIsDark={setIsDark} 
        isCollapsed={isSidebarCollapsed}
        toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      <main className="flex-1 p-4 sm:p-8 overflow-auto">
        {/* UPDATED HEADER: Now perfectly centered and aligned with the content below */}
        {currentPage !== 'home' && (
          <header className={`mb-6 sm:mb-8 ${getMaxWidthClasses()}`}>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{getPageTitle()}</h1>
            <p className="text-sm sm:text-base text-gray-500 mt-1">{getPageSubtitle()}</p>
          </header>
        )}

        {currentPage === 'home' ? (
          <Home isDark={isDark} setCurrentPage={setCurrentPage} isSidebarCollapsed={isSidebarCollapsed} />
        ) : currentPage === 'tasks' ? (
          <Tasks isDark={isDark} isSidebarCollapsed={isSidebarCollapsed} />
        ) : currentPage === 'finances' ? (
          <Finances isDark={isDark} isSidebarCollapsed={isSidebarCollapsed} />
        ) : currentPage === 'goals' ? (
          <Goals isDark={isDark} isSidebarCollapsed={isSidebarCollapsed} />
        ) : currentPage === 'reports' ? (
          <Reports isDark={isDark} isSidebarCollapsed={isSidebarCollapsed} />
        ) : null}
      </main>
    </div>
  )
}

export default App