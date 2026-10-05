import { useState, useEffect } from 'react'
import { Plus, Trash2, Pencil, Check, Calendar, AlertCircle, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Modal from './Modal'

interface Task {
  id: number
  text: string
  completed: boolean
  due_date: string | null
  priority: 'high' | 'medium' | 'low'
  category?: string | null
  recurrence?: string | null
  created_at: string
}

interface TasksProps {
  isDark: boolean
  isSidebarCollapsed: boolean
}

const getLocalDateString = (date: Date) => {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

const getCategoryColor = (cat: string) => {
  switch(cat) {
    case 'Work': return 'text-blue-500 bg-blue-500/10';
    case 'Personal': return 'text-purple-500 bg-purple-500/10';
    case 'Health': return 'text-green-500 bg-green-500/10';
    case 'Finance': return 'text-orange-500 bg-orange-500/10';
    default: return 'text-gray-500 bg-gray-500/10';
  }
}

const getNextDueDate = (currentDateStr: string, recurrence: string): string => {
  const date = new Date(currentDateStr);
  if (recurrence === 'daily') date.setDate(date.getDate() + 1);
  else if (recurrence === 'weekly') date.setDate(date.getDate() + 7);
  else if (recurrence === 'monthly') date.setMonth(date.getMonth() + 1);
  return getLocalDateString(date);
};

export default function Tasks({ isDark, isSidebarCollapsed }: TasksProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [input, setInput] = useState('')
  const [dueDate, setDueDate] = useState(getLocalDateString(new Date()))
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium')
  const [category, setCategory] = useState<string>('Personal')
  const [recurrence, setRecurrence] = useState<string>('none')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedFilter, setSelectedFilter] = useState<string>('All')

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [editPriority, setEditPriority] = useState<'high' | 'medium' | 'low'>('medium')
  const [editCategory, setEditCategory] = useState<string>('Personal')
  const [editRecurrence, setEditRecurrence] = useState<string>('none')

  useEffect(() => { fetchTasks() }, [])

  const fetchTasks = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false })
    if (error) console.error('Error fetching tasks:', error)
    else if (data) setTasks(data)
    setLoading(false)
  }

  const addTask = async () => {
    if (input.trim() === '') return
    const newTask = { 
      text: input, 
      completed: false, 
      due_date: dueDate ? new Date(dueDate).toISOString() : null, 
      priority,
      category,
      recurrence: recurrence === 'none' ? null : recurrence
    }
    const { data, error } = await supabase.from('tasks').insert([newTask]).select()
    if (error) console.error('Error adding task:', error)
    else if (data) {
      setTasks([data[0], ...tasks])
      setInput('')
      setDueDate(getLocalDateString(new Date()))
      setPriority('medium')
      setCategory('Personal')
      setRecurrence('none')
      setIsModalOpen(false)
    }
  }

  const toggleTask = async (id: number) => {
    const taskToToggle = tasks.find(t => t.id === id)
    if (!taskToToggle) return
    const newStatus = !taskToToggle.completed
    
    if (newStatus && taskToToggle.recurrence && taskToToggle.due_date) {
      const nextDate = getNextDueDate(taskToToggle.due_date, taskToToggle.recurrence);
      const nextTask = {
        text: taskToToggle.text,
        completed: false,
        due_date: new Date(nextDate).toISOString(),
        priority: taskToToggle.priority,
        category: taskToToggle.category,
        recurrence: taskToToggle.recurrence
      };
      const { data: newData, error: insertError } = await supabase.from('tasks').insert([nextTask]).select()
      if (insertError) console.error('Error creating recurring task:', insertError)
      else if (newData) {
        setTasks(prev => [newData[0], ...prev])
      }
    }

    const { error } = await supabase.from('tasks').update({ completed: newStatus }).eq('id', id)
    if (!error) setTasks(tasks.map(t => t.id === id ? { ...t, completed: newStatus } : t))
  }

  const deleteTask = async (id: number) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (!error) setTasks(tasks.filter(t => t.id !== id))
  }

  const startEdit = (task: Task) => {
    setEditingId(task.id)
    setEditText(task.text)
    setEditDueDate(task.due_date ? getLocalDateString(new Date(task.due_date)) : '')
    setEditPriority(task.priority || 'medium')
    setEditCategory(task.category || 'Personal')
    setEditRecurrence(task.recurrence || 'none')
  }

  const saveEdit = async (id: number) => {
    if (editText.trim() === '') return
    const { error } = await supabase.from('tasks').update({ 
      text: editText.trim(), 
      due_date: editDueDate ? new Date(editDueDate).toISOString() : null, 
      priority: editPriority,
      category: editCategory,
      recurrence: editRecurrence === 'none' ? null : editRecurrence
    }).eq('id', id)
    if (!error) {
      setTasks(tasks.map(t => t.id === id ? { 
        ...t, 
        text: editText.trim(), 
        due_date: editDueDate ? new Date(editDueDate).toISOString() : null, 
        priority: editPriority, 
        category: editCategory,
        recurrence: editRecurrence === 'none' ? null : editRecurrence
      } : t))
      setEditingId(null)
    }
  }

  const todayString = getLocalDateString(new Date());
  
  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + 7)
  const maxDateString = getLocalDateString(maxDate)

  const getTaskDateStr = (dateStr: string | null) => dateStr ? dateStr.split('T')[0] : null

  const filteredTasks = selectedFilter === 'All' 
    ? tasks 
    : tasks.filter(t => t.category === selectedFilter)

  const overdueTasks = filteredTasks.filter(t => !t.completed && t.due_date && getTaskDateStr(t.due_date) < todayString)
  
  const todayTasks = filteredTasks.filter(t => {
    if (t.completed || !t.due_date) return false
    return getTaskDateStr(t.due_date) === todayString
  }).sort((a, b) => {
    const priorityOrder: { [key: string]: number } = { high: 1, medium: 2, low: 3 }
    const aPriority = a.priority ? priorityOrder[a.priority] || 999 : 999;
    const bPriority = b.priority ? priorityOrder[b.priority] || 999 : 999;
    return aPriority - bPriority;
  })

  const upcomingTasks = filteredTasks.filter(t => {
    if (t.completed || !t.due_date) return false
    const taskDateStr = getTaskDateStr(t.due_date)
    return taskDateStr ? taskDateStr > todayString && taskDateStr <= maxDateString : false
  }).sort((a, b) => {
    const aDate = a.due_date ? new Date(a.due_date).getTime() : 0;
    const bDate = b.due_date ? new Date(b.due_date).getTime() : 0;
    return aDate - bDate;
  })

  // UPDATED: Only show tasks completed TODAY, preserving all data in the database
  const completedTasks = filteredTasks.filter(t => t.completed && t.due_date && getTaskDateStr(t.due_date) === todayString)
  
  const completedThisWeek = tasks.filter(t => t.completed && t.created_at >= todayString).length
  const overdueCount = tasks.filter(t => !t.completed && t.due_date && getTaskDateStr(t.due_date) < todayString).length

  const cardBg = isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
  const inputBg = isDark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
  const taskItemBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-100'

  const getPriorityColor = (p: string) => {
    if (p === 'high') return 'text-red-500 bg-red-500/10'
    if (p === 'medium') return 'text-yellow-500 bg-yellow-500/10'
    return 'text-green-500 bg-green-500/10'
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  return (
    <div className={`w-full space-y-6 transition-all duration-300 mx-auto px-4 sm:px-0 relative ${isSidebarCollapsed ? 'max-w-5xl' : 'max-w-3xl'}`}>
      
      <div className={`p-5 rounded-2xl border shadow-sm ${cardBg} transition-colors flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4`}>
        <div>
          <h3 className="text-lg font-semibold">Weekly Review</h3>
          <p className="text-sm text-gray-500">Here is how you are doing this week.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          <div className="flex gap-6 text-center">
            <div>
              <p className="text-2xl font-bold text-green-500">{completedThisWeek}</p>
              <p className="text-xs text-gray-500">Completed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-500">{overdueCount}</p>
              <p className="text-xs text-gray-500">Overdue</p>
            </div>
          </div>
          
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="hidden lg:flex px-5 py-2.5 rounded-xl font-medium transition bg-blue-600 hover:bg-blue-700 text-white items-center gap-2 active:scale-95 shadow-md shadow-blue-600/20 whitespace-nowrap"
          >
            <Plus size={18} /> New Task
          </button>
        </div>
      </div>

      <div className={`flex gap-2 overflow-x-auto pb-2 sm:pb-0 w-full px-1`}>
        {(['All', 'Work', 'Personal', 'Health', 'Finance'] as const).map(cat => (
          <button 
            key={cat} 
            onClick={() => setSelectedFilter(cat)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
              selectedFilter === cat 
                ? 'bg-blue-600 text-white' 
                : (isDark ? 'bg-gray-800 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-600 hover:text-gray-900')
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center text-gray-500 py-8">Loading tasks...</p>
      ) : (
        <div className="space-y-8">
          
          {overdueTasks.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-red-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <AlertCircle size={16} /> Overdue ({overdueTasks.length})
              </h4>
              <div className="space-y-2">
                {overdueTasks.map(task => (
                  <TaskItem key={task.id} task={task} isDark={isDark} taskItemBg={taskItemBg} inputBg={inputBg} getPriorityColor={getPriorityColor} getCategoryColor={getCategoryColor} formatDate={formatDate} toggleTask={toggleTask} startEdit={startEdit} deleteTask={deleteTask} editingId={editingId} editText={editText} editDueDate={editDueDate} editPriority={editPriority} editCategory={editCategory} editRecurrence={editRecurrence} setEditText={setEditText} setEditDueDate={setEditDueDate} setEditPriority={setEditPriority} setEditCategory={setEditCategory} setEditRecurrence={setEditRecurrence} saveEdit={saveEdit} setEditingId={setEditingId} />
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-sm font-semibold text-blue-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Calendar size={16} /> Today ({todayTasks.length})
            </h4>
            {todayTasks.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No tasks scheduled for today. Enjoy your day!</p>
            ) : (
              <div className="space-y-2">
                {todayTasks.map(task => (
                  <TaskItem key={task.id} task={task} isDark={isDark} taskItemBg={taskItemBg} inputBg={inputBg} getPriorityColor={getPriorityColor} getCategoryColor={getCategoryColor} formatDate={formatDate} toggleTask={toggleTask} startEdit={startEdit} deleteTask={deleteTask} editingId={editingId} editText={editText} editDueDate={editDueDate} editPriority={editPriority} editCategory={editCategory} editRecurrence={editRecurrence} setEditText={setEditText} setEditDueDate={setEditDueDate} setEditPriority={setEditPriority} setEditCategory={setEditCategory} setEditRecurrence={setEditRecurrence} saveEdit={saveEdit} setEditingId={setEditingId} />
                ))}
              </div>
            )}
          </div>

          {upcomingTasks.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Calendar size={16} /> Upcoming ({upcomingTasks.length})
              </h4>
              <div className="space-y-2">
                {upcomingTasks.map(task => (
                  <TaskItem key={task.id} task={task} isDark={isDark} taskItemBg={taskItemBg} inputBg={inputBg} getPriorityColor={getPriorityColor} getCategoryColor={getCategoryColor} formatDate={formatDate} toggleTask={toggleTask} startEdit={startEdit} deleteTask={deleteTask} editingId={editingId} editText={editText} editDueDate={editDueDate} editPriority={editPriority} editCategory={editCategory} editRecurrence={editRecurrence} setEditText={setEditText} setEditDueDate={setEditDueDate} setEditPriority={setEditPriority} setEditCategory={setEditCategory} setEditRecurrence={setEditRecurrence} saveEdit={saveEdit} setEditingId={setEditingId} />
                ))}
              </div>
            </div>
          )}

          {/* UPDATED: Completed Today Section */}
          {completedTasks.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-green-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Check size={16} /> Completed Today (Tap to reverse)
              </h4>
              <div className="space-y-2 opacity-70">
                {completedTasks.map(task => (
                  <TaskItem key={task.id} task={task} isDark={isDark} taskItemBg={taskItemBg} inputBg={inputBg} getPriorityColor={getPriorityColor} getCategoryColor={getCategoryColor} formatDate={formatDate} toggleTask={toggleTask} startEdit={startEdit} deleteTask={deleteTask} editingId={editingId} editText={editText} editDueDate={editDueDate} editPriority={editPriority} editCategory={editCategory} editRecurrence={editRecurrence} setEditText={setEditText} setEditDueDate={setEditDueDate} setEditPriority={setEditPriority} setEditCategory={setEditCategory} setEditRecurrence={setEditRecurrence} saveEdit={saveEdit} setEditingId={setEditingId} />
                ))}
              </div>
            </div>
          )}

          {tasks.length === 0 && (
            <div className={`p-8 rounded-2xl border text-center ${cardBg}`}>
              <p className="text-gray-500">No tasks yet. Tap + to plan your week!</p>
            </div>
          )}
        </div>
      )}

      <button 
        onClick={() => setIsModalOpen(true)} 
        className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg shadow-blue-600/30 flex items-center justify-center transition-transform active:scale-90 z-30"
      >
        <Plus size={28} />
      </button>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Plan a Task" isDark={isDark}>
        <div className="space-y-4">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTask()} placeholder="What do you need to do?" autoFocus className={`w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Due Date (Max 7 days)</label>
              <input type="date" value={dueDate} min={getLocalDateString(new Date())} max={maxDateString} onChange={(e) => setDueDate(e.target.value)} className={`w-full px-3 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Priority</label>
              <div className={`flex p-1 rounded-xl h-[42px] ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                {(['high', 'medium', 'low'] as const).map(p => (
                  <button key={p} onClick={() => setPriority(p)} className={`flex-1 rounded-lg text-xs font-medium capitalize transition ${priority === p ? (p === 'high' ? 'bg-red-500 text-white' : p === 'medium' ? 'bg-yellow-500 text-white' : 'bg-green-500 text-white') : 'text-gray-500'}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Category</label>
            <div className={`flex p-1 rounded-xl h-[42px] ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
              {(['Work', 'Personal', 'Health', 'Finance'] as const).map(c => (
                <button 
                  key={c} 
                  onClick={() => setCategory(c)} 
                  className={`flex-1 rounded-lg text-xs font-medium transition ${category === c ? getCategoryColor(c) : 'text-gray-500'}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Repeat</label>
            <div className={`flex p-1 rounded-xl h-[42px] ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
              {(['none', 'daily', 'weekly', 'monthly'] as const).map(r => (
                <button 
                  key={r} 
                  onClick={() => setRecurrence(r)} 
                  className={`flex-1 rounded-lg text-xs font-medium capitalize transition ${
                    recurrence === r 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-500'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setIsModalOpen(false)} className={`flex-1 px-4 py-3 rounded-xl font-medium transition ${isDark ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>Cancel</button>
            <button onClick={addTask} className="flex-1 px-4 py-3 rounded-xl font-medium transition bg-blue-600 hover:bg-blue-700 text-white active:scale-95">Add Task</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function TaskItem({ task, isDark, taskItemBg, inputBg, getPriorityColor, getCategoryColor, formatDate, toggleTask, startEdit, deleteTask, editingId, editText, editDueDate, editPriority, editCategory, editRecurrence, setEditText, setEditDueDate, setEditPriority, setEditCategory, setEditRecurrence, saveEdit, setEditingId }: any) {
  if (editingId === task.id) {
    return (
      <div className={`p-4 rounded-xl border space-y-3 ${taskItemBg}`}>
        <input type="text" value={editText} onChange={(e) => setEditText(e.target.value)} className={`w-full px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
        <div className="grid grid-cols-2 gap-3">
          <input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} className={`w-full px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
          <div className={`flex p-1 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
            {(['high', 'medium', 'low'] as const).map(p => (
              <button key={p} onClick={() => setEditPriority(p)} className={`flex-1 rounded-lg text-xs font-medium capitalize transition ${editPriority === p ? (p === 'high' ? 'bg-red-500 text-white' : p === 'medium' ? 'bg-yellow-500 text-white' : 'bg-green-500 text-white') : 'text-gray-500'}`}>{p}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Category</label>
          <div className={`flex p-1 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
            {(['Work', 'Personal', 'Health', 'Finance'] as const).map(c => (
              <button key={c} onClick={() => setEditCategory(c)} className={`flex-1 rounded-lg text-xs font-medium transition ${editCategory === c ? getCategoryColor(c) : 'text-gray-500'}`}>{c}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Repeat</label>
          <div className={`flex p-1 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
            {(['none', 'daily', 'weekly', 'monthly'] as const).map(r => (
              <button key={r} onClick={() => setEditRecurrence(r)} className={`flex-1 rounded-lg text-xs font-medium capitalize transition ${editRecurrence === r ? 'bg-blue-600 text-white' : 'text-gray-500'}`}>{r}</button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={() => setEditingId(null)} className="px-3 py-1 text-sm text-gray-400">Cancel</button>
          <button onClick={() => saveEdit(task.id)} className="px-4 py-1 text-sm bg-blue-600 text-white rounded-lg">Save</button>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl border transition ${taskItemBg}`}>
      <button onClick={() => toggleTask(task.id)} className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition active:scale-90 ${task.completed ? 'bg-blue-600 border-blue-600 text-white' : (isDark ? 'border-gray-600 hover:border-blue-500' : 'border-gray-300 hover:border-blue-500')}`}>
        {task.completed && <Check size={14} />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
            <p className={`font-medium truncate ${task.completed ? 'line-through text-gray-500' : ''}`}>{task.text}</p>
            {task.recurrence && <RefreshCw size={12} className="text-blue-500 flex-shrink-0" />}
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {task.due_date && <span className="text-xs text-gray-500 flex items-center gap-1"><Calendar size={10} /> {formatDate(task.due_date)}</span>}
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${getPriorityColor(task.priority || 'medium')}`}>{task.priority || 'medium'}</span>
          {task.category && <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${getCategoryColor(task.category)}`}>{task.category}</span>}
        </div>
      </div>
      <div className="flex gap-1 flex-shrink-0">
        <button onClick={() => startEdit(task)} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition active:scale-90"><Pencil size={16} /></button>
        <button onClick={() => deleteTask(task.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition active:scale-90"><Trash2 size={16} /></button>
      </div>
    </div>
  )
}