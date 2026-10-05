import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Home from './components/Home'
import Tasks from './components/Tasks'
import Finances from './components/Finances'
import Goals from './components/Goals'
import Reports from './components/Reports'
import Auth from './components/Auth'
import { supabase } from './lib/supabase'
import { Menu } from 'lucide-react'

function App() {
  const [user, setUser] = useState<any>(null)
  const [loadingAuth, setLoadingAuth] = useState(true)
  
  const [currentPage, setCurrentPage] = useState('home')
  const [isDark, setIsDark] = useState(true)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Security Guard: Check if user is logged in
  useEffect(() => {
    // Check current session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoadingAuth(false)
    })

    // Listen for auth changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const mainBg = isDark ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'

  // Show loading spinner while checking auth
  if (loadingAuth) {
    return (
      <div className={`flex h-screen items-center justify-center ${mainBg}`}>
        <div className="text-center">
          <h1 className={`text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Life<span className="text-blue-500">OS</span>
          </h1>
          <p className="mt-2 text-sm text-gray-500">Securing your dashboard...</p>
        </div>
      </div>
    )
  }

  // If no user, show Auth screen
  if (!user) {
    return <Auth isDark={isDark} />
  }

  const getMaxWidthClasses = () => {
    const base = "w-full mx-auto px-4 sm:px-0 transition-all duration-300";
    if (currentPage === 'home') return `${base} ${isSidebarCollapsed ? 'max-w-7xl' : 'max-w-5xl'}`;
    if (currentPage === 'tasks') return `${base} ${isSidebarCollapsed ? 'max-w-5xl' : 'max-w-3xl'}`;
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

  const handlePageChange = (page: string) => {
    setCurrentPage(page);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className={`flex h-screen ${mainBg} transition-colors overflow-hidden`}>
      
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm transition-opacity"
        />
      )}

      {/* Sidebar */}
      <Sidebar 
        currentPage={currentPage} 
        setCurrentPage={handlePageChange} 
        isDark={isDark} 
        setIsDark={setIsDark} 
        isCollapsed={isSidebarCollapsed}
        toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileMenuOpen={isMobileMenuOpen}
        closeMobileMenu={() => setIsMobileMenuOpen(false)}
        user={user} // Pass user to sidebar for profile section
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center p-4 border-b border-gray-800/50">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className={`p-2 rounded-lg transition-colors active:scale-90 ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
          >
            <Menu size={24} />
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          
          <div key={currentPage} className="animate-page-enter">
            
            {currentPage !== 'home' && (
              <header className={`mb-6 sm:mb-8 ${getMaxWidthClasses()}`}>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{getPageTitle()}</h1>
                <p className="text-sm sm:text-base text-gray-500 mt-1">{getPageSubtitle()}</p>
              </header>
            )}

            {currentPage === 'home' ? (
              <Home isDark={isDark} setCurrentPage={handlePageChange} isSidebarCollapsed={isSidebarCollapsed} />
            ) : currentPage === 'tasks' ? (
              <Tasks isDark={isDark} isSidebarCollapsed={isSidebarCollapsed} />
            ) : currentPage === 'finances' ? (
              <Finances isDark={isDark} isSidebarCollapsed={isSidebarCollapsed} />
            ) : currentPage === 'goals' ? (
              <Goals isDark={isDark} isSidebarCollapsed={isSidebarCollapsed} />
            ) : currentPage === 'reports' ? (
              <Reports isDark={isDark} isSidebarCollapsed={isSidebarCollapsed} />
            ) : null}
            
          </div>
        </div>
      </main>
    </div>
  )
}

export default App