import { useState, useEffect } from 'react'
import { Plus, Trash2, Pencil, Wallet } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Debt {
  id: number
  name: string
  total_amount: number
  paid_amount: number
  monthly_payment: number
  interest_rate?: number
}

interface DebtsProps {
  isDark: boolean
  isSidebarCollapsed: boolean
}

// Helper to format number with commas as you type
const formatInputNumber = (val: string) => {
  const raw = val.replace(/[^0-9]/g, '');
  if (raw === '') return '';
  return parseInt(raw, 10).toLocaleString('en-US');
};

export default function Debts({ isDark, isSidebarCollapsed }: DebtsProps) {
  const [debts, setDebts] = useState<Debt[]>([])
  const [name, setName] = useState('')
  
  // Split amounts into raw (for DB) and formatted (for UI)
  const [totalAmount, setTotalAmount] = useState('')
  const [formattedTotalAmount, setFormattedTotalAmount] = useState('')
  
  const [paidAmount, setPaidAmount] = useState('')
  const [formattedPaidAmount, setFormattedPaidAmount] = useState('')
  
  const [monthlyPayment, setMonthlyPayment] = useState('')
  const [formattedMonthlyPayment, setFormattedMonthlyPayment] = useState('')
  
  const [interestRate, setInterestRate] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editTotal, setEditTotal] = useState('')
  const [formattedEditTotal, setFormattedEditTotal] = useState('')
  const [editPaid, setEditPaid] = useState('')
  const [formattedEditPaid, setFormattedEditPaid] = useState('')
  const [editMonthly, setEditMonthly] = useState('')
  const [formattedEditMonthly, setFormattedEditMonthly] = useState('')
  const [editInterest, setEditInterest] = useState('')

  useEffect(() => { fetchDebts() }, [])

  const fetchDebts = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('debts').select('*').order('created_at', { ascending: false })
    if (error) console.error('Error fetching debts:', error)
    else if (data) setDebts(data.map(d => ({ ...d, total_amount: Number(d.total_amount), paid_amount: Number(d.paid_amount), monthly_payment: Number(d.monthly_payment) })))
    setLoading(false)
  }

  const addDebt = async () => {
    if (!name.trim() || !totalAmount || parseFloat(totalAmount) <= 0) return
    const { data, error } = await supabase.from('debts').insert([{ name, total_amount: parseFloat(totalAmount), paid_amount: parseFloat(paidAmount) || 0, monthly_payment: parseFloat(monthlyPayment) || 0, interest_rate: interestRate ? parseFloat(interestRate) : null, created_at: new Date().toISOString() }]).select()
    if (!error && data) { setDebts([{ ...data[0], total_amount: Number(data[0].total_amount), paid_amount: Number(data[0].paid_amount), monthly_payment: Number(data[0].monthly_payment) }, ...debts]); setName(''); setTotalAmount(''); setFormattedTotalAmount(''); setPaidAmount(''); setFormattedPaidAmount(''); setMonthlyPayment(''); setFormattedMonthlyPayment(''); setInterestRate('') }
  }

  const deleteDebt = async (id: number) => { const { error } = await supabase.from('debts').delete().eq('id', id); if (!error) setDebts(debts.filter(d => d.id !== id)) }
  
  const startEdit = (debt: Debt) => { 
    setEditingId(debt.id); 
    setEditName(debt.name); 
    setEditTotal(String(debt.total_amount)); 
    setFormattedEditTotal(Number(debt.total_amount).toLocaleString('en-US')); 
    setEditPaid(String(debt.paid_amount)); 
    setFormattedEditPaid(Number(debt.paid_amount).toLocaleString('en-US')); 
    setEditMonthly(String(debt.monthly_payment)); 
    setFormattedEditMonthly(Number(debt.monthly_payment).toLocaleString('en-US')); 
    setEditInterest(debt.interest_rate ? String(debt.interest_rate) : '') 
  }
  
  const saveEdit = async (id: number) => {
    if (!editName.trim() || !editTotal || parseFloat(editTotal) <= 0) return
    const { error } = await supabase.from('debts').update({ name: editName.trim(), total_amount: parseFloat(editTotal), paid_amount: parseFloat(editPaid) || 0, monthly_payment: parseFloat(editMonthly) || 0, interest_rate: editInterest ? parseFloat(editInterest) : null }).eq('id', id)
    if (!error) { setDebts(debts.map(d => d.id === id ? { ...d, name: editName.trim(), total_amount: parseFloat(editTotal), paid_amount: parseFloat(editPaid) || 0, monthly_payment: parseFloat(editMonthly) || 0, interest_rate: editInterest ? parseFloat(editInterest) : null } : d)); setEditingId(null) }
  }

  const formatMoney = (num: number) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(num)
  const cardBg = isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
  const inputBg = isDark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
  const rowBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-100'
  const progressBg = isDark ? 'bg-gray-700' : 'bg-gray-200'

  return (
    <div className={`space-y-6 mt-8`}>
      <h3 className="text-lg font-semibold flex items-center gap-2"><Wallet size={20} className="text-orange-500" /> Loans & Debts</h3>
      
      <div className={`p-4 sm:p-6 rounded-2xl border shadow-sm ${cardBg}`}>
        <h4 className="font-semibold mb-3">Add New Debt</h4>
        <div className="flex flex-col sm:flex-row gap-3">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Debt Name (e.g. Personal Loan)" className={`flex-1 px-4 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
          
          {/* FORMATTED INPUTS */}
          <input type="text" inputMode="numeric" value={formattedTotalAmount} onChange={(e) => { setFormattedTotalAmount(formatInputNumber(e.target.value)); setTotalAmount(e.target.value.replace(/[^0-9]/g, '')); }} placeholder="Total Amount" className={`w-full sm:w-32 px-4 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
          <input type="text" inputMode="numeric" value={formattedMonthlyPayment} onChange={(e) => { setFormattedMonthlyPayment(formatInputNumber(e.target.value)); setMonthlyPayment(e.target.value.replace(/[^0-9]/g, '')); }} placeholder="Monthly" className={`w-full sm:w-32 px-4 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
          
          <button onClick={addDebt} className="w-full sm:w-auto px-6 py-2 rounded-xl font-medium transition bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 active:scale-95"><Plus size={18} /> Add</button>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? <p className="text-center text-gray-500">Loading...</p> : debts.length === 0 ? <div className={`p-8 rounded-2xl border text-center ${cardBg}`}><p className="text-gray-500">No debts yet.</p></div> : (
          debts.map(debt => {
            const progress = debt.total_amount > 0 ? (debt.paid_amount / debt.total_amount) * 100 : 0
            const remaining = debt.total_amount - debt.paid_amount
            return (
              <div key={debt.id} className={`p-4 sm:p-5 rounded-2xl border shadow-sm ${rowBg} transition-colors`}>
                {editingId === debt.id ? (
                  <div className="space-y-3">
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className={`w-full px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
                    <div className="flex flex-col sm:flex-row gap-2">
                      {/* FORMATTED INPUTS */}
                      <input type="text" inputMode="numeric" value={formattedEditTotal} onChange={(e) => { setFormattedEditTotal(formatInputNumber(e.target.value)); setEditTotal(e.target.value.replace(/[^0-9]/g, '')); }} placeholder="Total" className={`flex-1 px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
                      <input type="text" inputMode="numeric" value={formattedEditPaid} onChange={(e) => { setFormattedEditPaid(formatInputNumber(e.target.value)); setEditPaid(e.target.value.replace(/[^0-9]/g, '')); }} placeholder="Paid" className={`flex-1 px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
                      <input type="text" inputMode="numeric" value={formattedEditMonthly} onChange={(e) => { setFormattedEditMonthly(formatInputNumber(e.target.value)); setEditMonthly(e.target.value.replace(/[^0-9]/g, '')); }} placeholder="Monthly" className={`flex-1 px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(debt.id)} className="px-4 py-2 text-sm rounded-lg font-medium transition bg-green-600 hover:bg-green-700 text-white">Save</button>
                      <button onClick={() => setEditingId(null)} className="px-4 py-2 text-sm rounded-lg font-medium transition bg-gray-500 hover:bg-gray-600 text-white">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-base sm:text-lg font-semibold">{debt.name}</h4>
                        <p className="text-sm text-gray-500 mt-1">{formatMoney(debt.paid_amount)} paid of {formatMoney(debt.total_amount)}{debt.monthly_payment > 0 ? ` • ${formatMoney(debt.monthly_payment)}/month` : ''}{debt.interest_rate ? ` • ${debt.interest_rate}% interest` : ''}</p>
                      </div>
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <span className="text-sm font-medium text-orange-500 whitespace-nowrap">{formatMoney(remaining)} remaining</span>
                        <div className="flex gap-1 ml-auto sm:ml-0">
                          <button onClick={() => startEdit(debt)} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition"><Pencil size={18} /></button>
                          <button onClick={() => deleteDebt(debt.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"><Trash2 size={18} /></button>
                        </div>
                      </div>
                    </div>
                    <div className={`w-full h-3 rounded-full overflow-hidden ${progressBg}`}>
                      <div className="h-full rounded-full bg-orange-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-right">{progress.toFixed(1)}% paid off</p>
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