import { useState, useEffect } from 'react'
import { Plus, Trash2, Pencil, CreditCard as CreditCardIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Charge {
  id: number
  description: string
  amount: number
  created_at: string
  is_installment: boolean
  months?: number
  monthly_amount?: number
}

interface Payment {
  id: number
  amount: number
  created_at: string
}

interface CreditCardProps {
  isDark: boolean
  isSidebarCollapsed: boolean
}

// Helper to format number with commas as you type
const formatInputNumber = (val: string) => {
  const raw = val.replace(/[^0-9]/g, '');
  if (raw === '') return '';
  return parseInt(raw, 10).toLocaleString('en-US');
};

export default function CreditCard({ isDark, isSidebarCollapsed }: CreditCardProps) {
  const [charges, setCharges] = useState<Charge[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [description, setDescription] = useState('')
  
  // Split amount into raw (for DB) and formatted (for UI)
  const [amount, setAmount] = useState('') 
  const [formattedAmount, setFormattedAmount] = useState('') 
  
  const [isInstallment, setIsInstallment] = useState(false)
  const [months, setMonths] = useState('')
  
  // Split payment amount into raw and formatted
  const [paymentAmount, setPaymentAmount] = useState('')
  const [formattedPaymentAmount, setFormattedPaymentAmount] = useState('')
  
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editDescription, setEditDescription] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [formattedEditAmount, setFormattedEditAmount] = useState('')
  const [editIsInstallment, setEditIsInstallment] = useState(false)
  const [editMonths, setEditMonths] = useState('')

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    const [chargesRes, paymentsRes] = await Promise.all([
      supabase.from('cc_charges').select('*').order('created_at', { ascending: false }),
      supabase.from('cc_payments').select('*').order('created_at', { ascending: false })
    ])
    if (chargesRes.data) setCharges(chargesRes.data.map(c => ({ ...c, amount: Number(c.amount), monthly_amount: c.monthly_amount ? Number(c.monthly_amount) : undefined })))
    if (paymentsRes.data) setPayments(paymentsRes.data.map(p => ({ ...p, amount: Number(p.amount) })))
    setLoading(false)
  }

  const addCharge = async () => {
    if (!description.trim() || !amount || parseFloat(amount) <= 0) return
    const monthly = isInstallment && months ? parseFloat(amount) / parseInt(months) : undefined
    const { data, error } = await supabase.from('cc_charges').insert([{ description, amount: parseFloat(amount), is_installment: isInstallment, months: isInstallment ? parseInt(months) : null, monthly_amount: monthly, created_at: new Date().toISOString() }]).select()
    if (!error && data) { setCharges([{ ...data[0], amount: Number(data[0].amount), monthly_amount: data[0].monthly_amount ? Number(data[0].monthly_amount) : undefined }, ...charges]); setDescription(''); setAmount(''); setFormattedAmount(''); setMonths(''); setIsInstallment(false) }
  }

  const makePayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) return
    const { data, error } = await supabase.from('cc_payments').insert([{ amount: parseFloat(paymentAmount), created_at: new Date().toISOString() }]).select()
    if (!error && data) { setPayments([{ ...data[0], amount: Number(data[0].amount) }, ...payments]); setPaymentAmount(''); setFormattedPaymentAmount('') }
  }

  const deleteCharge = async (id: number) => { const { error } = await supabase.from('cc_charges').delete().eq('id', id); if (!error) setCharges(charges.filter(c => c.id !== id)) }
  const deletePayment = async (id: number) => { const { error } = await supabase.from('cc_payments').delete().eq('id', id); if (!error) setPayments(payments.filter(p => p.id !== id)) }

  const startEdit = (charge: Charge) => { 
    setEditingId(charge.id); 
    setEditDescription(charge.description); 
    setEditAmount(String(charge.amount)); 
    setFormattedEditAmount(Number(charge.amount).toLocaleString('en-US')); 
    setEditIsInstallment(charge.is_installment); 
    setEditMonths(charge.months ? String(charge.months) : '') 
  }
  
  const saveEdit = async (id: number) => {
    if (!editDescription.trim() || !editAmount || parseFloat(editAmount) <= 0) return
    const monthly = editIsInstallment && editMonths ? parseFloat(editAmount) / parseInt(editMonths) : undefined
    const { error } = await supabase.from('cc_charges').update({ description: editDescription.trim(), amount: parseFloat(editAmount), is_installment: editIsInstallment, months: editIsInstallment ? parseInt(editMonths) : null, monthly_amount: monthly }).eq('id', id)
    if (!error) { setCharges(charges.map(c => c.id === id ? { ...c, description: editDescription.trim(), amount: parseFloat(editAmount), is_installment: editIsInstallment, months: editIsInstallment ? parseInt(editMonths) : null, monthly_amount: monthly } : c)); setEditingId(null) }
  }

  const formatMoney = (num: number) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(num)
  const cardBg = isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
  const inputBg = isDark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
  const rowBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-100'

  const totalCharges = charges.reduce((sum, c) => sum + Number(c.amount), 0)
  const totalPayments = payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const balance = totalCharges - totalPayments

  return (
    <div className={`space-y-6 mt-8`}>
      <h3 className="text-lg font-semibold flex items-center gap-2"><CreditCardIcon size={20} className="text-blue-500" /> Credit Card</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-4 rounded-2xl border shadow-sm ${cardBg}`}><p className="text-sm text-gray-500 mb-1">Total Charges</p><p className="text-xl font-bold text-red-500">{formatMoney(totalCharges)}</p></div>
        <div className={`p-4 rounded-2xl border shadow-sm ${cardBg}`}><p className="text-sm text-gray-500 mb-1">Total Payments</p><p className="text-xl font-bold text-green-500">{formatMoney(totalPayments)}</p></div>
        <div className={`p-4 rounded-2xl border shadow-sm ${cardBg}`}><p className="text-sm text-gray-500 mb-1">Current Balance</p><p className={`text-xl font-bold ${balance > 0 ? 'text-red-500' : 'text-green-500'}`}>{formatMoney(balance)}</p></div>
      </div>

      <div className={`p-4 sm:p-6 rounded-2xl border shadow-sm ${cardBg}`}>
        <h4 className="font-semibold mb-3">Add Charge</h4>
        <div className="flex flex-col sm:flex-row gap-3">
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (e.g. Foods)" className={`flex-1 px-4 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
          
          {/* FORMATTED INPUT */}
          <input 
            type="text" 
            inputMode="numeric"
            value={formattedAmount} 
            onChange={(e) => {
              setFormattedAmount(formatInputNumber(e.target.value));
              setAmount(e.target.value.replace(/[^0-9]/g, ''));
            }} 
            placeholder="Amount" 
            className={`w-full sm:w-32 px-4 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} 
          />
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="flex items-center gap-2 text-sm cursor-pointer whitespace-nowrap">
              <input type="checkbox" checked={isInstallment} onChange={(e) => setIsInstallment(e.target.checked)} className="rounded" /> Installment
            </label>
            {isInstallment && <input type="number" value={months} onChange={(e) => setMonths(e.target.value)} placeholder="Months" className={`w-20 px-3 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />}
          </div>
          <button onClick={addCharge} className="w-full sm:w-auto px-6 py-2 rounded-xl font-medium transition bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 active:scale-95"><Plus size={18} /> Add</button>
        </div>
      </div>

      <div className={`p-4 sm:p-6 rounded-2xl border shadow-sm ${cardBg}`}>
        <h4 className="font-semibold mb-3">Make Payment</h4>
        <div className="flex flex-col sm:flex-row gap-3">
          {/* FORMATTED INPUT */}
          <input 
            type="text" 
            inputMode="numeric"
            value={formattedPaymentAmount} 
            onChange={(e) => {
              setFormattedPaymentAmount(formatInputNumber(e.target.value));
              setPaymentAmount(e.target.value.replace(/[^0-9]/g, ''));
            }} 
            placeholder="Payment amount" 
            className={`flex-1 px-4 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} 
          />
          <button onClick={makePayment} className="w-full sm:w-auto px-6 py-2 rounded-xl font-medium transition bg-green-600 hover:bg-green-700 text-white active:scale-95">Pay</button>
        </div>
      </div>

      <div className={`p-4 sm:p-6 rounded-2xl border shadow-sm ${cardBg}`}>
        <h4 className="font-semibold mb-4">Charges</h4>
        {loading ? <p className="text-center text-gray-500">Loading...</p> : charges.length === 0 ? <p className="text-center text-gray-500">No charges yet.</p> : (
          <div className="space-y-3">
            {charges.map(c => (
              <div key={c.id} className={`p-4 rounded-xl border ${rowBg}`}>
                {editingId === c.id ? (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input type="text" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className={`flex-1 px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />
                    {/* FORMATTED INPUT */}
                    <input 
                      type="text" 
                      inputMode="numeric"
                      value={formattedEditAmount} 
                      onChange={(e) => {
                        setFormattedEditAmount(formatInputNumber(e.target.value));
                        setEditAmount(e.target.value.replace(/[^0-9]/g, ''));
                      }} 
                      className={`w-full sm:w-32 px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} 
                    />
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={editIsInstallment} onChange={(e) => setEditIsInstallment(e.target.checked)} /> Inst.</label>
                      {editIsInstallment && <input type="number" value={editMonths} onChange={(e) => setEditMonths(e.target.value)} className={`w-16 px-2 py-1 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`} />}
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
                      <p className="text-xs text-gray-500">{new Date(c.created_at).toLocaleDateString()}{c.is_installment && c.months && ` • ${c.months} months`}{c.monthly_amount && ` • ${formatMoney(c.monthly_amount)}/month`}</p>
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
        {payments.length === 0 ? <p className="text-center text-gray-500">No payments yet.</p> : (
          <div className="space-y-3">
            {payments.map(p => (
              <div key={p.id} className={`flex items-center justify-between p-4 rounded-xl border ${rowBg}`}>
                <p className="text-sm text-gray-500">{new Date(p.created_at).toLocaleDateString()}</p>
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