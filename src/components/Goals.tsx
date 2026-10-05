import { useState, useEffect } from 'react'
import { Plus, Trash2, Pencil, Wallet, Star, Heart, Briefcase, BookOpen, Check, ListChecks } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Modal from './Modal'

interface Goal {
  id: number
  name: string
  type: 'financial' | 'personal'
  category: string
  targetAmount: number
  currentAmount: number
  monthlyContribution: number
  progressPercent: number
  targetDate: string | null
  createdAt: string
  completed: boolean
}

interface Milestone {
  id: number
  goal_id: number
  title: string
  completed: boolean
  created_at: string
}

interface GoalsProps {
  isDark: boolean
  isSidebarCollapsed: boolean
}

const formatInputNumber = (val: string) => {
  const raw = val.replace(/[^0-9]/g, '');
  if (raw === '') return '';
  return parseInt(raw, 10).toLocaleString('en-US');
};

const getCategoryConfig = (category: string) => {
  const cat = category?.toLowerCase();
  switch(cat) {
    case 'financial': return { icon: Wallet, color: 'text-green-500', badge: 'bg-green-500/10 text-green-500' };
    case 'health': return { icon: Heart, color: 'text-red-500', badge: 'bg-red-500/10 text-red-500' };
    case 'career': return { icon: Briefcase, color: 'text-blue-500', badge: 'bg-blue-500/10 text-blue-500' };
    case 'learning': return { icon: BookOpen, color: 'text-orange-500', badge: 'bg-orange-500/10 text-orange-500' };
    case 'personal': 
    default: return { icon: Star, color: 'text-purple-500', badge: 'bg-purple-500/10 text-purple-500' };
  }
};

