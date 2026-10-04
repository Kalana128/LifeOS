import { useState, useEffect, useMemo } from 'react'
import { Plus, Trash2, Pencil, CreditCard as CreditCardIcon, Loader2, Calendar, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'

const CREDIT_CARD_LIMIT = 100000; 

interface Charge {
  id: number
  description: string
  amount: number
  date: string
  created_at: string
  is_installment: boolean
  months?: number
  monthly_amount?: number
  interest_rate?: number 
}

interface Payment {
  id: number
  amount: number
  date: string
  created_at: string
}

interface CreditCardProps {
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

  // NEW: Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const today = new Date()
  const [startDate, setStartDate] = useState(getDateString(new Date(today.getFullYear(), today.getMonth(), 1)))
  const [endDate, setEndDate] = useState(getDateString(today))

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    const [chargesRes, paymentsRes] = await Promise.all([
      supabase.from('cc_charges').select('*').order('date', { ascending: false }),
      supabase.from('cc_payments').select('*').order('date', { ascending: false })
    ])
    if (chargesRes.error) console.error('Error fetching charges:', chargesRes.error)
    if (paymentsRes.error) console.error('Error fetching payments:', paymentsRes.error)
    if (chargesRes.data) setCharges(chargesRes.data.map(c => ({ 
      ...c, 
      amount: Number(c.amount), 
      monthly_amount: c.monthly_amount ? Number(c.monthly_amount) : undefined,
      interest_rate: c.interest_rate ? Number(c.interest_rate) : 0
    })))
    if (paymentsRes.data) setPayments(paymentsRes.data.map(p => ({ ...p, amount: Number(p.amount) })))
    setLoading(false)
  }

  // NEW: Filter Logic
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
    
    const { data, error } = await supabase.from('cc_charges').insert([{ 
      description: description.trim(), 
      amount: principal, 
      is_installment: isInstallment, 
      months: monthsNum, 
      monthly_amount: monthlyAmount,
      interest_rate: feePercentage,
      date: chargeDate ? new Date(chargeDate).toISOString() : new Date().toISOString(),
      created_at: new Date().toISOString() 
    }]).select()
    
    if (error) {
      console.error('Error adding charge:', error)
      alert('Failed to add charge: ' + error.message)
    } else if (data) { 
      setCharges([{ 
        ...data[0], 
        amount: Number(data[0].amount), 
        monthly_amount: data[0].monthly_amount ? Number(data[0].monthly_amount) : undefined,
        interest_rate: data[0].interest_rate ? Number(data[0].interest_rate) : 0
      }, ...charges])
      setDescription(''); setAmount(''); setFormattedAmount(''); setMonths(''); setInterestRate(''); setIsInstallment(false); setChargeDate(getDateString(new Date()))
    }
    setAddingCharge(false)
  }

  const makePayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) { alert('Please enter a valid payment amount'); return }

    setAddingPayment(true)
    const { data, error } = await supabase.from('cc_payments').insert([{ 
      amount: parseFloat(paymentAmount), 
      date: paymentDate ? new Date(paymentDate).toISOString() : new Date().toISOString(),
      created_at: new Date().toISOString() 
    }]).select()
    
    if (error) {
      console.error('Error adding payment:', error)
      alert('Failed to add payment: ' + error.message)
    } else if (data) { 
      setPayments([{ ...data[0], amount: Number(data[0].amount) }, ...payments])
      setPaymentAmount(''); setFormattedPaymentAmount(''); setPaymentDate(getDateString(new Date()))
    }
    setAddingPayment(false)
  }

  const deleteCharge = async (id: number) => { 
    const { error } = await supabase.from('cc_charges').delete().eq('id', id)
    if (error) { console.error('Error deleting charge:', error); alert('Failed to delete charge') } 
    else { setCharges(charges.filter(c => c.id !== id)) }
  }
  
  const deletePayment = async (id: number) => { 
    const { error } = await supabase.from('cc_payments').delete().eq('id', id)
    if (error) { console.error('Error deleting payment:', error); alert('Failed to delete payment') } 
    else { setPayments(payments.filter(p => p.id !== id)) }
  }

  const startEdit = (charge: Charge) => { 
    setEditingId(charge.id); 
    setEditDescription(charge.description); 
    setEditAmount(String(charge.amount)); 
    setFormattedEditAmount(Number(charge.amount).toLocaleString('en-US')); 
    setEditIsInstallment(charge.is_installment); 
    setEditMonths(charge.months ? String(charge.months) : '');
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
      months: monthsNum, 
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
        months: monthsNum, 
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

  // UPDATED: Calculations now use filtered data
  const totalCharges = filteredCharges.reduce((sum, c) => sum + Number(c.amount), 0)
  const totalPayments = filteredPayments.reduce((sum, p) => sum + Number(p.amount), 0)
  const balance = totalCharges - totalPayments
  const availableBalance = Math.max(0, CREDIT_CARD_LIMIT - balance);

  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  
  const totalInstallmentMonthly = filteredCharges
    .filter(c => c.is_installment && c.monthly_amount)
    .reduce((sum, c) => sum + (c.monthly_amount || 0), 0)
  
  const currentMonthRegularCharges = filteredCharges
    .filter(c => {
      if (c.is_installment) return false
      const cDate = new Date(c.date)
      return cDate.getMonth() === currentMonth && cDate.getFullYear() === currentYear
    })
    .reduce((sum, c) => sum + Number(c.amount), 0)
  
  const monthlyDue = totalInstallmentMonthly + currentMonthRegularCharges

  // NEW: Filter Helpers
  const setPreset = (preset: 'month' | '30days' | 'all') => {
    const now = new Date();
    if (preset === 'month') { setStartDate(getDateString(new Date(now.getFullYear(), now.getMonth(), 1))); setEndDate(getDateString(now)); }
    else if (preset === '30days') { const d = new Date(); d.setDate(d.getDate() - 30); setStartDate(getDateString(d)); setEndDate(getDateString(now)); }
    else if (preset === 'all') { setStartDate('2020-01-01'); setEndDate(getDateString(now)); }
  };
  const filterBtn = (active: boolean) => active ? 'bg-blue-600 text-white' : (isDark ? 'bg-gray-800 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-600 hover:text-gray-900');
  const isCurrentMonthActive = startDate === getDateString(new Date(today.getFullYear(), today.getMonth(), 1));
  const isAllTimeActive = startDate === '2020-01-01';

  return (
    <div className={`space-y-6 mt-8`}>
      <h3 className="text-lg font-semibold flex items-center gap-2"><CreditCardIcon size={20} className="text-blue-500" /> Credit Card</h3>
      
      {/* NEW: Filter Section */}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-4 rounded-2xl border shadow-sm ${cardBg}`}>
          <p className="text-sm text-gray-500 mb-1">Available Balance</p>
          <p className="text-xl font-bold text-blue-500">{formatMoney(availableBalance)}</p>
        </div>
        <div className={`p-4 rounded-2xl border shadow-sm ${cardBg}`}>
          <p className="text-sm text-gray-500 mb-1">Total Payments</p>
          <p className="text-xl font-bold text-green-500">{formatMoney(totalPayments)}</p>
        </div>
        <div className={`p-4 rounded-2xl border shadow-sm ${cardBg}`}>
          <p className="text-sm text-gray-500 mb-1">Current Balance</p>
          <p className={`text-xl font-bold ${balance > 0 ? 'text-red-500' : 'text-green-500'}`}>{formatMoney(balance)}</p>
        </div>
        <div className={`p-4 rounded-2xl border shadow-sm ${cardBg}`}>
          <p className="text-sm text-gray-500 mb-1">Monthly Due</p>
          <p className="text-xl font-bold text-orange-500">{formatMoney(monthlyDue)}</p>
        </div>
      </div>

      <div className={`p-4 sm:p-6 rounded-2xl border shadow-sm ${cardBg}`}>
        <h4 className="font-semibold mb-3">Add Charge</h4>
        <div className="flex flex-col gap-3">
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (e.g. Foods)" className={`w-full px-4 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
          <div className="flex flex-col sm:flex-row gap-3">
            <input type="text" inputMode="numeric" value={formattedAmount} onChange={(e) => { setFormattedAmount(formatInputNumber(e.target.value)); setAmount(e.target.value.replace(/[^0-9]/g, '')); }} placeholder="Amount" className={`flex-1 px-4 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
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

      <div className={`p-4 sm:p-6 rounded-2xl border shadow-sm ${cardBg}`}>
        <h4 className="font-semibold mb-3">Make Payment</h4>
        <div className="flex flex-col gap-3">
          <input type="text" inputMode="numeric" value={formattedPaymentAmount} onChange={(e) => { setFormattedPaymentAmount(formatInputNumber(e.target.value)); setPaymentAmount(e.target.value.replace(/[^0-9]/g, '')); }} placeholder="Payment amount" className={`w-full px-4 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Payment Date</label>
            <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className={`w-full px-4 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
          </div>
          <button onClick={makePayment} disabled={addingPayment} className="w-full px-6 py-2 rounded-xl font-medium transition bg-green-600 hover:bg-green-700 text-white active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
            {addingPayment ? <Loader2 size={18} className="animate-spin" /> : 'Pay'}
            {addingPayment ? ' Processing...' : ''}
          </button>
        </div>
      </div>

      <div className={`p-4 sm:p-6 rounded-2xl border shadow-sm ${cardBg}`}>
        <h4 className="font-semibold mb-4">Charges</h4>
        {loading ? <p className="text-center text-gray-500">Loading...</p> : filteredCharges.length === 0 ? <p className="text-center text-gray-500">No charges found.</p> : (
          <div className="space-y-3">
            {filteredCharges.map(c => (
              <div key={c.id} className={`p-4 rounded-xl border ${rowBg}`}>
                {editingId === c.id ? (
                  <div className="flex flex-col gap-3">
                    <input type="text" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className={`w-full px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
                    <input type="text" inputMode="numeric" value={formattedEditAmount} onChange={(e) => { setFormattedEditAmount(formatInputNumber(e.target.value)); setEditAmount(e.target.value.replace(/[^0-9]/g, '')); }} className={`w-full px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
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
                        {c.is_installment && c.months && <span>• {c.months} months</span>}
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

      <div className={`p-4 sm:p-6 rounded-2xl border shadow-sm ${cardBg}`}>
        <h4 className="font-semibold mb-4">Payment History</h4>
        {filteredPayments.length === 0 ? <p className="text-center text-gray-500">No payments found.</p> : (
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