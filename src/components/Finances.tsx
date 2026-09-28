import { useState, useEffect } from 'react'
import { Plus, Trash2, Pencil, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Debts from './Debts'
import CreditCard from './CreditCard'

interface Transaction {
  id: number
  type: 'income' | 'expense'
  amount: number
  description: string
  date: string
  source?: string
}

interface FinancesProps {
  isDark: boolean
  isSidebarCollapsed: boolean
}

export default function Finances({ isDark, isSidebarCollapsed }: FinancesProps) {
  // 1. State
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [source, setSource] = useState('')
  const [loading, setLoading] = useState(true)

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editDescription, setEditDescription] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editSource, setEditSource] = useState('')

  // 2. Load from Supabase
  useEffect(() => {
    fetchTransactions()
  }, [])

  const fetchTransactions = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching transactions:', error)
    } else if (data) {
      const mappedData = data.map(t => ({ ...t, amount: Number(t.amount) }))
      setTransactions(mappedData)
    }
    setLoading(false)
  }

  // 3. Calculate totals
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0)
    
  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0)
    
  const balance = totalIncome - totalExpense

  const incomeBySource = transactions
    .filter(t => t.type === 'income' && t.source)
    .reduce((acc, t) => {
      const src = t.source || 'Other'
      if (!acc[src]) acc[src] = 0
      acc[src] += Number(t.amount)
      return acc
    }, {} as Record<string, number>)

  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  
  const monthlyIncomeBySource = transactions
    .filter(t => {
      if (t.type !== 'income' || !t.source) return false
      const date = new Date(t.date)
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear
    })
    .reduce((acc, t) => {
      const src = t.source || 'Other'
      if (!acc[src]) acc[src] = 0
      acc[src] += Number(t.amount)
      return acc
    }, {} as Record<string, number>)

  const yearlyIncomeBySource = transactions
    .filter(t => {
      if (t.type !== 'income' || !t.source) return false
      const date = new Date(t.date)
      return date.getFullYear() === currentYear
    })
    .reduce((acc, t) => {
      const src = t.source || 'Other'
      if (!acc[src]) acc[src] = 0
      acc[src] += Number(t.amount)
      return acc
    }, {} as Record<string, number>)

  // 4. Actions
  const addTransaction = async () => {
    const parsedAmount = parseFloat(amount)
    if (!description.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return

    const newTransaction = {
      type,
      amount: parsedAmount,
      description,
      source: type === 'income' ? source.trim() || 'Other' : null,
      created_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('transactions')
      .insert([newTransaction])
      .select()

    if (error) {
      console.error('Error adding transaction:', error)
    } else if (data) {
      const mappedData = data.map(t => ({ ...t, amount: Number(t.amount) }))
      setTransactions([...mappedData, ...transactions])
      setDescription('')
      setAmount('')
      setSource('')
    }
  }

  const deleteTransaction = async (id: number) => {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting transaction:', error)
    } else {
      setTransactions(transactions.filter(t => t.id !== id))
    }
  }

  const startEdit = (transaction: Transaction) => {
    setEditingId(transaction.id)
    setEditDescription(transaction.description)
    setEditAmount(String(transaction.amount))
    setEditSource(transaction.source || '')
  }

  const saveEdit = async (id: number) => {
    const parsedAmount = parseFloat(editAmount)
    if (!editDescription.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return

    const { error } = await supabase
      .from('transactions')
      .update({ 
        description: editDescription.trim(),
        amount: parsedAmount,
        source: type === 'income' ? (editSource.trim() || 'Other') : null
      })
      .eq('id', id)

    if (error) {
      console.error('Error saving edit:', error)
    } else {
      setTransactions(transactions.map(t => 
        t.id === id 
          ? { 
              ...t, 
              description: editDescription.trim(),
              amount: parsedAmount,
              source: t.type === 'income' ? (editSource.trim() || 'Other') : undefined
            } 
          : t
      ))
      setEditingId(null)
      setEditDescription('')
      setEditAmount('')
      setEditSource('')
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditDescription('')
    setEditAmount('')
    setEditSource('')
  }

  const formatMoney = (num: number) => {
    return new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(num)
  }

  const cardBg = isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
  const inputBg = isDark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
  const rowBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-100'

  return (
    // RESPONSIVE WRAPPER: Centers content, adjusts padding for mobile, and expands based on sidebar
    <div className={`w-full space-y-6 sm:space-y-8 transition-all duration-300 mx-auto px-4 sm:px-0 ${isSidebarCollapsed ? 'max-w-6xl' : 'max-w-4xl'}`}>
      
      {/* SUMMARY CARDS - 1 col mobile, 2 col tablet, 3 col desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className={`p-4 sm:p-5 rounded-2xl border shadow-sm ${cardBg} transition-colors`}>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} className="text-green-500" />
            <p className="text-sm text-gray-500">Total Income</p>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-green-500">{formatMoney(totalIncome)}</p>
        </div>
        <div className={`p-4 sm:p-5 rounded-2xl border shadow-sm ${cardBg} transition-colors`}>
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown size={16} className="text-red-500" />
            <p className="text-sm text-gray-500">Total Expenses</p>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-red-500">{formatMoney(totalExpense)}</p>
        </div>
        <div className={`p-4 sm:p-5 rounded-2xl border shadow-sm ${cardBg} transition-colors sm:col-span-2 lg:col-span-1`}>
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={16} className={balance >= 0 ? 'text-blue-500' : 'text-red-500'} />
            <p className="text-sm text-gray-500">Current Savings</p>
          </div>
          <p className={`text-xl sm:text-2xl font-bold ${balance >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
            {formatMoney(balance)}
          </p>
        </div>
      </div>

      {/* INCOME SOURCES BREAKDOWN */}
      {Object.keys(incomeBySource).length > 0 && (
        <div className={`p-4 sm:p-6 rounded-2xl border shadow-sm ${cardBg} transition-colors`}>
          <h3 className="text-base sm:text-lg font-semibold mb-4">Income Sources Breakdown</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">All Time</p>
              <div className="space-y-2">
                {Object.entries(incomeBySource).map(([src, amount]) => (
                  <div key={src} className={`flex items-center justify-between p-3 rounded-xl ${rowBg}`}>
                    <span className="font-medium">{src}</span>
                    <span className="text-green-500 font-semibold">{formatMoney(amount)}</span>
                  </div>
                ))}
              </div>
            </div>
            {Object.keys(monthlyIncomeBySource).length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">This Month</p>
                <div className="space-y-2">
                  {Object.entries(monthlyIncomeBySource).map(([src, amount]) => (
                    <div key={src} className={`flex items-center justify-between p-3 rounded-xl ${rowBg}`}>
                      <span className="font-medium">{src}</span>
                      <span className="text-green-500 font-semibold">{formatMoney(amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {Object.keys(yearlyIncomeBySource).length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">This Year</p>
                <div className="space-y-2">
                  {Object.entries(yearlyIncomeBySource).map(([src, amount]) => (
                    <div key={src} className={`flex items-center justify-between p-3 rounded-xl ${rowBg}`}>
                      <span className="font-medium">{src}</span>
                      <span className="text-green-500 font-semibold">{formatMoney(amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ADD TRANSACTION FORM - Stacks on mobile, side-by-side on desktop */}
      <div className={`p-4 sm:p-6 rounded-2xl border shadow-sm ${cardBg} transition-colors`}>
        <h3 className="text-base sm:text-lg font-semibold mb-4">Add Transaction</h3>
        <div className="space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className={`flex p-1 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <button onClick={() => setType('expense')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 ${type === 'expense' ? 'bg-red-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>
                <TrendingDown size={16} /> Expense
              </button>
              <button onClick={() => setType('income')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 ${type === 'income' ? 'bg-green-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>
                <TrendingUp size={16} /> Income
              </button>
            </div>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={type === 'income' ? "Description (e.g. Monthly Salary)" : "Description (e.g. Groceries)"} className={`flex-1 px-4 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
          </div>
          <div className="flex flex-col md:flex-row gap-3">
            {type === 'income' && (
              <input type="text" value={source} onChange={(e) => setSource(e.target.value)} placeholder="Source (e.g. Mother, Salary, PickMe)" className={`flex-1 px-4 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
            )}
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className={`w-full md:w-32 px-4 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
            <button onClick={addTransaction} className="w-full md:w-auto px-6 py-2 rounded-xl font-medium transition bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2">
              <Plus size={18} /> Add
            </button>
          </div>
        </div>
      </div>

      {/* RECENT TRANSACTIONS LIST - Stacks amount below text on mobile */}
      <div className={`p-4 sm:p-6 rounded-2xl border shadow-sm ${cardBg} transition-colors`}>
        <h3 className="text-base sm:text-lg font-semibold mb-4">Recent Transactions</h3>
        <div className="space-y-3">
          {loading ? (
            <p className="text-center text-gray-500 py-8">Loading transactions from the cloud...</p>
          ) : transactions.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No transactions yet. Add one above!</p>
          ) : (
            transactions.map(t => (
              <div key={t.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border ${rowBg} gap-3`}>
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${t.type === 'income' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                    {t.type === 'income' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                  </div>
                  {editingId === t.id ? (
                    <div className="flex-1 flex flex-col gap-2">
                      <input type="text" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className={`w-full px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
                      <div className="flex gap-2">
                        <input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className={`flex-1 px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
                        {t.type === 'income' && (
                          <input type="text" value={editSource} onChange={(e) => setEditSource(e.target.value)} placeholder="Source" className={`flex-1 px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0">
                      <p className="font-medium flex items-center gap-2 truncate">
                        {t.description}
                        {t.type === 'income' && t.source && (
                          <span className="text-xs bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full flex-shrink-0">{t.source}</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">{new Date(t.date).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 pl-14 sm:pl-0">
                  {editingId === t.id ? (
                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(t.id)} className="text-green-500 hover:text-green-600 transition font-medium px-2">Save</button>
                      <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600 transition font-medium px-2">Cancel</button>
                    </div>
                  ) : (
                    <>
                      <span className={`font-semibold ${t.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>{t.type === 'income' ? '+' : '-'}{formatMoney(Number(t.amount))}</span>
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(t)} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition" title="Edit"><Pencil size={18} /></button>
                        <button onClick={() => deleteTransaction(t.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition" title="Delete"><Trash2 size={18} /></button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Note: We will make Debts and CreditCard responsive in the next steps! */}
      <Debts isDark={isDark} />
      <CreditCard isDark={isDark} />
    </div>
  )
}