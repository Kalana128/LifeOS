import { useState, useEffect } from 'react'
import { Plus, Trash2, Pencil, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Task {
  id: number
  text: string
  completed: boolean
  created_at: string
}

interface TasksProps {
  isDark: boolean
  isSidebarCollapsed: boolean
}

export default function Tasks({ isDark, isSidebarCollapsed }: TasksProps) {
  // 1. State
  const [tasks, setTasks] = useState<Task[]>([])
  const [input, setInput] = useState('')
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all')
  
  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const [loading, setLoading] = useState(true)

  // 2. Load from Supabase when the app starts
  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching tasks:', error)
    } else if (data) {
      setTasks(data)
    }
    setLoading(false)
  }

  // 3. Actions (Now using Supabase)
  const addTask = async () => {
    if (input.trim() === '') return
    
    const { data, error } = await supabase
      .from('tasks')
      .insert([{ text: input, completed: false }])
      .select()

    if (error) {
      console.error('Error adding task:', error)
    } else if (data) {
      setTasks([data[0], ...tasks])
      setInput('')
    }
  }

  const toggleTask = async (id: number) => {
    const taskToToggle = tasks.find(t => t.id === id)
    if (!taskToToggle) return

    const newCompletedStatus = !taskToToggle.completed

    const { error } = await supabase
      .from('tasks')
      .update({ completed: newCompletedStatus })
      .eq('id', id)

    if (error) {
      console.error('Error toggling task:', error)
    } else {
      setTasks(tasks.map(task => 
        task.id === id ? { ...task, completed: newCompletedStatus } : task
      ))
    }
  }

  const deleteTask = async (id: number) => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting task:', error)
    } else {
      setTasks(tasks.filter(task => task.id !== id))
    }
  }

  // Edit actions
  const startEdit = (task: Task) => {
    setEditingId(task.id)
    setEditText(task.text)
  }

  const saveEdit = async (id: number) => {
    if (editText.trim() === '') return

    const { error } = await supabase
      .from('tasks')
      .update({ text: editText.trim() })
      .eq('id', id)

    if (error) {
      console.error('Error saving edit:', error)
    } else {
      setTasks(tasks.map(task => 
        task.id === id ? { ...task, text: editText.trim() } : task
      ))
      setEditingId(null)
      setEditText('')
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditText('')
  }

  // 4. Filter logic
  const filteredTasks = tasks.filter(task => {
    if (filter === 'pending') return !task.completed
    if (filter === 'completed') return task.completed
    return true
  })

  // 5. Dynamic styles for Dark/Light mode
  const cardBg = isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
  const inputBg = isDark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
  const taskItemBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-100'
  const filterContainer = isDark ? 'bg-gray-800' : 'bg-gray-100'
  const filterBtn = (active: boolean) => 
    active 
      ? (isDark ? 'bg-gray-700 text-white' : 'bg-white text-gray-900 shadow-sm') 
      : (isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900')

  return (
    // RESPONSIVE WRAPPER: Centers content, adjusts padding for mobile, and expands based on sidebar
    <div className={`w-full p-4 sm:p-6 rounded-2xl border shadow-sm ${cardBg} transition-all duration-300 mx-auto ${isSidebarCollapsed ? 'max-w-5xl' : 'max-w-3xl'}`}>
      {/* Input Area - Stacks on mobile, side-by-side on larger screens */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTask()}
          placeholder="What needs to be done?"
          className={`w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`}
        />
        <button
          onClick={addTask}
          className="w-full sm:w-auto px-6 py-3 rounded-xl font-medium transition bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          Add
        </button>
      </div>

      {/* Filter Tabs */}
      <div className={`flex gap-1 mb-6 p-1 rounded-xl w-fit ${filterContainer}`}>
        {(['all', 'pending', 'completed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition ${filterBtn(filter === f)}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {loading ? (
          <p className="text-center text-gray-500 py-8">Loading tasks from the cloud...</p>
        ) : filteredTasks.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            {filter === 'all' ? 'No tasks yet. Add one above!' : `No ${filter} tasks.`}
          </p>
        ) : (
          filteredTasks.map(task => (
            <div
              key={task.id}
              className={`flex items-center gap-4 p-4 rounded-xl border transition ${taskItemBg}`}
            >
              {editingId !== task.id && (
                <button
                  onClick={() => toggleTask(task.id)}
                  className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition ${
                    task.completed
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : (isDark ? 'border-gray-600 hover:border-blue-500' : 'border-gray-300 hover:border-blue-500')
                  }`}
                >
                  {task.completed && <Check size={14} />}
                </button>
              )}
              
              {editingId === task.id ? (
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit(task.id)
                    if (e.key === 'Escape') cancelEdit()
                  }}
                  autoFocus
                  className={`flex-1 px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`}
                />
              ) : (
                // Added min-w-0 and break-words to handle long tasks on mobile
                <span className={`flex-1 text-lg min-w-0 break-words ${task.completed ? 'line-through text-gray-500' : ''}`}>
                  {task.text}
                </span>
              )}

              {editingId === task.id ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => saveEdit(task.id)}
                    className="text-green-500 hover:text-green-600 transition font-medium px-2"
                  >
                    Save
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="text-gray-400 hover:text-gray-600 transition font-medium px-2"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => startEdit(task)}
                    className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition"
                    title="Edit"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}