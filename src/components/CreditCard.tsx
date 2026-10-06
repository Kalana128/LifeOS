import { useState, useEffect, useMemo } from 'react'
import { Plus, Trash2, Pencil, CreditCard as CreditCardIcon, Loader2, Calendar, Search, TrendingUp } from 'lucide-react'
import { supabase } from '../lib/supabase'

const CREDIT_CARD_LIMIT = 100000; 

interface Charge {
  id: number
  description: string
  amount: number
  date: string
  created_at: string
  is_installment: boolean
  installment_months?: number
  monthly_amount?: number
  interest_rate?: number 
  user_id?: string
}

interface Payment {
  id: number
  amount: number
  date: string
  created_at: string
  user_id?: string
}

interface CreditCardProps {
  isDark: boolean
  isSidebarCollapsed: boolean
}

// Supports decimal points (cents)
const formatInputNumber = (val: string) => {
  let cleaned = val.replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }
  if (cleaned === '.') return '0.';
  const integerPart = parts[0].replace(/^0+/, '') || '0';
  const formattedInt = parseInt(integerPart, 10).toLocaleString('en-US');
  return parts.length > 1 ? `${formattedInt}.${parts[1]}` : formattedInt;
};

const getDateString = (date: Date) => {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

const calculateFlatFeeInstallment = (principal: number, feePercentage: number, months: number) => {
  if (!months || months <= 0) return principal;
  if (!feePercentage || feePercentage <= 0) return principal / months;
  const flatFee = principal * (feePercentage / 100);
  const totalPayable = principal + flatFee;
  return totalPayable / months;
}

export default function CreditCard({ isDark, isSidebarCollapsed }: CreditCardProps) {
  const [charges, setCharges] = useState<Charge[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [statementDay, setStatementDay] = useState(5)
  const [dueDay, setDueDay] = useState(26)
  
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('') 
  const [formattedAmount, setFormattedAmount] = useState('') 
  const [isInstallment, setIsInstallment] = useState(false)
  const [months, setMonths] = useState('')
  const [interestRate, setInterestRate] = useState('') 
  const [chargeDate, setChargeDate] = useState(getDateString(new Date()))
  
  const [paymentAmount, setPaymentAmount] = useState('')
  const [formattedPaymentAmount, setFormattedPaymentAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(getDateString(new Date()))
  
  const [loading, setLoading] = useState(true)
  const [addingCharge, setAddingCharge] = useState(false)
  const [addingPayment, setAddingPayment] = useState(false)
  
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editDescription, setEditDescription] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [formattedEditAmount, setFormattedEditAmount] = useState('')
  const [editIsInstallment, setEditIsInstallment] = useState(false)
  const [editMonths, setEditMonths] = useState('')
  const [editInterestRate, setEditInterestRate] = useState('')
  const [editDate, setEditDate] = useState('')

  const [searchQuery, setSearchQuery] = useState('')
  const today = new Date()
  const [startDate, setStartDate] = useState(getDateString(new Date(today.getFullYear(), today.getMonth(), 1)))
  const [endDate, setEndDate] = useState(getDateString(today))

  useEffect(() => { 
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch Profile for statement days
      const { data: profileData } = await supabase.from('profiles').select('cc_statement_day, cc_due_day').single()
      if (profileData) {
        setStatementDay(profileData.cc_statement_day || 5)
        setDueDay(profileData.cc_due_day || 26)
      }

      // Fetch charges and payments
      const [chargesRes, paymentsRes] = await Promise.all([
        supabase.from('cc_charges').select('*').order('date', { ascending: false }),
        supabase.from('cc_payments').select('*').order('date', { ascending: false })
      ])
      
      if (chargesRes.data) {
        setCharges(chargesRes.data.map(c => ({ 
          id: c.id,
          description: c.description || '',
          amount: Number(c.amount) || 0,
          date: c.date,
          created_at: c.created_at,
          is_installment: c.is_installment || false,
          installment_months: c.installment_months ? Number(c.installment_months) : undefined,
          monthly_amount: c.monthly_amount ? Number(c.monthly_amount) : undefined,
          interest_rate: c.interest_rate ? Number(c.interest_rate) : 0,
          user_id: c.user_id
        })))
      }
      
      if (paymentsRes.data) {
        setPayments(paymentsRes.data.map(p => ({ 
          id: p.id,
          amount: Number(p.amount) || 0,
          date: p.date,
          created_at: p.created_at,
          user_id: p.user_id
        })))
      }
    } catch (error) {
      console.error('Unexpected error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredCharges = useMemo(() => {
    const start = new Date(startDate); start.setHours(0, 0, 0, 0);
    const end = new Date(endDate); end.setHours(23, 59, 59, 999);
    return charges.filter(c => {
      const cDate = new Date(c.date);
      return cDate >= start && cDate <= end && c.description.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [charges, startDate, endDate, searchQuery]);

  const filteredPayments = useMemo(() => {
    const start = new Date(startDate); start.setHours(0, 0, 0, 0);
    const end = new Date(endDate); end.setHours(23, 59, 59, 999);
    return payments.filter(p => {
      const pDate = new Date(p.date);
      return pDate >= start && pDate <= end;
    });
  }, [payments, startDate, endDate]);

  const addCharge = async () => {
    if (!description.trim()) { alert('Please enter a description'); return }
    if (!amount || parseFloat(amount) <= 0) { alert('Please enter a valid amount'); return }

    const principal = parseFloat(amount)
    const currentBalance = charges.reduce((sum, c) => sum + Number(c.amount), 0) - payments.reduce((sum, p) => sum + Number(p.amount), 0)
    
    if (currentBalance + principal > CREDIT_CARD_LIMIT) {
      const availableBalance = Math.max(0, CREDIT_CARD_LIMIT - currentBalance)
      alert(`This charge would exceed your credit card limit.\n\nYour available balance is: ${formatMoney(availableBalance)}\n\nPlease reduce the amount or make a payment first.`)
      return
    }

    setAddingCharge(true)
    const monthsNum: number | undefined = isInstallment && months ? parseInt(months) : undefined
    const feePercentage: number = isInstallment ? parseFloat(interestRate) || 0 : 0
    
    let monthlyAmount: number | undefined = undefined
    if (isInstallment && monthsNum) {
      monthlyAmount = calculateFlatFeeInstallment(principal, feePercentage, monthsNum)
    }
    
    const newCharge = { 
      description: description.trim(), 
      amount: principal, 
      is_installment: isInstallment, 
      installment_months: monthsNum,
      monthly_amount: monthlyAmount,
      interest_rate: feePercentage,
      date: chargeDate ? new Date(chargeDate).toISOString() : new Date().toISOString(),
      created_at: new Date().toISOString() 
    }

    const { data, error } = await supabase.from('cc_charges').insert([newCharge]).select()
    
    if (error) {
      console.error('Error adding charge:', error)
      alert('Failed to add charge: ' + error.message)
    } else if (data && data.length > 0) { 
      const mappedCharge: Charge = {
        id: data[0].id,
        description: data[0].description || '',
        amount: Number(data[0].amount) || 0,
        date: data[0].date,
        created_at: data[0].created_at,
        is_installment: data[0].is_installment || false,
        installment_months: data[0].installment_months ? Number(data[0].installment_months) : undefined,
        monthly_amount: data[0].monthly_amount ? Number(data[0].monthly_amount) : undefined,
        interest_rate: data[0].interest_rate ? Number(data[0].interest_rate) : 0,
        user_id: data[0].user_id
      }
      setCharges([mappedCharge, ...charges])
      setDescription(''); setAmount(''); setFormattedAmount(''); setMonths(''); setInterestRate(''); setIsInstallment(false); setChargeDate(getDateString(new Date()))
    }
    setAddingCharge(false)
  }

  const makePayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) { alert('Please enter a valid payment amount'); return }

    setAddingPayment(true)
    const newPayment = { 
      amount: parseFloat(paymentAmount), 
      date: paymentDate ? new Date(paymentDate).toISOString() : new Date().toISOString(),
      created_at: new Date().toISOString() 
    }

    const { data, error } = await supabase.from('cc_payments').insert([newPayment]).select()
    
    if (error) {
      console.error('Error adding payment:', error)
      alert('Failed to add payment: ' + error.message)
    } else if (data && data.length > 0) { 
      const mappedPayment: Payment = {
        id: data[0].id,
        amount: Number(data[0].amount) || 0,
        date: data[0].date,
        created_at: data[0].created_at,
        user_id: data[0].user_id
      }
      setPayments([mappedPayment, ...payments])
      setPaymentAmount(''); setFormattedPaymentAmount(''); setPaymentDate(getDateString(new Date()))
    }
    setAddingPayment(false)
  }

  const deleteCharge = async (id: number) => { 
    if (!confirm('Are you sure you want to delete this charge?')) return
    const { error } = await supabase.from('cc_charges').delete().eq('id', id)
    if (error) { console.error('Error deleting charge:', error); alert('Failed to delete charge') } 
    else { setCharges(charges.filter(c => c.id !== id)) }
  }
  
  const deletePayment = async (id: number) => { 
    if (!confirm('Are you sure you want to delete this payment?')) return
    const { error } = await supabase.from('cc_payments').delete().eq('id', id)
    if (error) { console.error('Error deleting payment:', error); alert('Failed to delete payment') } 
    else { setPayments(payments.filter(p => p.id !== id)) }
  }

  const startEdit = (charge: Charge) => { 
    setEditingId(charge.id); 
    setEditDescription(charge.description); 
    setEditAmount(String(charge.amount)); 
    setFormattedEditAmount(formatInputNumber(String(charge.amount))); 
    setEditIsInstallment(charge.is_installment); 
    setEditMonths(charge.installment_months ? String(charge.installment_months) : '');
    setEditInterestRate(charge.interest_rate ? String(charge.interest_rate) : '0');
    setEditDate(charge.date ? getDateString(new Date(charge.date)) : getDateString(new Date()))
  }
  
  const saveEdit = async (id: number) => {
    if (!editDescription.trim() || !editAmount || parseFloat(editAmount) <= 0) { alert('Please enter valid description and amount'); return }
    const principal = parseFloat(editAmount)
    const monthsNum: number | undefined = editIsInstallment && editMonths ? parseInt(editMonths) : undefined
    const feePercentage: number = editIsInstallment ? parseFloat(editInterestRate) || 0 : 0
    
    let monthlyAmount: number | undefined = undefined
    if (editIsInstallment && monthsNum) {
      monthlyAmount = calculateFlatFeeInstallment(principal, feePercentage, monthsNum)
    }
    
    const { error } = await supabase.from('cc_charges').update({ 
      description: editDescription.trim(), 
      amount: principal, 
      is_installment: editIsInstallment, 
      installment_months: monthsNum,
      monthly_amount: monthlyAmount,
      interest_rate: feePercentage,
      date: editDate ? new Date(editDate).toISOString() : new Date().toISOString()
    }).eq('id', id)
    
    if (error) {
      console.error('Error saving edit:', error)
      alert('Failed to save changes')
    } else { 
      setCharges(charges.map(c => c.id === id ? { 
        ...c, 
        description: editDescription.trim(), 
        amount: principal, 
        is_installment: editIsInstallment, 
        installment_months: monthsNum,
        monthly_amount: monthlyAmount,
        interest_rate: feePercentage
      } : c))
      setEditingId(null)
    }
  }

  const formatMoney = (num: number) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(num)
  
  const cardBg = isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
  const inputBg = isDark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
  const rowBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-100'

  // --- SMART CALCULATIONS ---
  const totalCharges = charges.reduce((sum, c) => sum + (Number(c.amount) || 0), 0)
  const totalPayments = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
  const currentBalance = Math.max(0, totalCharges - totalPayments)
  const availableLimit = Math.max(0, CREDIT_CARD_LIMIT - currentBalance)
  const usagePercent = Math.min(100, (currentBalance / CREDIT_CARD_LIMIT) * 100)

  // Calculate Billing Cycle Dates automatically
  const currentDay = today.getDate()
  let lastStmtDate = new Date(today.getFullYear(), today.getMonth(), statementDay)
  if (currentDay < statementDay) {
    lastStmtDate.setMonth(lastStmtDate.getMonth() - 1)
  }
  let nextStmtDate = new Date(lastStmtDate)
  nextStmtDate.setMonth(nextStmtDate.getMonth() + 1)
  
  const lastStmtStr = getDateString(lastStmtDate)
  const nextStmtStr = getDateString(nextStmtDate)

  // Estimated Next Payment Logic
  const estimatedInstallments = charges
    .filter(c => c.is_installment && c.monthly_amount)
    .reduce((sum, c) => sum + (c.monthly_amount || 0), 0)
    
  const estimatedNewPurchases = charges
    .filter(c => !c.is_installment && c.date >= lastStmtStr)
    .reduce((sum, c) => sum + c.amount, 0)
    
  const estimatedTotalPayment = estimatedInstallments + estimatedNewPurchases

  const setPreset = (preset: 'month' | '30days' | 'all') => {
    const now = new Date();
    if (preset === 'month') { setStartDate(getDateString(new Date(now.getFullYear(), now.getMonth(), 1))); setEndDate(getDateString(now)); }
    else if (preset === '30days') { const d = new Date(); d.setDate(d.getDate() - 30); setStartDate(getDateString(d)); setEndDate(getDateString(now)); }
    else if (preset === 'all') { setStartDate('2020-01-01'); setEndDate(getDateString(now)); }
  };
  
  const filterBtn = (active: boolean) => active ? 'bg-blue-600 text-white' : (isDark ? 'bg-gray-800 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-600 hover:text-gray-900');
  const isCurrentMonthActive = startDate === getDateString(new Date(today.getFullYear(), today.getMonth(), 1));
  const isAllTimeActive = startDate === '2020-01-01';

  const formatStatementDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return (
    <div className={`space-y-6 mt-8`}>
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <CreditCardIcon size={20} className="text-blue-500" /> Credit Card
      </h3>
      
      {/* NEW: Automatic Dashboard */}
      <div className={`p-5 rounded-2xl border shadow-sm ${cardBg}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Real-Time Status</h4>
            <p className="text-xs text-gray-400 mt-1">Cycle: {statementDay}th of month → Due: {dueDay}th of month</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Next Statement</p>
            <p className="text-sm font-bold">{formatStatementDate(nextStmtStr)}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400">Credit Used</span>
            <span className="font-medium">{usagePercent.toFixed(1)}%</span>
          </div>
          <div className={`w-full h-2 rounded-full ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}>
            <div 
              className={`h-full rounded-full transition-all duration-500 ${usagePercent > 80 ? 'bg-red-500' : usagePercent > 50 ? 'bg-orange-500' : 'bg-green-500'}`} 
              style={{ width: `${usagePercent}%` }}
            ></div>
          </div>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className={`p-3 rounded-xl ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
            <p className="text-xs text-gray-500 mb-1">Available Limit</p>
            <p className="text-xl font-bold text-green-500">{formatMoney(availableLimit)}</p>
          </div>
          <div className={`p-3 rounded-xl ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
            <p className="text-xs text-gray-500 mb-1">Total Balance Owed</p>
            <p className="text-xl font-bold text-red-500">{formatMoney(currentBalance)}</p>
          </div>
        </div>
      </div>

      {/* NEW: Next Bill Estimator */}
      <div className={`p-5 rounded-2xl border shadow-sm ${cardBg} border-l-4 border-l-blue-500`}>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={18} className="text-blue-500" />
          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Estimated Next Bill</h4>
        </div>
        <p className="text-3xl font-bold mb-4">{formatMoney(estimatedTotalPayment)}</p>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span> Active Installments
            </span>
            <span className="font-medium">{formatMoney(estimatedInstallments)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span> New Purchases (since {formatStatementDate(lastStmtStr)})
            </span>
            <span className="font-medium">{formatMoney(estimatedNewPurchases)}</span>
          </div>
        </div>
        <p className="text-[10px] text-gray-500 mt-4 italic">*Estimate only. Actual bank bill may vary slightly due to fees or taxes.</p>
      </div>

      {/* Filter Section */}
      <div className={`flex flex-col sm:flex-row gap-3 p-3 rounded-2xl border ${cardBg}`}>
        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search charges..." className={`w-full pl-9 pr-4 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto">
          <button onClick={() => setPreset('month')} className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${filterBtn(isCurrentMonthActive)}`}>This Month</button>
          <button onClick={() => setPreset('30days')} className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${filterBtn(false)}`}>Last 30 Days</button>
          <button onClick={() => setPreset('all')} className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${filterBtn(isAllTimeActive)}`}>All Time</button>
        </div>
      </div>

      {/* Add Charge Form */}
      <div className={`p-4 sm:p-6 rounded-2xl border shadow-sm ${cardBg}`}>
        <h4 className="font-semibold mb-3">Add Charge</h4>
        <div className="flex flex-col gap-3">
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (e.g. Samsung A56)" className={`w-full px-4 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
          <div className="flex flex-col sm:flex-row gap-3">
            <input type="text" inputMode="decimal" value={formattedAmount} onChange={(e) => { setFormattedAmount(formatInputNumber(e.target.value)); setAmount(e.target.value.replace(/[^0-9.]/g, '')); }} placeholder="Amount (e.g. 1000.98)" className={`flex-1 px-4 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
            <div className="flex items-center gap-2 flex-wrap">
              <label className="flex items-center gap-2 text-sm cursor-pointer whitespace-nowrap">
                <input type="checkbox" checked={isInstallment} onChange={(e) => setIsInstallment(e.target.checked)} className="rounded" /> Installment
              </label>
              {isInstallment && (
                <>
                  <input type="number" value={months} onChange={(e) => setMonths(e.target.value)} placeholder="Months" className={`w-20 px-3 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
                  <input type="number" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} placeholder="Fee %" step="0.1" className={`w-24 px-3 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
                </>
              )}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Charge Date</label>
            <input type="date" value={chargeDate} onChange={(e) => setChargeDate(e.target.value)} className={`w-full px-4 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
          </div>
          <button onClick={addCharge} disabled={addingCharge} className="w-full px-6 py-2 rounded-xl font-medium transition bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
            {addingCharge ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} 
            {addingCharge ? 'Adding...' : 'Add Charge'}
          </button>
        </div>
      </div>

      {/* Make Payment Form */}
      <div className={`p-4 sm:p-6 rounded-2xl border shadow-sm ${cardBg}`}>
        <h4 className="font-semibold mb-3">Make Payment</h4>
        <div className="flex flex-col gap-3">
          <input type="text" inputMode="decimal" value={formattedPaymentAmount} onChange={(e) => { setFormattedPaymentAmount(formatInputNumber(e.target.value)); setPaymentAmount(e.target.value.replace(/[^0-9.]/g, '')); }} placeholder="Payment amount (e.g. 19030.00)" className={`w-full px-4 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Payment Date</label>
            <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className={`w-full px-4 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
          </div>
          <button onClick={makePayment} disabled={addingPayment} className="w-full px-6 py-2 rounded-xl font-medium transition bg-green-600 hover:bg-green-700 text-white active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
            {addingPayment ? <Loader2 size={18} className="animate-spin" /> : 'Record Payment'}
          </button>
        </div>
      </div>

      {/* Charges List */}
      <div className={`p-4 sm:p-6 rounded-2xl border shadow-sm ${cardBg}`}>
        <h4 className="font-semibold mb-4">Charges</h4>
        {loading ? <p className="text-center text-gray-500 py-8">Loading...</p> : filteredCharges.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No charges found.</p>
            <p className="text-xs text-gray-400 mt-2">Try clicking "All Time" to see all charges</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCharges.map(c => (
              <div key={c.id} className={`p-4 rounded-xl border ${rowBg}`}>
                {editingId === c.id ? (
                  <div className="flex flex-col gap-3">
                    <input type="text" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className={`w-full px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
                    <input type="text" inputMode="decimal" value={formattedEditAmount} onChange={(e) => { setFormattedEditAmount(formatInputNumber(e.target.value)); setEditAmount(e.target.value.replace(/[^0-9.]/g, '')); }} className={`w-full px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={editIsInstallment} onChange={(e) => setEditIsInstallment(e.target.checked)} /> Installment</label>
                      {editIsInstallment && (
                        <>
                          <input type="number" value={editMonths} onChange={(e) => setEditMonths(e.target.value)} placeholder="Months" className={`w-20 px-2 py-1 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
                          <input type="number" value={editInterestRate} onChange={(e) => setEditInterestRate(e.target.value)} placeholder="Fee %" step="0.1" className={`w-24 px-2 py-1 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
                        </>
                      )}
                      <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className={`px-2 py-1 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(c.id)} className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg">Save</button>
                      <button onClick={() => setEditingId(null)} className="px-3 py-1 text-sm text-gray-400">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{c.description}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 flex-wrap">
                        <Calendar size={12} className="flex-shrink-0" />
                        <span>{new Date(c.date).toLocaleDateString()}</span>
                        {c.is_installment && c.installment_months && <span>• {c.installment_months} months</span>}
                        {c.is_installment && c.interest_rate && c.interest_rate > 0 && <span>• {c.interest_rate}% fee</span>}
                        {c.monthly_amount && <span>• {formatMoney(c.monthly_amount)}/month</span>}
                      </p>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                      <span className="font-semibold text-red-500">{formatMoney(c.amount)}</span>
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(c)} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition"><Pencil size={16} /></button>
                        <button onClick={() => deleteCharge(c.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment History List */}
      <div className={`p-4 sm:p-6 rounded-2xl border shadow-sm ${cardBg}`}>
        <h4 className="font-semibold mb-4">Payment History</h4>
        {loading ? <p className="text-center text-gray-500 py-8">Loading...</p> : filteredPayments.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No payments found.</p>
            <p className="text-xs text-gray-400 mt-2">Try clicking "All Time" to see all payments</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPayments.map(p => (
              <div key={p.id} className={`flex items-center justify-between p-4 rounded-xl border ${rowBg}`}>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <Calendar size={12} />
                  {new Date(p.date).toLocaleDateString()}
                </p>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-green-500">{formatMoney(p.amount)}</span>
                  <button onClick={() => deletePayment(p.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}