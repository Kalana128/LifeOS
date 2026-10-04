import { useState, useEffect, useMemo } from 'react'
import { Plus, Trash2, Pencil, Wallet, Search, X, ChevronDown, ChevronRight, Calendar } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Modal from './Modal'

interface Debt {
  id: number
  name: string
  total_amount: number
  paid_amount: number
  monthly_payment: number
  interest_rate?: number
  reason?: string
  date: string
  next_due_date?: string // NEW
  created_at: string
}

interface DebtPayment {
  id: number
  person_name: string
  amount: number
  reason?: string
  date: string
  created_at: string
}

interface DebtsProps {
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

const getLevenshteinDistance = (a: string, b: string): number => {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) matrix[i][j] = matrix[i - 1][j - 1];
      else matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
};

const isFuzzyMatch = (name: string, query: string): boolean => {
  const lowerName = name.toLowerCase();
  const lowerQuery = query.toLowerCase();
  if (lowerName.includes(lowerQuery) || lowerQuery.includes(lowerName)) return true;
  const distance = getLevenshteinDistance(lowerName, lowerQuery);
  const maxLength = Math.max(lowerName.length, lowerQuery.length);
  if (maxLength === 0) return true;
  return (1 - distance / maxLength) > 0.6;
};

export default function Debts({ isDark, isSidebarCollapsed }: DebtsProps) {
  const [debts, setDebts] = useState<Debt[]>([])
  const [payments, setPayments] = useState<DebtPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPayModalOpen, setIsPayModalOpen] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  
  const [editingId, setEditingId] = useState<number | null>(null)
  const [loanName, setLoanName] = useState('')
  const [loanReason, setLoanReason] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [formattedTotalAmount, setFormattedTotalAmount] = useState('')
  const [paidAmount, setPaidAmount] = useState('')
  const [formattedPaidAmount, setFormattedPaidAmount] = useState('')
  const [monthlyPayment, setMonthlyPayment] = useState('')
  const [formattedMonthlyPayment, setFormattedMonthlyPayment] = useState('')
  const [interestRate, setInterestRate] = useState('')
  const [loanDate, setLoanDate] = useState(getDateString(new Date()))
  const [nextDueDate, setNextDueDate] = useState('') // NEW

  const [payName, setPayName] = useState('')
  const [payReason, setPayReason] = useState('')
  const [payAmount, setPayAmount] = useState('')
  const [formattedPayAmount, setFormattedPayAmount] = useState('')
  const [payDate, setPayDate] = useState(getDateString(new Date()))

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    const [debtsRes, paymentsRes] = await Promise.all([
      supabase.from('debts').select('*').order('created_at', { ascending: false }),
      supabase.from('debt_payments').select('*').order('date', { ascending: false })
    ])
    if (debtsRes.error) console.error('Error fetching debts:', debtsRes.error)
    if (paymentsRes.error) console.error('Error fetching payments:', paymentsRes.error)
    
    if (debtsRes.data) setDebts(debtsRes.data.map(d => ({ 
      ...d, 
      total_amount: Number(d.total_amount), 
      paid_amount: Number(d.paid_amount), 
      monthly_payment: Number(d.monthly_payment) 
    })))
    if (paymentsRes.data) setPayments(paymentsRes.data.map(p => ({ ...p, amount: Number(p.amount) })))
    setLoading(false)
  }

  const openAddModal = (preFillName = '') => {
    setEditingId(null)
    setLoanName(preFillName)
    setLoanReason('')
    setTotalAmount(''); setFormattedTotalAmount('')
    setPaidAmount(''); setFormattedPaidAmount('')
    setMonthlyPayment(''); setFormattedMonthlyPayment('')
    setInterestRate('')
    setLoanDate(getDateString(new Date()))
    setNextDueDate('') // NEW
    setIsModalOpen(true)
  }

  const openEditModal = (debt: Debt) => {
    setEditingId(debt.id)
    setLoanName(debt.name)
    setLoanReason(debt.reason || '')
    setTotalAmount(String(debt.total_amount)); setFormattedTotalAmount(Number(debt.total_amount).toLocaleString('en-US'))
    setPaidAmount(String(debt.paid_amount)); setFormattedPaidAmount(Number(debt.paid_amount).toLocaleString('en-US'))
    setMonthlyPayment(String(debt.monthly_payment)); setFormattedMonthlyPayment(Number(debt.monthly_payment).toLocaleString('en-US'))
    setInterestRate(debt.interest_rate ? String(debt.interest_rate) : '')
    setLoanDate(debt.date ? getDateString(new Date(debt.date)) : getDateString(new Date()))
    setNextDueDate(debt.next_due_date ? getDateString(new Date(debt.next_due_date)) : '') // NEW
    setIsModalOpen(true)
  }

  const handleSaveLoan = async () => {
    if (!loanName.trim() || !totalAmount || parseFloat(totalAmount) <= 0) {
      alert('Please enter a valid name and amount')
      return
    }
    
    const debtData = {
      name: loanName.trim(),
      reason: loanReason.trim() || null,
      total_amount: parseFloat(totalAmount),
      paid_amount: parseFloat(paidAmount) || 0,
      monthly_payment: parseFloat(monthlyPayment) || 0,
      interest_rate: interestRate ? parseFloat(interestRate) : null,
      date: loanDate ? new Date(loanDate).toISOString() : new Date().toISOString(),
      next_due_date: nextDueDate ? new Date(nextDueDate).toISOString() : null, // NEW
      created_at: new Date().toISOString()
    }

    if (editingId) {
      const { created_at, ...updateData } = debtData; 
      const { error } = await supabase.from('debts').update(updateData).eq('id', editingId)
      if (error) { console.error('Error updating debt:', error); alert('Failed to update: ' + error.message) }
      else {
        setDebts(debts.map(d => d.id === editingId ? { ...d, ...updateData } : d))
        setIsModalOpen(false)
      }
    } else {
      const { data, error } = await supabase.from('debts').insert([debtData]).select()
      if (error) { console.error('Error adding debt:', error); alert('Failed to add: ' + error.message) }
      else if (data) {
        setDebts([{ ...data[0], total_amount: Number(data[0].total_amount), paid_amount: Number(data[0].paid_amount), monthly_payment: Number(data[0].monthly_payment) }, ...debts])
        setIsModalOpen(false)
      }
    }
  }

  const deleteDebt = async (id: number) => {
    if (!confirm('Delete this loan record?')) return
    const { error } = await supabase.from('debts').delete().eq('id', id)
    if (error) alert('Failed to delete')
    else setDebts(debts.filter(d => d.id !== id))
  }

  const openPayModal = (personName: string) => {
    setPayName(personName)
    setPayReason('')
    setPayAmount(''); setFormattedPayAmount('')
    setPayDate(getDateString(new Date()))
    setIsPayModalOpen(true)
  }

  const handleSavePayment = async () => {
    if (!payAmount || parseFloat(payAmount) <= 0) {
      alert('Please enter a valid amount')
      return
    }

    const paymentData = {
      person_name: payName,
      reason: payReason.trim() || null,
      amount: parseFloat(payAmount),
      date: payDate ? new Date(payDate).toISOString() : new Date().toISOString(),
      created_at: new Date().toISOString()
    }

    const { data, error } = await supabase.from('debt_payments').insert([paymentData]).select()
    if (error) { console.error('Error adding payment:', error); alert('Failed to add payment: ' + error.message) }
    else if (data) {
      setPayments([{ ...data[0], amount: Number(data[0].amount) }, ...payments])
      setIsPayModalOpen(false)
    }
  }

  const deletePayment = async (id: number) => {
    if (!confirm('Delete this payment record?')) return
    const { error } = await supabase.from('debt_payments').delete().eq('id', id)
    if (error) alert('Failed to delete payment')
    else setPayments(payments.filter(p => p.id !== id))
  }

  const toggleGroup = (name: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(name)) newExpanded.delete(name)
    else newExpanded.add(name)
    setExpandedGroups(newExpanded)
  }

  const grandTotals = useMemo(() => {
    let borrowed = 0; let paid = 0;
    debts.forEach(d => { borrowed += Number(d.total_amount); paid += Number(d.paid_amount); });
    payments.forEach(p => { paid += Number(p.amount); });
    return { borrowed, paid, remaining: borrowed - paid };
  }, [debts, payments]);

  const groupedData = useMemo(() => {
    const groups: Record<string, { loans: Debt[], payments: DebtPayment[], totalBorrowed: number, totalPaid: number, totalMonthly: number }> = {}
    debts.forEach(debt => {
      if (!groups[debt.name]) groups[debt.name] = { loans: [], payments: [], totalBorrowed: 0, totalPaid: 0, totalMonthly: 0 }
      groups[debt.name].loans.push(debt)
      groups[debt.name].totalBorrowed += debt.total_amount
      groups[debt.name].totalPaid += debt.paid_amount
      groups[debt.name].totalMonthly += debt.monthly_payment
    })
    payments.forEach(payment => {
      if (!groups[payment.person_name]) groups[payment.person_name] = { loans: [], payments: [], totalBorrowed: 0, totalPaid: 0, totalMonthly: 0 }
      groups[payment.person_name].payments.push(payment)
      groups[payment.person_name].totalPaid += payment.amount
    })
    return groups
  }, [debts, payments])

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groupedData
    const filtered: typeof groupedData = {}
    Object.keys(groupedData).forEach(name => {
      if (isFuzzyMatch(name, searchQuery)) filtered[name] = groupedData[name]
    })
    return filtered
  }, [groupedData, searchQuery])

  const formatMoney = (num: number) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(num)
  const cardBg = isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
  const inputBg = isDark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
  const rowBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-100'
  const progressBg = isDark ? 'bg-gray-700' : 'bg-gray-200'

  return (
    <div className={`space-y-6 mt-8`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2"><Wallet size={20} className="text-orange-500" /> Loans & Debts</h3>
        <button onClick={() => openAddModal()} className="hidden lg:flex px-4 py-2 rounded-xl font-medium transition bg-blue-600 hover:bg-blue-700 text-white items-center gap-2 active:scale-95">
          <Plus size={18} /> New Person
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-4 rounded-2xl border shadow-sm ${cardBg}`}>
          <p className="text-sm text-gray-500 mb-1">Total Borrowed</p>
          <p className="text-xl font-bold text-red-500">{formatMoney(grandTotals.borrowed)}</p>
        </div>
        <div className={`p-4 rounded-2xl border shadow-sm ${cardBg}`}>
          <p className="text-sm text-gray-500 mb-1">Total Paid</p>
          <p className="text-xl font-bold text-green-500">{formatMoney(grandTotals.paid)}</p>
        </div>
        <div className={`p-4 rounded-2xl border shadow-sm ${cardBg}`}>
          <p className="text-sm text-gray-500 mb-1">Total Remaining</p>
          <p className="text-xl font-bold text-orange-500">{formatMoney(grandTotals.remaining)}</p>
        </div>
      </div>

      <div className={`flex items-center gap-3 p-3 rounded-2xl border ${cardBg}`}>
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by name..." className={`w-full pl-9 pr-4 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
          {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><X size={16} /></button>}
        </div>
      </div>

      <div className="space-y-4">
        {loading ? <p className="text-center text-gray-500">Loading...</p> : Object.keys(filteredGroups).length === 0 ? (
          <div className={`p-8 rounded-2xl border text-center ${cardBg}`}><p className="text-gray-500">{searchQuery ? 'No matches found.' : 'No debts yet.'}</p></div>
        ) : (
          Object.entries(filteredGroups).map(([personName, group]) => {
            const isExpanded = expandedGroups.has(personName)
            const remaining = group.totalBorrowed - group.totalPaid
            const progress = group.totalBorrowed > 0 ? (group.totalPaid / group.totalBorrowed) * 100 : 0
            
            return (
              <div key={personName} className={`rounded-2xl border shadow-sm overflow-hidden ${cardBg}`}>
                <div onClick={() => toggleGroup(personName)} className={`p-4 sm:p-5 cursor-pointer transition-colors ${isDark ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {isExpanded ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronRight size={20} className="text-gray-400" />}
                      <h4 className="text-base sm:text-lg font-semibold truncate">{personName}</h4>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="text-sm font-medium text-orange-500">{formatMoney(remaining)} left</p>
                    </div>
                  </div>
                  <div className={`w-full h-2 rounded-full overflow-hidden ${progressBg}`}>
                    <div className="h-full rounded-full bg-orange-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>

                {isExpanded && (
                  <div className={`border-t ${isDark ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-gray-50/50'} p-4 space-y-6`}>
                    <div className="flex gap-3">
                      <button onClick={(e) => { e.stopPropagation(); openAddModal(personName); }} className="flex-1 py-2 rounded-lg font-medium text-sm bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center gap-2">
                        <Plus size={16} /> Add Loan
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); openPayModal(personName); }} className="flex-1 py-2 rounded-lg font-medium text-sm bg-green-600 text-white hover:bg-green-700 flex items-center justify-center gap-2">
                        <Plus size={16} /> Make Payment
                      </button>
                    </div>

                    <div>
                      <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2">Loan History ({group.loans.length})</h5>
                      <div className="space-y-2">
                        {group.loans.map(debt => (
                          <div key={debt.id} className={`flex items-center justify-between p-3 rounded-xl border ${rowBg}`}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                                <Calendar size={12} /> {debt.date ? new Date(debt.date).toLocaleDateString() : 'No date'}
                                {debt.monthly_payment > 0 && <span>• {formatMoney(debt.monthly_payment)}/mo</span>}
                                {debt.next_due_date && <span className="text-orange-500">• Due: {new Date(debt.next_due_date).toLocaleDateString()}</span>}
                              </div>
                              <p className="font-medium text-sm">{formatMoney(debt.total_amount)}</p>
                              {debt.reason && <p className="text-xs text-gray-400 mt-1 italic">Reason: {debt.reason}</p>}
                            </div>
                            <div className="flex gap-1">
                              <button onClick={() => openEditModal(debt)} className="p-2 text-gray-400 hover:text-blue-500"><Pencil size={16} /></button>
                              <button onClick={() => deleteDebt(debt.id)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2">Payment History ({group.payments.length})</h5>
                      <div className="space-y-2">
                        {group.payments.length === 0 ? <p className="text-xs text-gray-500 italic">No payments recorded yet.</p> : group.payments.map(pay => (
                          <div key={pay.id} className={`flex items-center justify-between p-3 rounded-xl border ${rowBg}`}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                                <Calendar size={12} /> {new Date(pay.date).toLocaleDateString()}
                              </div>
                              {pay.reason && <p className="text-xs text-gray-400 italic">Reason: {pay.reason}</p>}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-green-500 text-sm">{formatMoney(pay.amount)}</span>
                              <button onClick={() => deletePayment(pay.id)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <button onClick={() => openAddModal()} className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center z-30">
        <Plus size={28} />
      </button>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit Loan" : "Add Loan"} isDark={isDark}>
        <div className="space-y-4">
          <input type="text" value={loanName} onChange={(e) => setLoanName(e.target.value)} placeholder="Person's Name" className={`w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`} />
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Loan Date</label>
              <input type="date" value={loanDate} onChange={(e) => setLoanDate(e.target.value)} className={`w-full px-4 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Next Due Date</label>
              <input type="date" value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} className={`w-full px-4 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`} />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Reason (Optional)</label>
            <input type="text" value={loanReason} onChange={(e) => setLoanReason(e.target.value)} placeholder="e.g. Personal use..." className={`w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Amount</label>
              <input type="text" inputMode="numeric" value={formattedTotalAmount} onChange={(e) => { setFormattedTotalAmount(formatInputNumber(e.target.value)); setTotalAmount(e.target.value.replace(/[^0-9]/g, '')); }} className={`w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Already Paid (Initial)</label>
              <input type="text" inputMode="numeric" value={formattedPaidAmount} onChange={(e) => { setFormattedPaidAmount(formatInputNumber(e.target.value)); setPaidAmount(e.target.value.replace(/[^0-9]/g, '')); }} className={`w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`} />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Monthly Payment</label>
              <input type="text" inputMode="numeric" value={formattedMonthlyPayment} onChange={(e) => { setFormattedMonthlyPayment(formatInputNumber(e.target.value)); setMonthlyPayment(e.target.value.replace(/[^0-9]/g, '')); }} className={`w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Interest Rate (%)</label>
              <input type="number" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} placeholder="0" step="0.1" className={`w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setIsModalOpen(false)} className={`flex-1 px-4 py-3 rounded-xl font-medium ${isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>Cancel</button>
            <button onClick={handleSaveLoan} className="flex-1 px-4 py-3 rounded-xl font-medium bg-blue-600 text-white">{editingId ? 'Save' : 'Add'}</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isPayModalOpen} onClose={() => setIsPayModalOpen(false)} title={`Pay ${payName}`} isDark={isDark}>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Payment Date</label>
            <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} className={`w-full px-4 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Amount</label>
            <input type="text" inputMode="numeric" value={formattedPayAmount} onChange={(e) => { setFormattedPayAmount(formatInputNumber(e.target.value)); setPayAmount(e.target.value.replace(/[^0-9]/g, '')); }} placeholder="0" className={`w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 text-lg font-semibold ${inputBg}`} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Reason (Optional)</label>
            <input type="text" value={payReason} onChange={(e) => setPayReason(e.target.value)} placeholder="e.g. Monthly installment..." className={`w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`} />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setIsPayModalOpen(false)} className={`flex-1 px-4 py-3 rounded-xl font-medium ${isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>Cancel</button>
            <button onClick={handleSavePayment} className="flex-1 px-4 py-3 rounded-xl font-medium bg-green-600 text-white">Confirm Payment</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}