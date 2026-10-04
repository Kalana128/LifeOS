import { useState, useEffect, useMemo } from 'react'
import { Plus, Trash2, Pencil, TrendingUp, TrendingDown, DollarSign, Search, Calendar, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Modal from './Modal'
import Debts from './Debts'
import CreditCard from './CreditCard'

interface Transaction {
  id: number
  type: 'income' | 'expense'
  amount: number
  description: string
  date: string
  source?: string
  is_scheduled?: boolean // NEW
  created_at: string
}

interface FinancesProps {
  isDark: boolean
  isSidebarCollapsed: boolean
}

const formatInputNumber = (val: string) => {
  const raw = val.replace(/[^0-9]/g, '');
  if (raw === '') return '';
  return parseInt(raw, 10).toLocaleString('en-US');
};

const getDateString = (date: Date) => {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

export default function Finances({ isDark, isSidebarCollapsed }: FinancesProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('') 
  const [formattedAmount, setFormattedAmount] = useState('') 
  const [source, setSource] = useState('')
  const [transactionDate, setTransactionDate] = useState(getDateString(new Date()))
  const [isScheduled, setIsScheduled] = useState(false) // NEW
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const [startDate, setStartDate] = useState(getDateString(firstDayOfMonth));
  const [endDate, setEndDate] = useState(getDateString(today));
  const [searchQuery, setSearchQuery] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editDescription, setEditDescription] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [formattedEditAmount, setFormattedEditAmount] = useState('')
  const [editSource, setEditSource] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editIsScheduled, setEditIsScheduled] = useState(false) // NEW

  useEffect(() => { fetchTransactions() }, [])

  const fetchTransactions = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('transactions').select('*').order('date', { ascending: false })
    if (error) console.error('Error fetching transactions:', error)
    else if (data) setTransactions(data.map(t => ({ ...t, amount: Number(t.amount), is_scheduled: t.is_scheduled || false })))
    setLoading(false)
  }

  const filteredTransactions = useMemo(() => {
    const start = new Date(startDate); start.setHours(0, 0, 0, 0);
    const end = new Date(endDate); end.setHours(23, 59, 59, 999);
    return transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= start && tDate <= end && t.description.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [transactions, startDate, endDate, searchQuery]);

  // UPDATED: Exclude scheduled transactions from current balance calculations
  const activeTransactions = filteredTransactions.filter(t => !t.is_scheduled)
  const totalIncome = activeTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0)
  const totalExpense = activeTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0)
  const balance = totalIncome - totalExpense
  const totalFlow = totalIncome + totalExpense;
  const incomePercent = totalFlow > 0 ? (totalIncome / totalFlow) * 100 : 50;

  const incomeBySource = activeTransactions.filter(t => t.type === 'income' && t.source).reduce((acc, t) => {
    const src = t.source || 'Other';
    if (!acc[src]) acc[src] = 0;
    acc[src] += Number(t.amount);
    return acc;
  }, {} as Record<string, number>)

  const addTransaction = async () => {
    if (!description.trim() || !amount || parseFloat(amount) <= 0) return
    const { data, error } = await supabase.from('transactions').insert([{ 
      type, 
      amount: parseFloat(amount), 
      description, 
      date: transactionDate ? new Date(transactionDate).toISOString() : new Date().toISOString(),
      source: type === 'income' ? source.trim() || 'Other' : null,
      is_scheduled: isScheduled, // NEW
      created_at: new Date().toISOString() 
    }]).select()
    if (error) console.error('Error adding transaction:', error)
    else if (data) {
      setTransactions([...data.map(t => ({ ...t, amount: Number(t.amount), is_scheduled: t.is_scheduled || false })), ...transactions])
      setDescription(''); setAmount(''); setFormattedAmount(''); setSource(''); setTransactionDate(getDateString(new Date())); setIsScheduled(false); setIsModalOpen(false)
    }
  }

  const deleteTransaction = async (id: number) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (!error) setTransactions(transactions.filter(t => t.id !== id))
  }

  const startEdit = (transaction: Transaction) => {
    setEditingId(transaction.id); 
    setEditDescription(transaction.description); 
    setEditAmount(String(transaction.amount)); 
    setFormattedEditAmount(Number(transaction.amount).toLocaleString('en-US')); 
    setEditSource(transaction.source || '');
    setEditDate(transaction.date ? getDateString(new Date(transaction.date)) : getDateString(new Date()))
    setEditIsScheduled(transaction.is_scheduled || false) // NEW
  }

  const saveEdit = async (id: number) => {
    if (!editDescription.trim() || !editAmount || parseFloat(editAmount) <= 0) return
    const { error } = await supabase.from('transactions').update({ 
      description: editDescription.trim(), 
      amount: parseFloat(editAmount), 
      date: editDate ? new Date(editDate).toISOString() : new Date().toISOString(),
      source: type === 'income' ? (editSource.trim() || 'Other') : null,
      is_scheduled: editIsScheduled // NEW
    }).eq('id', id)
    if (error) console.error('Error saving edit:', error)
    else {
      setTransactions(transactions.map(t => t.id === id ? { 
        ...t, 
        description: editDescription.trim(), 
        amount: parseFloat(editAmount), 
        date: editDate ? new Date(editDate).toISOString() : t.date,
        is_scheduled: editIsScheduled,
        source: t.type === 'income' ? (editSource.trim() || 'Other') : undefined 
      } : t))
      setEditingId(null); setEditDescription(''); setEditAmount(''); setFormattedEditAmount(''); setEditSource(''); setEditDate(''); setEditIsScheduled(false)
    }
  }

  const cancelEdit = () => { setEditingId(null); setEditDescription(''); setEditAmount(''); setFormattedEditAmount(''); setEditSource(''); setEditDate(''); setEditIsScheduled(false) }

  const setPreset = (preset: 'month' | '30days' | 'all') => {
    const now = new Date();
    if (preset === 'month') { setStartDate(getDateString(new Date(now.getFullYear(), now.getMonth(), 1))); setEndDate(getDateString(now)); }
    else if (preset === '30days') { const d = new Date(); d.setDate(d.getDate() - 30); setStartDate(getDateString(d)); setEndDate(getDateString(now)); }
    else if (preset === 'all') { setStartDate('2020-01-01'); setEndDate(getDateString(now)); }
  };

  const formatMoney = (num: number) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(num)
  const cardBg = isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
  const inputBg = isDark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
  const rowBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-100'
  const filterBtn = (active: boolean) => active ? 'bg-blue-600 text-white' : (isDark ? 'bg-gray-800 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-600 hover:text-gray-900');
  const isCurrentMonthActive = startDate === getDateString(new Date(today.getFullYear(), today.getMonth(), 1));
  const isAllTimeActive = startDate === '2020-01-01';

  return (
    <div className={`w-full space-y-6 transition-all duration-300 mx-auto px-4 sm:px-0 relative pb-32 lg:pb-8 ${isSidebarCollapsed ? 'max-w-6xl' : 'max-w-4xl'}`}>
      
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search transactions..." className={`w-full pl-9 pr-4 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
          </div>
          <button onClick={() => setIsModalOpen(true)} className="hidden lg:flex px-4 py-2 rounded-xl font-medium transition bg-blue-600 hover:bg-blue-700 text-white items-center gap-2 active:scale-95 whitespace-nowrap">
            <Plus size={18} /> New Transaction
          </button>
        </div>

        <div className={`flex flex-col sm:flex-row gap-3 p-3 rounded-2xl border ${cardBg}`}>
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto">
            <button onClick={() => setPreset('month')} className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${filterBtn(isCurrentMonthActive)}`}>This Month</button>
            <button onClick={() => setPreset('30days')} className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${filterBtn(false)}`}>Last 30 Days</button>
            <button onClick={() => setPreset('all')} className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${filterBtn(isAllTimeActive)}`}>All Time</button>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:ml-auto border-t sm:border-t-0 sm:border-l border-gray-700/50 pt-3 sm:pt-0 sm:pl-3 w-full sm:w-auto">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-gray-500 whitespace-nowrap">From:</span>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={`flex-1 sm:flex-none px-2 py-1 rounded-lg border text-xs outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`} />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-gray-500 whitespace-nowrap">To:</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={`flex-1 sm:flex-none px-2 py-1 rounded-lg border text-xs outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className={`p-4 sm:p-5 rounded-2xl border shadow-sm ${cardBg} transition-colors`}>
          <div className="flex items-center gap-2 mb-1"><TrendingUp size={16} className="text-green-500" /><p className="text-sm text-gray-500">Total Income</p></div>
          <p className="text-xl sm:text-2xl font-bold text-green-500">{formatMoney(totalIncome)}</p>
        </div>
        <div className={`p-4 sm:p-5 rounded-2xl border shadow-sm ${cardBg} transition-colors`}>
          <div className="flex items-center gap-2 mb-1"><TrendingDown size={16} className="text-red-500" /><p className="text-sm text-gray-500">Total Expenses</p></div>
          <p className="text-xl sm:text-2xl font-bold text-red-500">{formatMoney(totalExpense)}</p>
        </div>
        <div className={`p-4 sm:p-5 rounded-2xl border shadow-sm ${cardBg} transition-colors sm:col-span-2 lg:col-span-1`}>
          <div className="flex items-center gap-2 mb-1"><DollarSign size={16} className={balance >= 0 ? 'text-blue-500' : 'text-red-500'} /><p className="text-sm text-gray-500">Net Savings</p></div>
          <p className={`text-xl sm:text-2xl font-bold ${balance >= 0 ? 'text-blue-500' : 'text-red-500'}`}>{formatMoney(balance)}</p>
        </div>
      </div>

      <div className={`p-4 rounded-2xl border shadow-sm ${cardBg} transition-colors`}>
        <div className="flex justify-between text-xs font-medium text-gray-500 mb-2">
          <span className="text-green-500">Income {Math.round(incomePercent)}%</span>
          <span className="text-red-500">Expenses {Math.round(100 - incomePercent)}%</span>
        </div>
        <div className={`w-full h-3 rounded-full overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}>
          <div className="h-full flex">
            <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${incomePercent}%` }}></div>
            <div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${100 - incomePercent}%` }}></div>
          </div>
        </div>
      </div>

      {Object.keys(incomeBySource).length > 0 && (
        <div className={`p-4 sm:p-6 rounded-2xl border shadow-sm ${cardBg} transition-colors`}>
          <h3 className="text-base sm:text-lg font-semibold mb-4">Income Sources</h3>
          <div className="space-y-2">
            {Object.entries(incomeBySource).map(([src, amount]) => (
              <div key={src} className={`flex items-center justify-between p-3 rounded-xl ${rowBg}`}>
                <span className="font-medium">{src}</span>
                <span className="text-green-500 font-semibold">{formatMoney(amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={`p-4 sm:p-6 rounded-2xl border shadow-sm ${cardBg} transition-colors`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base sm:text-lg font-semibold">Transactions</h3>
          <span className="text-xs text-gray-500">{filteredTransactions.length} records</span>
        </div>
        <div className="space-y-3">
          {loading ? <p className="text-center text-gray-500 py-8">Loading...</p> : filteredTransactions.length === 0 ? (
            <div className="text-center py-12"><p className="text-gray-500 text-lg font-medium">No transactions found</p><p className="text-sm text-gray-400 mt-1">{searchQuery ? 'Try a different search term.' : 'Tap + to add your first transaction!'}</p></div>
          ) : filteredTransactions.map(t => (
            <div key={t.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border ${rowBg} gap-3 ${t.is_scheduled ? 'border-dashed border-blue-500/50' : ''}`}>
              <div className="flex items-center gap-4 flex-1 min-w-0 w-full sm:w-auto">
                <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${t.type === 'income' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                  {t.type === 'income' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                </div>
                {editingId === t.id ? (
                  <div className="flex-1 flex flex-col gap-2 w-full">
                    <input type="text" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className={`w-full px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
                    <div className="flex gap-2">
                      <input type="text" value={formattedEditAmount} onChange={(e) => { setFormattedEditAmount(formatInputNumber(e.target.value)); setEditAmount(e.target.value.replace(/[^0-9]/g, '')); }} className={`flex-1 px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
                      <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className={`px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
                      {t.type === 'income' && <input type="text" value={editSource} onChange={(e) => setEditSource(e.target.value)} placeholder="Source" className={`flex-1 px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />}
                    </div>
                    <label className="flex items-center gap-2 text-xs text-gray-500">
                      <input type="checkbox" checked={editIsScheduled} onChange={(e) => setEditIsScheduled(e.target.checked)} className="rounded" />
                      Schedule for future date (Exclude from current balance)
                    </label>
                  </div>
                ) : (
                  <div className="flex-1 min-w-0">
                    <p className="font-medium flex items-center gap-2 truncate">
                      {t.description}
                      {t.is_scheduled && <span className="text-xs bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full flex-shrink-0 flex items-center gap-1"><Clock size={10} /> Scheduled</span>}
                      {t.type === 'income' && t.source && <span className="text-xs bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full flex-shrink-0">{t.source}</span>}
                    </p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar size={12} />
                      {t.date ? new Date(t.date).toLocaleDateString() : new Date(t.created_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-3 pl-14 sm:pl-0 w-full sm:w-auto">
                {editingId === t.id ? (
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={() => saveEdit(t.id)} className="flex-1 sm:flex-none text-green-500 hover:text-green-600 transition font-medium px-2">Save</button>
                    <button onClick={cancelEdit} className="flex-1 sm:flex-none text-gray-400 hover:text-gray-600 transition font-medium px-2">Cancel</button>
                  </div>
                ) : (
                  <>
                    <span className={`font-semibold ${t.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>{t.type === 'income' ? '+' : '-'}{formatMoney(Number(t.amount))}</span>
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(t)} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition active:scale-90"><Pencil size={18} /></button>
                      <button onClick={() => deleteTransaction(t.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition active:scale-90"><Trash2 size={18} /></button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button 
        onClick={() => setIsModalOpen(true)} 
        className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg shadow-blue-600/40 flex items-center justify-center transition-transform active:scale-90 z-50"
      >
        <Plus size={28} />
      </button>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Transaction" isDark={isDark}>
        <div className="space-y-3">
          <div className={`flex p-1 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <button onClick={() => setType('expense')} className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 ${type === 'expense' ? 'bg-red-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}><TrendingDown size={16} /> Expense</button>
            <button onClick={() => setType('income')} className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 ${type === 'income' ? 'bg-green-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}><TrendingUp size={16} /> Income</button>
          </div>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={type === 'income' ? "Description (e.g. Monthly Salary)" : "Description (e.g. Groceries)"} className={`w-full px-4 py-2.5 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
          {type === 'income' && <input type="text" value={source} onChange={(e) => setSource(e.target.value)} placeholder="Source (e.g. Mother, Salary)" className={`w-full px-4 py-2.5 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />}
          
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Transaction Date</label>
            <input 
              type="date" 
              value={transactionDate} 
              onChange={(e) => setTransactionDate(e.target.value)} 
              className={`w-full px-4 py-2.5 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} 
            />
          </div>

          {/* NEW: Schedule Checkbox */}
          <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
            <input 
              type="checkbox" 
              checked={isScheduled} 
              onChange={(e) => setIsScheduled(e.target.checked)} 
              className="rounded" 
            />
            <span>Schedule for future date (Exclude from current balance)</span>
          </label>
          
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">LKR</span>
            <input type="text" inputMode="numeric" value={formattedAmount} onChange={(e) => { setFormattedAmount(formatInputNumber(e.target.value)); setAmount(e.target.value.replace(/[^0-9]/g, '')); }} placeholder="0" className={`w-full pl-14 pr-4 py-2.5 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition text-lg font-semibold ${inputBg}`} />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setIsModalOpen(false)} className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition ${isDark ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>Cancel</button>
            <button onClick={addTransaction} className="flex-1 px-4 py-2.5 rounded-xl font-medium transition bg-blue-600 hover:bg-blue-700 text-white active:scale-95">Add Transaction</button>
          </div>
        </div>
      </Modal>

      <div className="pb-8">
        <Debts isDark={isDark} isSidebarCollapsed={isSidebarCollapsed} />
        <CreditCard isDark={isDark} isSidebarCollapsed={isSidebarCollapsed} />
      </div>
    </div>
  )
}