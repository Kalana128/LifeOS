import { useState, useEffect } from 'react'
import { Plus, Trash2, Pencil, Wallet, Star } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Goal {
  id: number
  name: string
  type: 'financial' | 'personal'
  targetAmount: number
  currentAmount: number
  monthlyContribution: number
  progressPercent: number
  targetDate: string | null
  createdAt: string
  completed: boolean
}

interface GoalsProps {
  isDark: boolean
  isSidebarCollapsed: boolean
}

export default function Goals({ isDark, isSidebarCollapsed }: GoalsProps) {
  // 1. State
  const [goals, setGoals] = useState<Goal[]>([])
  const [goalType, setGoalType] = useState<'financial' | 'personal'>('financial')
  const [name, setName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [monthlyContribution, setMonthlyContribution] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [initialProgress, setInitialProgress] = useState('0')
  const [fundInputs, setFundInputs] = useState<{[key: number]: string}>({})
  const [progressInputs, setProgressInputs] = useState<{[key: number]: number}>({})
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editType, setEditType] = useState<'financial' | 'personal'>('financial')
  const [editTarget, setEditTarget] = useState('')
  const [editMonthly, setEditMonthly] = useState('')
  const [editTargetDate, setEditTargetDate] = useState('')
  const [editProgress, setEditProgress] = useState('0')
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchGoals() }, [])

  const fetchGoals = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('goals').select('*').order('created_at', { ascending: false })
    if (error) console.error('Error fetching goals:', error)
    else if (data) {
      const mappedData = data.map(g => ({ 
        id: g.id, name: g.name, type: g.type || 'financial', targetAmount: Number(g.target_amount), 
        currentAmount: Number(g.current_amount), monthlyContribution: Number(g.monthly_contribution),
        progressPercent: Number(g.progress_percent) || 0, targetDate: g.target_date, completed: g.completed, createdAt: g.created_at
      }))
      setGoals(mappedData)
    }
    setLoading(false)
  }

  const totalGoals = goals.length
  const completedGoals = goals.filter(g => g.completed).length
  const totalSaved = goals.filter(g => g.type === 'financial').reduce((sum, g) => sum + Number(g.currentAmount), 0)

  const addGoal = async () => {
    if (!name.trim()) return
    const isFinancial = goalType === 'financial'
    const parsedTarget = isFinancial ? parseFloat(targetAmount) : 0
    const parsedMonthly = isFinancial ? parseFloat(monthlyContribution) : 0
    const parsedProgress = !isFinancial ? parseFloat(initialProgress) : 0
    if (isFinancial && (isNaN(parsedTarget) || parsedTarget <= 0)) return

    const newGoal = { name, type: goalType, target_amount: parsedTarget, current_amount: 0, monthly_contribution: isNaN(parsedMonthly) ? 0 : parsedMonthly, progress_percent: parsedProgress, target_date: !isFinancial && targetDate ? new Date(targetDate).toISOString() : null, completed: parsedProgress >= 100, created_at: new Date().toISOString() }
    const { data, error } = await supabase.from('goals').insert([newGoal]).select()
    if (error) console.error('Error adding goal:', error)
    else if (data) {
      const mappedData = data.map(g => ({ id: g.id, name: g.name, type: g.type || 'financial', targetAmount: Number(g.target_amount), currentAmount: Number(g.current_amount), monthlyContribution: Number(g.monthly_contribution), progressPercent: Number(g.progress_percent) || 0, targetDate: g.target_date, completed: g.completed, createdAt: g.created_at }))
      setGoals([...mappedData, ...goals])
      setName(''); setTargetAmount(''); setMonthlyContribution(''); setTargetDate(''); setInitialProgress('0')
    }
  }

  const addFunds = async (id: number) => {
    const amount = parseFloat(fundInputs[id] || '')
    if (isNaN(amount) || amount <= 0) return
    const goalToUpdate = goals.find(g => g.id === id)
    if (!goalToUpdate) return
    const newAmount = Math.min(goalToUpdate.currentAmount + amount, goalToUpdate.targetAmount)
    const isCompleted = newAmount >= goalToUpdate.targetAmount
    const { error } = await supabase.from('goals').update({ current_amount: newAmount, completed: isCompleted }).eq('id', id)
    if (error) console.error('Error adding funds:', error)
    else { setGoals(goals.map(goal => goal.id === id ? { ...goal, currentAmount: newAmount, completed: isCompleted } : goal)); setFundInputs({ ...fundInputs, [id]: '' }) }
  }

  const updateProgress = async (id: number) => {
    const percent = progressInputs[id]
    if (percent === undefined || percent < 0 || percent > 100) return
    const isCompleted = percent >= 100
    const { error } = await supabase.from('goals').update({ progress_percent: percent, completed: isCompleted }).eq('id', id)
    if (error) console.error('Error updating progress:', error)
    else { setGoals(goals.map(goal => goal.id === id ? { ...goal, progressPercent: percent, completed: isCompleted } : goal)) }
  }

  const deleteGoal = async (id: number) => {
    const { error } = await supabase.from('goals').delete().eq('id', id)
    if (error) console.error('Error deleting goal:', error)
    else setGoals(goals.filter(g => g.id !== id))
  }

  const startEdit = (goal: Goal) => { setEditingId(goal.id); setEditName(goal.name); setEditType(goal.type); setEditTarget(String(goal.targetAmount)); setEditMonthly(String(goal.monthlyContribution)); setEditTargetDate(goal.targetDate ? new Date(goal.targetDate).toISOString().split('T')[0] : ''); setEditProgress(String(goal.progressPercent)) }
  
  const saveEdit = async (id: number) => {
    if (!editName.trim()) return
    const isFinancial = editType === 'financial'
    const parsedTarget = isFinancial ? parseFloat(editTarget) : 0
    const parsedMonthly = isFinancial ? parseFloat(editMonthly) : 0
    const parsedProgress = !isFinancial ? parseFloat(editProgress) : 0
    if (isFinancial && (isNaN(parsedTarget) || parsedTarget <= 0)) return
    const { error } = await supabase.from('goals').update({ name: editName.trim(), type: editType, target_amount: parsedTarget, monthly_contribution: isNaN(parsedMonthly) ? 0 : parsedMonthly, progress_percent: parsedProgress, target_date: !isFinancial && editTargetDate ? new Date(editTargetDate).toISOString() : null }).eq('id', id)
    if (error) console.error('Error saving edit:', error)
    else {
      setGoals(goals.map(goal => {
        if (goal.id === id) {
          const isCompleted = isFinancial ? goal.currentAmount >= parsedTarget : parsedProgress >= 100
          return { ...goal, name: editName.trim(), type: editType, targetAmount: parsedTarget, monthlyContribution: isNaN(parsedMonthly) ? 0 : parsedMonthly, progressPercent: parsedProgress, targetDate: !isFinancial && editTargetDate ? new Date(editTargetDate).toISOString() : null, completed: isCompleted }
        }
        return goal
      }))
      setEditingId(null)
    }
  }

  const cancelEdit = () => { setEditingId(null) }
  const formatMoney = (num: number) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(num)
  const getFinancialProgressPercent = (goal: Goal) => goal.targetAmount === 0 ? 0 : Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)

  const cardBg = isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
  const inputBg = isDark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
  const rowBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-100'
  const progressBg = isDark ? 'bg-gray-700' : 'bg-gray-200'
  const typeBtn = (active: boolean) => active ? (isDark ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white shadow-sm') : (isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900')

  return (
    // RESPONSIVE WRAPPER: Centers content, adjusts padding for mobile, and expands based on sidebar
    <div className={`w-full space-y-6 sm:space-y-8 transition-all duration-300 mx-auto px-4 sm:px-0 ${isSidebarCollapsed ? 'max-w-6xl' : 'max-w-4xl'}`}>
      
      {/* SUMMARY CARDS - 1 col mobile, 3 cols desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-4 sm:p-5 rounded-2xl border shadow-sm ${cardBg} transition-colors`}>
          <div className="flex items-center gap-2 mb-1"><Star size={16} className="text-purple-500" /><p className="text-sm text-gray-500">Total Goals</p></div>
          <p className="text-xl sm:text-2xl font-bold text-purple-500">{totalGoals}</p>
        </div>
        <div className={`p-4 sm:p-5 rounded-2xl border shadow-sm ${cardBg} transition-colors`}>
          <p className="text-sm text-gray-500 mb-1">Total Saved (Financial)</p>
          <p className="text-xl sm:text-2xl font-bold text-green-500">{formatMoney(totalSaved)}</p>
        </div>
        <div className={`p-4 sm:p-5 rounded-2xl border shadow-sm ${cardBg} transition-colors`}>
          <p className="text-sm text-gray-500 mb-1">Completed</p>
          <p className="text-xl sm:text-2xl font-bold text-blue-500">{completedGoals} / {totalGoals}</p>
        </div>
      </div>

      {/* ADD GOAL FORM */}
      <div className={`p-4 sm:p-6 rounded-2xl border shadow-sm ${cardBg} transition-colors`}>
        <h3 className="text-base sm:text-lg font-semibold mb-4">Add New Goal</h3>
        
        {/* Toggle stretches on mobile for easy tapping */}
        <div className={`flex gap-1 mb-4 p-1 rounded-xl w-full sm:w-fit ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
          <button onClick={() => setGoalType('financial')} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 ${typeBtn(goalType === 'financial')}`}><Wallet size={16} /> Financial</button>
          <button onClick={() => setGoalType('personal')} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 ${typeBtn(goalType === 'personal')}`}><Star size={16} /> Personal</button>
        </div>

        {/* Inputs stack on mobile, side-by-side on desktop */}
        <div className="flex flex-col md:flex-row gap-3">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={goalType === 'financial' ? "Goal name (e.g. New iPhone)" : "Goal name (e.g. Learn React)"} className={`flex-1 px-4 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
          {goalType === 'financial' ? (
            <>
              <input type="number" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} placeholder="Target Amount" className={`w-full md:w-40 px-4 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
              <input type="number" value={monthlyContribution} onChange={(e) => setMonthlyContribution(e.target.value)} placeholder="Monthly (opt)" className={`w-full md:w-40 px-4 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
            </>
          ) : (
            <>
              <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className={`w-full md:w-40 px-4 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
              <div className="flex items-center gap-2 w-full md:w-40">
                <input type="number" min="0" max="100" value={initialProgress} onChange={(e) => setInitialProgress(e.target.value)} placeholder="0" className={`w-20 px-4 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
                <span className="text-gray-500 text-sm">% done</span>
              </div>
            </>
          )}
          <button onClick={addGoal} className="w-full md:w-auto px-6 py-2 rounded-xl font-medium transition bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"><Plus size={18} /> Add</button>
        </div>
      </div>

      {/* GOALS LIST */}
      <div className="space-y-4">
        {loading ? (
          <p className="text-center text-gray-500 py-8">Loading goals from the cloud...</p>
        ) : goals.length === 0 ? (
          <div className={`p-8 rounded-2xl border shadow-sm text-center ${cardBg} transition-colors`}><p className="text-gray-500">No goals yet. Add one above to start!</p></div>
        ) : (
          goals.map(goal => {
            const isFinancial = goal.type === 'financial'
            const progress = isFinancial ? getFinancialProgressPercent(goal) : goal.progressPercent
            const remaining = isFinancial ? goal.targetAmount - goal.currentAmount : 100 - goal.progressPercent
            return (
              <div key={goal.id} className={`p-4 sm:p-5 rounded-2xl border shadow-sm ${rowBg} transition-colors`}>
                {editingId === goal.id ? (
                  <div className="space-y-3">
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className={`w-full px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
                    <div className={`flex gap-1 p-1 rounded-xl w-fit ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                      <button onClick={() => setEditType('financial')} className={`px-3 py-1 rounded-lg text-xs font-medium ${typeBtn(editType === 'financial')}`}>Financial</button>
                      <button onClick={() => setEditType('personal')} className={`px-3 py-1 rounded-lg text-xs font-medium ${typeBtn(editType === 'personal')}`}>Personal</button>
                    </div>
                    {editType === 'financial' ? (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input type="number" value={editTarget} onChange={(e) => setEditTarget(e.target.value)} placeholder="Target Amount" className={`flex-1 px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
                        <input type="number" value={editMonthly} onChange={(e) => setEditMonthly(e.target.value)} placeholder="Monthly" className={`flex-1 px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input type="date" value={editTargetDate} onChange={(e) => setEditTargetDate(e.target.value)} className={`flex-1 px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
                        <input type="number" min="0" max="100" value={editProgress} onChange={(e) => setEditProgress(e.target.value)} placeholder="Progress %" className={`w-full sm:w-24 px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(goal.id)} className="px-4 py-2 text-sm rounded-lg font-medium transition bg-green-600 hover:bg-green-700 text-white">Save</button>
                      <button onClick={cancelEdit} className="px-4 py-2 text-sm rounded-lg font-medium transition bg-gray-500 hover:bg-gray-600 text-white">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Header & Actions - Stacks on mobile, side-by-side on desktop */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                          {isFinancial ? <Wallet size={18} className="text-green-500 flex-shrink-0" /> : <Star size={18} className="text-purple-500 flex-shrink-0" />}
                          <span className="truncate">{goal.name}</span>
                          {goal.completed && <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full flex-shrink-0">COMPLETED</span>}
                        </h4>
                        <p className="text-sm text-gray-500 mt-1 truncate">
                          {isFinancial ? `${formatMoney(goal.currentAmount)} saved of ${formatMoney(goal.targetAmount)}${goal.monthlyContribution > 0 && !goal.completed ? ` • ${formatMoney(goal.monthlyContribution)}/month` : ''}` : `${goal.progressPercent}% completed${goal.targetDate ? ` • Target: ${new Date(goal.targetDate).toLocaleDateString()}` : ''}`}
                        </p>
                      </div>
                      
                      {/* Actions wrap nicely on mobile */}
                      <div className="flex flex-wrap items-center gap-3">
                        {!goal.completed && (
                          isFinancial ? (
                            <>
                              <input type="number" value={fundInputs[goal.id] || ''} onChange={(e) => setFundInputs({ ...fundInputs, [goal.id]: e.target.value })} placeholder="Add funds" className={`w-full sm:w-28 px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
                              <button onClick={() => addFunds(goal.id)} className="w-full sm:w-auto px-4 py-2 text-sm rounded-lg font-medium transition bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2"><Plus size={16} /> Add</button>
                            </>
                          ) : (
                            <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                              <input type="range" min="0" max="100" value={progressInputs[goal.id] !== undefined ? progressInputs[goal.id] : goal.progressPercent} onChange={(e) => setProgressInputs({ ...progressInputs, [goal.id]: Number(e.target.value) })} className="w-full sm:w-32 accent-blue-500" />
                              <button onClick={() => updateProgress(goal.id)} className="w-full sm:w-auto px-4 py-2 text-sm rounded-lg font-medium transition bg-purple-600 hover:bg-purple-700 text-white">Update</button>
                            </div>
                          )
                        )}
                        <div className="flex gap-1 ml-auto md:ml-0">
                          <button onClick={() => startEdit(goal)} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition" title="Edit"><Pencil size={18} /></button>
                          <button onClick={() => deleteGoal(goal.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition" title="Delete"><Trash2 size={18} /></button>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className={`w-full h-3 rounded-full overflow-hidden ${progressBg}`}>
                      <div className={`h-full rounded-full transition-all duration-500 ${goal.completed ? 'bg-green-500' : (isFinancial ? 'bg-green-500' : 'bg-purple-500')}`} style={{ width: `${progress}%` }}></div>
                    </div>
                    <div className="flex justify-between mt-2">
                      <p className="text-xs text-gray-500">{isFinancial ? (remaining > 0 ? `${formatMoney(remaining)} remaining` : 'Goal reached!') : (remaining > 0 ? `${remaining}% left to go` : 'Goal reached!')}</p>
                      <p className="text-xs text-gray-500 font-medium">{progress.toFixed(1)}%</p>
                    </div>
                  </>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}