export default function Goals({ isDark, isSidebarCollapsed }: GoalsProps) {
  const [goals, setGoals] = useState<Goal[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [category, setCategory] = useState<string>('Financial')
  const [name, setName] = useState('')
  
  const [targetAmount, setTargetAmount] = useState('')
  const [formattedTargetAmount, setFormattedTargetAmount] = useState('')
  
  const [monthlyContribution, setMonthlyContribution] = useState('')
  const [formattedMonthlyContribution, setFormattedMonthlyContribution] = useState('')
  
  const [targetDate, setTargetDate] = useState('')
  const [initialProgress, setInitialProgress] = useState('0')
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  const [fundInputs, setFundInputs] = useState<{[key: number]: string}>({})
  const [progressInputs, setProgressInputs] = useState<{[key: number]: number}>({})
  
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editCategory, setEditCategory] = useState<string>('Financial')
  const [editTarget, setEditTarget] = useState('')
  const [formattedEditTarget, setFormattedEditTarget] = useState('')
  const [editMonthly, setEditMonthly] = useState('')
  const [formattedEditMonthly, setFormattedEditMonthly] = useState('')
  const [editTargetDate, setEditTargetDate] = useState('')
  const [editProgress, setEditProgress] = useState('0')
  
  const [expandedGoals, setExpandedGoals] = useState<Set<number>>(new Set())
  const [newMilestoneText, setNewMilestoneText] = useState<{[key: number]: string}>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchGoals() }, [])

  const fetchGoals = async () => {
    setLoading(true)
    const [goalsRes, milestonesRes] = await Promise.all([
      supabase.from('goals').select('*').order('created_at', { ascending: false }),
      supabase.from('goal_milestones').select('*')
    ])
    
    if (goalsRes.error) console.error('Error fetching goals:', goalsRes.error)
    else if (goalsRes.data) {
      const mappedData = goalsRes.data.map(g => ({ 
        id: g.id, 
        name: g.name, 
        type: g.type || 'financial', 
        category: g.category || 'Personal',
        targetAmount: Number(g.target_amount), 
        currentAmount: Number(g.current_amount), 
        monthlyContribution: Number(g.monthly_contribution),
        progressPercent: Number(g.progress_percent) || 0, 
        targetDate: g.target_date, 
        completed: g.completed, 
        createdAt: g.created_at
      }))
      setGoals(mappedData)
    }
    
    if (milestonesRes.error) console.error('Error fetching milestones:', milestonesRes.error)
    else if (milestonesRes.data) {
      setMilestones(milestonesRes.data)
    }
    
    setLoading(false)
  }

  // MOVED UP: Helper function defined BEFORE it's used
  const getFinancialProgressPercent = (goal: Goal) => goal.targetAmount === 0 ? 0 : Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)
  
  const getGoalProgress = (goal: Goal) => {
    const goalMilestones = milestones.filter(m => m.goal_id === goal.id)
    if (goalMilestones.length > 0) {
      const completedCount = goalMilestones.filter(m => m.completed).length
      return (completedCount / goalMilestones.length) * 100
    }
    return goal.type === 'financial' ? getFinancialProgressPercent(goal) : goal.progressPercent
  }

  const totalGoals = goals.length
  const completedGoals = goals.filter(g => getGoalProgress(g) >= 100 || g.completed).length
  const totalSaved = goals.filter(g => g.category === 'Financial').reduce((sum, g) => sum + Number(g.currentAmount), 0)

  const addGoal = async () => {
    if (!name.trim()) return
    const isFinancial = category === 'Financial'
    const parsedTarget = isFinancial ? parseFloat(targetAmount) : 0
    const parsedMonthly = isFinancial ? parseFloat(monthlyContribution) : 0
    const parsedProgress = !isFinancial ? parseFloat(initialProgress) : 0
    if (isFinancial && (isNaN(parsedTarget) || parsedTarget <= 0)) return

    const newGoal = { 
      name, 
      type: isFinancial ? 'financial' : 'personal', 
      category,
      target_amount: parsedTarget, 
      current_amount: 0, 
      monthly_contribution: isNaN(parsedMonthly) ? 0 : parsedMonthly, 
      progress_percent: parsedProgress, 
      target_date: !isFinancial && targetDate ? new Date(targetDate).toISOString() : null, 
      completed: parsedProgress >= 100, 
      created_at: new Date().toISOString() 
    }
    
    const { data, error } = await supabase.from('goals').insert([newGoal]).select()
    if (error) console.error('Error adding goal:', error)
    else if (data) {
      const mappedData = data.map(g => ({ 
        id: g.id, name: g.name, type: g.type || 'financial', category: g.category || 'Personal',
        targetAmount: Number(g.target_amount), currentAmount: Number(g.current_amount), 
        monthlyContribution: Number(g.monthly_contribution), progressPercent: Number(g.progress_percent) || 0, 
        targetDate: g.target_date, completed: g.completed, createdAt: g.created_at 
      }))
      setGoals([...mappedData, ...goals])
      setName(''); setTargetAmount(''); setFormattedTargetAmount(''); setMonthlyContribution(''); setFormattedMonthlyContribution(''); setTargetDate(''); setInitialProgress('0')
      setIsModalOpen(false)
    }
  }

  const addFunds = async (id: number) => {
    const amount = parseFloat(fundInputs[id] || '')
    if (isNaN(amount) || amount <= 0) return
    const goalToUpdate = goals.find(g => g.id === id)
    if (!goalToUpdate) return
    const newAmount = Math.min(goalToUpdate.currentAmount + amount, goalToUpdate.targetAmount)
    const { error } = await supabase.from('goals').update({ current_amount: newAmount }).eq('id', id)
    if (error) console.error('Error adding funds:', error)
    else { 
      setGoals(goals.map(goal => goal.id === id ? { ...goal, currentAmount: newAmount } : goal))
      setFundInputs({ ...fundInputs, [id]: '' }) 
    }
  }

  const updateProgress = async (id: number) => {
    const percent = progressInputs[id]
    if (percent === undefined || percent < 0 || percent > 100) return
    const { error } = await supabase.from('goals').update({ progress_percent: percent }).eq('id', id)
    if (error) console.error('Error updating progress:', error)
    else { setGoals(goals.map(goal => goal.id === id ? { ...goal, progressPercent: percent } : goal)) }
  }

  const deleteGoal = async (id: number) => {
    if (!confirm('Delete this goal and all its milestones?')) return
    const { error } = await supabase.from('goals').delete().eq('id', id)
    if (error) console.error('Error deleting goal:', error)
    else {
      setGoals(goals.filter(g => g.id !== id))
      setMilestones(milestones.filter(m => m.goal_id !== id))
    }
  }

  const startEdit = (goal: Goal) => { 
    setEditingId(goal.id)
    setEditName(goal.name)
    setEditCategory(goal.category || 'Personal')
    setEditTarget(String(goal.targetAmount))
    setFormattedEditTarget(Number(goal.targetAmount).toLocaleString('en-US'))
    setEditMonthly(String(goal.monthlyContribution))
    setFormattedEditMonthly(Number(goal.monthlyContribution).toLocaleString('en-US'))
    setEditTargetDate(goal.targetDate ? new Date(goal.targetDate).toISOString().split('T')[0] : '')
    setEditProgress(String(goal.progressPercent))
  }
  
  const saveEdit = async (id: number) => {
    if (!editName.trim()) return
    const isFinancial = editCategory === 'Financial'
    const parsedTarget = isFinancial ? parseFloat(editTarget) : 0
    const parsedMonthly = isFinancial ? parseFloat(editMonthly) : 0
    const parsedProgress = !isFinancial ? parseFloat(editProgress) : 0
    if (isFinancial && (isNaN(parsedTarget) || parsedTarget <= 0)) return
    
    const { error } = await supabase.from('goals').update({ 
      name: editName.trim(), 
      type: isFinancial ? 'financial' : 'personal',
      category: editCategory,
      target_amount: parsedTarget, 
      monthly_contribution: isNaN(parsedMonthly) ? 0 : parsedMonthly, 
      progress_percent: parsedProgress, 
      target_date: !isFinancial && editTargetDate ? new Date(editTargetDate).toISOString() : null 
    }).eq('id', id)
    
    if (error) console.error('Error saving edit:', error)
    else {
      setGoals(goals.map(goal => {
        if (goal.id === id) {
          return { 
            ...goal, 
            name: editName.trim(), 
            type: isFinancial ? 'financial' : 'personal', 
            category: editCategory,
            targetAmount: parsedTarget, 
            monthlyContribution: isNaN(parsedMonthly) ? 0 : parsedMonthly, 
            progressPercent: parsedProgress, 
            targetDate: !isFinancial && editTargetDate ? new Date(editTargetDate).toISOString() : null
          }
        }
        return goal
      }))
      setEditingId(null)
    }
  }

  const toggleGoalExpand = (id: number) => {
    const newExpanded = new Set(expandedGoals)
    if (newExpanded.has(id)) newExpanded.delete(id)
    else newExpanded.add(id)
    setExpandedGoals(newExpanded)
  }

  const addMilestone = async (goalId: number) => {
    const text = newMilestoneText[goalId]?.trim()
    if (!text) return
    
    const { data, error } = await supabase.from('goal_milestones').insert([{
      goal_id: goalId,
      title: text,
      completed: false
    }]).select()
    
    if (error) console.error('Error adding milestone:', error)
    else if (data) {
      setMilestones([...milestones, data[0]])
      setNewMilestoneText({ ...newMilestoneText, [goalId]: '' })
    }
  }

  const toggleMilestone = async (milestoneId: number, currentCompleted: boolean) => {
    const { error } = await supabase.from('goal_milestones').update({ completed: !currentCompleted }).eq('id', milestoneId)
    if (!error) {
      setMilestones(milestones.map(m => m.id === milestoneId ? { ...m, completed: !currentCompleted } : m))
    }
  }

  const deleteMilestone = async (milestoneId: number) => {
    const { error } = await supabase.from('goal_milestones').delete().eq('id', milestoneId)
    if (!error) {
      setMilestones(milestones.filter(m => m.id !== milestoneId))
    }
  }

  const formatMoney = (num: number) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(num)
  
  const cardBg = isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
  const inputBg = isDark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
  const rowBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-100'
  const progressBg = isDark ? 'bg-gray-700' : 'bg-gray-200'

  return (
    <div className={`w-full space-y-6 sm:space-y-8 transition-all duration-300 mx-auto px-4 sm:px-0 relative ${isSidebarCollapsed ? 'max-w-6xl' : 'max-w-4xl'}`}>
      
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

      <div className="flex items-center justify-between">
        <h3 className="text-base sm:text-lg font-semibold">Your Goals</h3>
        <button onClick={() => setIsModalOpen(true)} className="hidden lg:flex px-4 py-2 rounded-xl font-medium transition bg-blue-600 hover:bg-blue-700 text-white items-center gap-2 active:scale-95">
          <Plus size={18} /> New Goal
        </button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <p className="text-center text-gray-500 py-8">Loading goals from the cloud...</p>
        ) : goals.length === 0 ? (
          <div className={`p-8 rounded-2xl border shadow-sm text-center ${cardBg} transition-colors`}><p className="text-gray-500">No goals yet. Tap + to add one!</p></div>
        ) : (
          goals.map(goal => {
            const config = getCategoryConfig(goal.category || 'Personal')
            const Icon = config.icon
            const progress = getGoalProgress(goal)
            const isFinancial = goal.category === 'Financial'
            const remaining = isFinancial ? goal.targetAmount - goal.currentAmount : 100 - progress
            
            return (
              <div key={goal.id} className={`rounded-2xl border shadow-sm ${rowBg} transition-colors overflow-hidden`}>
                <div 
                  onClick={() => toggleGoalExpand(goal.id)} 
                  className={`p-4 sm:p-5 cursor-pointer transition-colors ${isDark ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base sm:text-lg font-semibold flex items-center gap-2 flex-wrap">
                        <Icon size={18} className={`${config.color} flex-shrink-0`} />
                        <span className="truncate">{goal.name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase flex-shrink-0 ${config.badge}`}>
                          {goal.category || 'Personal'}
                        </span>
                        {progress >= 100 && <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full flex-shrink-0">COMPLETED</span>}
                      </h4>
                      <p className="text-sm text-gray-500 mt-1 truncate">
                        {isFinancial 
                          ? `${formatMoney(goal.currentAmount)} saved of ${formatMoney(goal.targetAmount)}${goal.monthlyContribution > 0 && progress < 100 ? ` • ${formatMoney(goal.monthlyContribution)}/month` : ''}` 
                          : `${progress.toFixed(1)}% completed${goal.targetDate ? ` • Target: ${new Date(goal.targetDate).toLocaleDateString()}` : ''}`
                        }
                      </p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3" onClick={(e) => e.stopPropagation()}>
                      {!goal.completed && progress < 100 && (
                        isFinancial ? (
                          <>
                            <input type="number" value={fundInputs[goal.id] || ''} onChange={(e) => setFundInputs({ ...fundInputs, [goal.id]: e.target.value })} placeholder="Add funds" className={`w-full sm:w-28 px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
                            <button onClick={() => addFunds(goal.id)} className="w-full sm:w-auto px-4 py-2 text-sm rounded-lg font-medium transition bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2 active:scale-95"><Plus size={16} /> Add</button>
                          </>
                        ) : (
                          <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                            <input type="range" min="0" max="100" value={progressInputs[goal.id] !== undefined ? progressInputs[goal.id] : goal.progressPercent} onChange={(e) => setProgressInputs({ ...progressInputs, [goal.id]: Number(e.target.value) })} className="w-full sm:w-32 accent-blue-500" />
                            <button onClick={() => updateProgress(goal.id)} className="w-full sm:w-auto px-4 py-2 text-sm rounded-lg font-medium transition bg-purple-600 hover:bg-purple-700 text-white active:scale-95">Update</button>
                          </div>
                        )
                      )}
                      <div className="flex gap-1 ml-auto md:ml-0">
                        <button onClick={(e) => { e.stopPropagation(); startEdit(goal); }} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition active:scale-90" title="Edit"><Pencil size={18} /></button>
                        <button onClick={(e) => { e.stopPropagation(); deleteGoal(goal.id); }} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition active:scale-90" title="Delete"><Trash2 size={18} /></button>
                      </div>
                    </div>
                  </div>
                  
                  <div className={`w-full h-3 rounded-full overflow-hidden ${progressBg}`}>
                    <div className={`h-full rounded-full transition-all duration-500 ${progress >= 100 ? 'bg-green-500' : (isFinancial ? 'bg-green-500' : 'bg-purple-500')}`} style={{ width: `${progress}%` }}></div>
                  </div>
                  <div className="flex justify-between mt-2">
                    <p className="text-xs text-gray-500">{isFinancial ? (remaining > 0 ? `${formatMoney(remaining)} remaining` : 'Goal reached!') : (remaining > 0 ? `${remaining.toFixed(1)}% left to go` : 'Goal reached!')}</p>
                    <p className="text-xs text-gray-500 font-medium">{progress.toFixed(1)}%</p>
                  </div>
                </div>

                {expandedGoals.has(goal.id) && (
                  <div className={`p-4 sm:p-5 border-t ${isDark ? 'border-gray-700 bg-gray-900/30' : 'border-gray-200 bg-gray-50/50'}`}>
                    <h5 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <ListChecks size={16} className="text-blue-500" /> Milestones Roadmap
                    </h5>
                    
                    <div className="space-y-2 mb-4">
                      {milestones.filter(m => m.goal_id === goal.id).length === 0 && (
                        <p className="text-xs text-gray-500 italic">No milestones yet. Add your first step below!</p>
                      )}
                      {milestones.filter(m => m.goal_id === goal.id).map(milestone => (
                        <div key={milestone.id} className={`flex items-center gap-3 p-2 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white border border-gray-200'}`}>
                          <button 
                            onClick={() => toggleMilestone(milestone.id, milestone.completed)}
                            className={`w-5 h-5 rounded border flex items-center justify-center transition flex-shrink-0 ${milestone.completed ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-400 hover:border-blue-500'}`}
                          >
                            {milestone.completed && <Check size={14} />}
                          </button>
                          <span className={`flex-1 text-sm ${milestone.completed ? 'line-through text-gray-500' : ''}`}>{milestone.title}</span>
                          <button onClick={() => deleteMilestone(milestone.id)} className="text-gray-400 hover:text-red-500 transition flex-shrink-0">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={newMilestoneText[goal.id] || ''} 
                        onChange={(e) => setNewMilestoneText({ ...newMilestoneText, [goal.id]: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && addMilestone(goal.id)}
                        placeholder="Add a new milestone (e.g., Save first 100k)..." 
                        className={`flex-1 px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} 
                      />
                      <button 
                        onClick={() => addMilestone(goal.id)} 
                        className="px-4 py-2 text-sm rounded-lg font-medium transition bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <button onClick={() => setIsModalOpen(true)} className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg shadow-blue-600/30 flex items-center justify-center transition-transform active:scale-90 z-30" aria-label="Add new goal">
        <Plus size={28} />
      </button>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Goal" isDark={isDark}>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Category</label>
            <div className={`flex gap-2 overflow-x-auto pb-2 ${isDark ? 'bg-gray-800' : 'bg-gray-100'} p-1 rounded-xl`}>
              {(['Financial', 'Health', 'Career', 'Learning', 'Personal'] as const).map(cat => {
                const cfg = getCategoryConfig(cat)
                const Icon = cfg.icon
                return (
                  <button 
                    key={cat} 
                    onClick={() => setCategory(cat)} 
                    className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition flex items-center gap-2 ${category === cat ? cfg.badge : 'text-gray-500'}`}
                  >
                    <Icon size={14} />
                    {cat}
                  </button>
                )
              })}
            </div>
          </div>

          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            placeholder={category === 'Financial' ? "Goal name (e.g. New Car)" : "Goal name (e.g. Learn React)"} 
            className={`w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} 
          />
          
          {category === 'Financial' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Target Amount</label>
                <input type="text" inputMode="numeric" value={formattedTargetAmount} onChange={(e) => { setFormattedTargetAmount(formatInputNumber(e.target.value)); setTargetAmount(e.target.value.replace(/[^0-9]/g, '')); }} className={`w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Monthly (opt)</label>
                <input type="text" inputMode="numeric" value={formattedMonthlyContribution} onChange={(e) => { setFormattedMonthlyContribution(formatInputNumber(e.target.value)); setMonthlyContribution(e.target.value.replace(/[^0-9]/g, '')); }} className={`w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Target Date</label>
                <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className={`w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
              </div>
              <div className="w-32">
                <label className="text-xs text-gray-500 mb-1 block">Initial %</label>
                <div className="flex items-center gap-2">
                  <input type="number" min="0" max="100" value={initialProgress} onChange={(e) => setInitialProgress(e.target.value)} className={`w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
                  <span className="text-gray-500 text-sm">%</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={() => setIsModalOpen(false)} className={`flex-1 px-4 py-3 rounded-xl font-medium transition ${isDark ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>Cancel</button>
            <button onClick={addGoal} className="flex-1 px-4 py-3 rounded-xl font-medium transition bg-blue-600 hover:bg-blue-700 text-white active:scale-95">Add Goal</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!editingId} onClose={() => setEditingId(null)} title="Edit Goal" isDark={isDark}>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Category</label>
            <div className={`flex gap-2 overflow-x-auto pb-2 ${isDark ? 'bg-gray-800' : 'bg-gray-100'} p-1 rounded-xl`}>
              {(['Financial', 'Health', 'Career', 'Learning', 'Personal'] as const).map(cat => {
                const cfg = getCategoryConfig(cat)
                const Icon = cfg.icon
                return (
                  <button key={cat} onClick={() => setEditCategory(cat)} className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition flex items-center gap-2 ${editCategory === cat ? cfg.badge : 'text-gray-500'}`}>
                    <Icon size={14} /> {cat}
                  </button>
                )
              })}
            </div>
          </div>

          <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className={`w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
          
          {editCategory === 'Financial' ? (
            <div className="grid grid-cols-2 gap-3">
              <input type="text" inputMode="numeric" value={formattedEditTarget} onChange={(e) => { setFormattedEditTarget(formatInputNumber(e.target.value)); setEditTarget(e.target.value.replace(/[^0-9]/g, '')); }} className={`w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
              <input type="text" inputMode="numeric" value={formattedEditMonthly} onChange={(e) => { setFormattedEditMonthly(formatInputNumber(e.target.value)); setEditMonthly(e.target.value.replace(/[^0-9]/g, '')); }} className={`w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
            </div>
          ) : (
            <div className="flex gap-3">
              <input type="date" value={editTargetDate} onChange={(e) => setEditTargetDate(e.target.value)} className={`flex-1 px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
              <input type="number" min="0" max="100" value={editProgress} onChange={(e) => setEditProgress(e.target.value)} className={`w-24 px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={() => setEditingId(null)} className={`flex-1 px-4 py-3 rounded-xl font-medium transition ${isDark ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>Cancel</button>
            <button onClick={() => saveEdit(editingId!)} className="flex-1 px-4 py-3 rounded-xl font-medium transition bg-blue-600 hover:bg-blue-700 text-white active:scale-95">Save Changes</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}