import { useState, useEffect } from 'react'
import { TrendingUp, CreditCard, Wallet, Target, Plus, CheckCircle2, Clock, AlertCircle, Calendar } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface HomeProps {
  isDark: boolean
  setCurrentPage: (page: string) => void
  isSidebarCollapsed: boolean
}

// FIX: Helper to get local date string
const getLocalDateString = (date: Date) => {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

export default function Home({ isDark, setCurrentPage, isSidebarCollapsed }: HomeProps) {
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [debts, setDebts] = useState<any[]>([])
  const [charges, setCharges] = useState<any[]>([])
  const [goals, setGoals] = useState<any[]>([])

  useEffect(() => { fetchAllData() }, [])

  const fetchAllData = async () => {
    setLoading(true)
    const [tasksRes, transRes, debtsRes, chargesRes, goalsRes] = await Promise.all([
      supabase.from('tasks').select('*'),
      supabase.from('transactions').select('*'),
      supabase.from('debts').select('*'),
      supabase.from('cc_charges').select('*'),
      supabase.from('goals').select('*')
    ])

    if (tasksRes.data) setTasks(tasksRes.data)
    if (transRes.data) setTransactions(transRes.data.map(t => ({ ...t, amount: Number(t.amount) })))
    if (debtsRes.data) setDebts(debtsRes.data.map(d => ({ ...d, monthlyPayment: Number(d.monthly_payment) })))
    if (chargesRes.data) setCharges(chargesRes.data.map(c => ({ ...c, amount: Number(c.amount), isInstallment: c.is_installment, monthlyAmount: c.monthly_amount ? Number(c.monthly_amount) : undefined })))
    if (goalsRes.data) setGoals(goalsRes.data.map(g => ({ ...g, targetAmount: Number(g.target_amount), currentAmount: Number(g.current_amount), progressPercent: Number(g.progress_percent) || 0 })))
    setLoading(false)
  }

  const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0)
  const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0)
  const balance = income - expenses
  const ccDue = charges.reduce((sum, c) => (c.isInstallment && c.monthlyAmount ? sum + c.monthlyAmount : !c.isInstallment ? sum + c.amount : sum), 0)
  const debtDue = debts.reduce((sum, d) => sum + Number(d.monthlyPayment), 0)

  // --- SMART TODAY'S FOCUS LOGIC ---
  const todayString = getLocalDateString(new Date());
  const priorityOrder = { high: 1, medium: 2, low: 3 }

  // 1. Get ALL overdue tasks, sorted by priority
  const allOverdue = tasks
    .filter(t => !t.completed && t.due_date && t.due_date.split('T')[0] < todayString)
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
  
  const topOverdue = allOverdue[0]
  const overdueCount = allOverdue.length - 1

  // 2. Get ALL today tasks, sorted by priority
  const allToday = tasks
    .filter(t => !t.completed && t.due_date && t.due_date.split('T')[0] === todayString)
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
  
  const topToday = allToday[0]
  const todayCount = allToday.length - 1

  const activeGoals = goals.filter(g => !g.completed).sort((a, b) => b.progressPercent - a.progressPercent).slice(0, 2)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening'
  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const cardBg = isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
  const progressBg = isDark ? 'bg-gray-700' : 'bg-gray-200'
  const btnBg = isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'
  const taskItemBg = isDark ? 'bg-gray-800' : 'bg-gray-50'

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-500">Loading your dashboard...</div>

  return (
    <div className={`w-full space-y-6 sm:space-y-8 transition-all duration-300 mx-auto px-4 sm:px-0 ${isSidebarCollapsed ? 'max-w-7xl' : 'max-w-5xl'}`}>
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{greeting}, Kalana!</h1>
        <p className="text-sm sm:text-base text-gray-500 mt-1">{todayStr}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className={`p-4 sm:p-5 rounded-2xl border shadow-sm ${cardBg}`}>
          <div className="flex items-center gap-2 mb-2"><Wallet size={18} className="text-blue-500" /><p className="text-sm text-gray-500 font-medium">Current Balance</p></div>
          <p className={`text-xl sm:text-2xl font-bold ${balance >= 0 ? 'text-blue-500' : 'text-red-500'}`}>{new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(balance)}</p>
        </div>
        <div className={`p-4 sm:p-5 rounded-2xl border shadow-sm ${cardBg}`}>
          <div className="flex items-center gap-2 mb-2"><CreditCard size={18} className="text-orange-500" /><p className="text-sm text-gray-500 font-medium">Credit Card Due</p></div>
          <p className="text-xl sm:text-2xl font-bold text-orange-500">{new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(ccDue)}</p>
        </div>
        <div className={`p-4 sm:p-5 rounded-2xl border shadow-sm ${cardBg} sm:col-span-2 lg:col-span-1`}>
          <div className="flex items-center gap-2 mb-2"><TrendingUp size={18} className="text-red-500" /><p className="text-sm text-gray-500 font-medium">Loan Payments Due</p></div>
          <p className="text-xl sm:text-2xl font-bold text-red-500">{new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(debtDue)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* TODAY'S FOCUS BLOCK - UPDATED WITH NEW UI */}
        <div className={`p-4 sm:p-6 rounded-2xl border shadow-sm ${cardBg}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <Clock size={20} className="text-blue-500" />
              Today's Focus
            </h3>
            <button onClick={() => setCurrentPage('tasks')} className="text-sm text-blue-500 hover:underline">View all</button>
          </div>

          {allOverdue.length === 0 && allToday.length === 0 ? (
            <p className="text-gray-500 text-center py-8 text-sm">All caught up! No tasks due today.</p>
          ) : (
            <div className="space-y-5">
              
              {/* OVERDUE SECTION */}
              {topOverdue && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-red-500 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertCircle size={12} /> Overdue ({allOverdue.length})
                  </h4>
                  <div className={`flex items-center gap-3 p-3 rounded-xl ${taskItemBg}`}>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${topOverdue.priority === 'high' ? 'bg-red-500' : topOverdue.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                    <span className="flex-1 text-sm font-medium truncate">{topOverdue.text}</span>
                    <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                  </div>
                  {overdueCount > 0 && (
                    <p className="text-xs text-gray-500 pl-3">+{overdueCount} more overdue</p>
                  )}
                </div>
              )}

              {/* TODAY SECTION */}
              {topToday && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-blue-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar size={12} /> Today ({allToday.length})
                  </h4>
                  <div className={`flex items-center gap-3 p-3 rounded-xl ${taskItemBg}`}>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${topToday.priority === 'high' ? 'bg-red-500' : topToday.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                    <span className="flex-1 text-sm font-medium truncate">{topToday.text}</span>
                  </div>
                  {todayCount > 0 && (
                    <p className="text-xs text-gray-500 pl-3">+{todayCount} more today</p>
                  )}
                </div>
              )}

            </div>
          )}
        </div>

        {/* GOAL SPOTLIGHT BLOCK */}
        <div className={`p-4 sm:p-6 rounded-2xl border shadow-sm ${cardBg}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2"><Target size={20} className="text-purple-500" />Goal Spotlight</h3>
            <button onClick={() => setCurrentPage('goals')} className="text-sm text-blue-500 hover:underline">View all</button>
          </div>
          {activeGoals.length === 0 ? (
            <p className="text-gray-500 text-center py-8 text-sm">No active goals.</p>
          ) : (
            <div className="space-y-4">
              {activeGoals.map(goal => {
                const isFinancial = goal.type === 'financial'
                const progress = isFinancial ? (goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0) : goal.progressPercent
                return (
                  <div key={goal.id}>
                    <div className="flex justify-between mb-1"><span className="text-sm font-medium truncate pr-2">{goal.name}</span><span className="text-xs text-gray-500 flex-shrink-0">{Math.round(progress)}%</span></div>
                    <div className={`w-full h-2 rounded-full overflow-hidden ${progressBg}`}><div className={`h-full rounded-full ${isFinancial ? 'bg-green-500' : 'bg-purple-500'}`} style={{ width: `${progress}%` }}></div></div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <button onClick={() => setCurrentPage('finances')} className={`p-4 rounded-2xl border shadow-sm flex flex-col items-center justify-center gap-2 transition ${btnBg}`}><Plus size={24} className="text-blue-500" /><span className="text-xs sm:text-sm font-medium">Add Expense</span></button>
        <button onClick={() => setCurrentPage('tasks')} className={`p-4 rounded-2xl border shadow-sm flex flex-col items-center justify-center gap-2 transition ${btnBg}`}><CheckCircle2 size={24} className="text-green-500" /><span className="text-xs sm:text-sm font-medium">Add Task</span></button>
        <button onClick={() => setCurrentPage('goals')} className={`p-4 rounded-2xl border shadow-sm flex flex-col items-center justify-center gap-2 transition ${btnBg}`}><Target size={24} className="text-purple-500" /><span className="text-xs sm:text-sm font-medium">Add Goal</span></button>
        <button onClick={() => setCurrentPage('reports')} className={`p-4 rounded-2xl border shadow-sm flex flex-col items-center justify-center gap-2 transition ${btnBg}`}><TrendingUp size={24} className="text-orange-500" /><span className="text-xs sm:text-sm font-medium">View Reports</span></button>
      </div>
    </div>
  )
}