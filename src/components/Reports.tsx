import { useState, useEffect } from 'react'
import { CheckCircle2, TrendingUp, Target, Wallet, Award, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface ReportsProps {
  isDark: boolean
  isSidebarCollapsed: boolean
}

const isInTimeframe = (dateString: string, timeframe: 'all' | 'month' | 'year') => {
  if (timeframe === 'all') return true;
  const date = new Date(dateString);
  const now = new Date();
  if (timeframe === 'month') return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  if (timeframe === 'year') return date.getFullYear() === now.getFullYear();
  return true;
};

const formatMoney = (num: number) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(num);

export default function Reports({ isDark, isSidebarCollapsed }: ReportsProps) {
  const [timeframe, setTimeframe] = useState<'all' | 'month' | 'year'>('month');
  const [tasks, setTasks] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [debts, setDebts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAllData() }, [])

  const fetchAllData = async () => {
    setLoading(true)
    const [tasksRes, transRes, goalsRes, debtsRes] = await Promise.all([
      supabase.from('tasks').select('*'),
      supabase.from('transactions').select('*'),
      supabase.from('goals').select('*'),
      supabase.from('debts').select('*')
    ])
    
    if (tasksRes.data) setTasks(tasksRes.data)
    if (transRes.data) setTransactions(transRes.data.map(t => ({ ...t, amount: Number(t.amount) })))
    
    // FIX: Make sure to map type and progressPercent so the calculation works
    if (goalsRes.data) {
      setGoals(goalsRes.data.map(g => ({ 
        ...g, 
        type: g.type || 'financial', 
        targetAmount: Number(g.target_amount), 
        currentAmount: Number(g.current_amount), 
        progressPercent: Number(g.progress_percent) || 0 
      })))
    }
    
    if (debtsRes.data) setDebts(debtsRes.data.map(d => ({ ...d, totalAmount: Number(d.total_amount), paidAmount: Number(d.paid_amount) })))
    setLoading(false)
  }

  const filteredTransactions = transactions.filter(t => isInTimeframe(t.created_at, timeframe));
  const income = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
  const expenses = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
  const savings = income - expenses;

  const filteredTasks = tasks.filter(t => isInTimeframe(t.created_at, timeframe));
  const completedTasks = filteredTasks.filter(t => t.completed).length;
  const totalTasks = filteredTasks.length;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const completedGoals = goals.filter(g => g.completed).length;
  const totalGoals = goals.length;
  
  // FIX: Calculate progress safely based on goal type to prevent NaN%
  const totalGoalProgress = goals.length > 0 
    ? Math.round(
        goals.reduce((sum, g) => {
          if (g.type === 'financial' && Number(g.targetAmount) > 0) {
            return sum + (Number(g.currentAmount) / Number(g.targetAmount)) * 100;
          }
          if (g.type === 'personal') {
            return sum + Number(g.progressPercent || 0);
          }
          return sum;
        }, 0) / goals.length
      ) 
    : 0;

  const totalDebtPaid = debts.reduce((sum, d) => sum + Number(d.paidAmount), 0);
  const totalDebtOwed = debts.reduce((sum, d) => sum + Number(d.totalAmount), 0);
  const debtPayoffRate = totalDebtOwed > 0 ? Math.round((totalDebtPaid / totalDebtOwed) * 100) : 0;

  const cardBg = isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200';
  const filterContainer = isDark ? 'bg-gray-800' : 'bg-gray-100';
  const filterBtn = (active: boolean) => active ? (isDark ? 'bg-gray-700 text-white' : 'bg-white text-gray-900 shadow-sm') : (isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900');
  const progressBg = isDark ? 'bg-gray-700' : 'bg-gray-200';

  return (
    <div className={`w-full space-y-6 sm:space-y-8 transition-all duration-300 mx-auto px-4 sm:px-0 ${isSidebarCollapsed ? 'max-w-6xl' : 'max-w-4xl'}`}>
      
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h2 className="text-xl sm:text-2xl font-bold">Overview</h2>
        <div className={`flex gap-1 p-1 rounded-xl w-full sm:w-fit ${filterContainer}`}>
          {(['month', 'year', 'all'] as const).map(f => (
            <button key={f} onClick={() => setTimeframe(f)} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium capitalize transition ${filterBtn(timeframe === f)}`}>
              {f === 'all' ? 'All Time' : `This ${f}`}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-center text-gray-500 py-12">Loading your reports from the cloud...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={`p-4 sm:p-5 rounded-2xl border shadow-sm ${cardBg} transition-colors`}>
              <div className="flex items-center gap-2 mb-2"><TrendingUp size={18} className="text-green-500" /><p className="text-sm text-gray-500 font-medium">Income</p></div>
              <p className="text-xl sm:text-2xl font-bold text-green-500">{formatMoney(income)}</p>
            </div>
            <div className={`p-4 sm:p-5 rounded-2xl border shadow-sm ${cardBg} transition-colors`}>
              <div className="flex items-center gap-2 mb-2"><TrendingUp size={18} className="text-red-500 rotate-180" /><p className="text-sm text-gray-500 font-medium">Expenses</p></div>
              <p className="text-xl sm:text-2xl font-bold text-red-500">{formatMoney(expenses)}</p>
            </div>
            <div className={`p-4 sm:p-5 rounded-2xl border shadow-sm ${cardBg} transition-colors`}>
              <div className="flex items-center gap-2 mb-2"><Wallet size={18} className="text-blue-500" /><p className="text-sm text-gray-500 font-medium">Net Savings</p></div>
              <p className={`text-xl sm:text-2xl font-bold ${savings >= 0 ? 'text-blue-500' : 'text-red-500'}`}>{formatMoney(savings)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={`p-4 sm:p-6 rounded-2xl border shadow-sm ${cardBg} transition-colors`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2"><CheckCircle2 size={20} className="text-blue-500" />Task Productivity</h3>
                <span className="text-xl sm:text-2xl font-bold text-blue-500">{taskCompletionRate}%</span>
              </div>
              <div className="space-y-4">
                <div className={`w-full h-3 rounded-full overflow-hidden ${progressBg}`}>
                  <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${taskCompletionRate}%` }}></div>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>{completedTasks} completed</span>
                  <span>{totalTasks - completedTasks} pending</span>
                </div>
                <p className="text-xs text-gray-400 flex items-center gap-1"><Clock size={12} /> Based on tasks created {timeframe === 'all' ? 'ever' : `this ${timeframe}`}</p>
              </div>
            </div>

            <div className={`p-4 sm:p-6 rounded-2xl border shadow-sm ${cardBg} transition-colors`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2"><Target size={20} className="text-purple-500" />Savings Goals</h3>
                <span className="text-sm font-medium text-purple-500">{completedGoals} / {totalGoals} Completed</span>
              </div>
              <div className="space-y-4">
                <div className={`w-full h-3 rounded-full overflow-hidden ${progressBg}`}>
                  <div className="h-full rounded-full bg-purple-500 transition-all duration-500" style={{ width: `${totalGoalProgress}%` }}></div>
                </div>
                <p className="text-sm text-gray-500">Overall goal completion: <span className="font-semibold text-purple-500">{totalGoalProgress}%</span></p>
              </div>
            </div>

            <div className={`p-4 sm:p-6 rounded-2xl border shadow-sm ${cardBg} transition-colors`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2"><Wallet size={20} className="text-orange-500" />Debt Payoff</h3>
                <span className="text-sm font-medium text-orange-500">{formatMoney(totalDebtPaid)} paid</span>
              </div>
              <div className="space-y-4">
                <div className={`w-full h-3 rounded-full overflow-hidden ${progressBg}`}>
                  <div className="h-full rounded-full bg-orange-500 transition-all duration-500" style={{ width: `${debtPayoffRate}%` }}></div>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>{formatMoney(totalDebtOwed)} total owed</span>
                  <span className="font-semibold text-orange-500">{debtPayoffRate}% paid off</span>
                </div>
              </div>
            </div>

            <div className={`p-4 sm:p-6 rounded-2xl border shadow-sm ${cardBg} transition-colors flex flex-col justify-center items-center text-center`}>
              <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mb-4">
                <Award size={32} className="text-yellow-500" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Keep it up!</h3>
              <p className="text-sm text-gray-500 max-w-[250px]">
                You've completed <span className="font-bold text-gray-900 dark:text-white">{completedTasks}</span> tasks and saved <span className="font-bold text-gray-900 dark:text-white">{formatMoney(savings)}</span> {timeframe === 'all' ? 'in total' : `this ${timeframe}`}.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}