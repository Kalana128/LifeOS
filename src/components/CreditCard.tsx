import { useState, useEffect } from 'react'
import { Plus, Trash2, Pencil, CreditCard as CreditCardIcon, DollarSign } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Charge {
  id: number
  description: string
  amount: number
  date: string
  isInstallment: boolean
  installmentMonths?: number
  monthlyAmount?: number
}

interface Payment {
  id: number
  amount: number
  date: string
}

interface CreditCardProps {
  isDark: boolean
}

export default function CreditCard({ isDark }: CreditCardProps) {
  // 1. State
  const [charges, setCharges] = useState<Charge[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  
  // Form states
  const [chargeDescription, setChargeDescription] = useState('')
  const [chargeAmount, setChargeAmount] = useState('')
  const [isInstallment, setIsInstallment] = useState(false)
  const [installmentMonths, setInstallmentMonths] = useState('')
  
  const [paymentAmount, setPaymentAmount] = useState('')

  // Edit state
  const [editingChargeId, setEditingChargeId] = useState<number | null>(null)
  const [editChargeDesc, setEditChargeDesc] = useState('')
  const [editChargeAmount, setEditChargeAmount] = useState('')

  const [loading, setLoading] = useState(true)

  // 2. Load from Supabase
  useEffect(() => {
    fetchCharges()
    fetchPayments()
  }, [])

  const fetchCharges = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('cc_charges')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) console.error('Error fetching charges:', error)
    else if (data) {
      // FIXED: Now properly maps ALL snake_case columns from Supabase to camelCase
      const mapped = data.map(c => ({
        id: c.id,
        description: c.description,
        amount: Number(c.amount),
        date: c.created_at,
        isInstallment: c.is_installment,
        installmentMonths: c.installment_months,
        monthlyAmount: c.monthly_amount ? Number(c.monthly_amount) : undefined
      }))
      setCharges(mapped)
    }
  }

  const fetchPayments = async () => {
    const { data, error } = await supabase
      .from('cc_payments')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) console.error('Error fetching payments:', error)
    else if (data) {
      const mapped = data.map(p => ({ 
        id: p.id,
        amount: Number(p.amount),
        date: p.created_at
      }))
      setPayments(mapped)
    }
    setLoading(false)
  }

  // 3. Calculate totals
  const totalCharges = charges.reduce((sum, c) => sum + Number(c.amount), 0)
  const totalPayments = payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const currentBalance = totalCharges - totalPayments

  const monthlyInstallments = charges
    .filter(c => c.isInstallment && c.monthlyAmount)
    .reduce((sum, c) => sum + Number(c.monthlyAmount || 0), 0)
  
  const oneTimeCharges = charges
    .filter(c => !c.isInstallment)
    .reduce((sum, c) => sum + Number(c.amount), 0)
  
  const totalDueThisMonth = monthlyInstallments + oneTimeCharges

  // 4. Actions (Supabase)
  const addCharge = async () => {
    const parsedAmount = parseFloat(chargeAmount)
    if (!chargeDescription.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return

    const newCharge = {
      description: chargeDescription,
      amount: parsedAmount,
      is_installment: isInstallment,
      installment_months: isInstallment ? parseInt(installmentMonths) : null,
      monthly_amount: isInstallment ? (parsedAmount / parseInt(installmentMonths)) : null,
      created_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('cc_charges')
      .insert([newCharge])
      .select()

    if (error) {
      console.error('Error adding charge:', error)
    } else if (data) {
      const mapped = data.map(c => ({
        id: c.id,
        description: c.description,
        amount: Number(c.amount),
        date: c.created_at,
        isInstallment: c.is_installment,
        installmentMonths: c.installment_months,
        monthlyAmount: c.monthly_amount ? Number(c.monthly_amount) : undefined
      }))
      setCharges([...mapped, ...charges])
      setChargeDescription('')
      setChargeAmount('')
      setIsInstallment(false)
      setInstallmentMonths('')
    }
  }

  const makePayment = async () => {
    const parsedAmount = parseFloat(paymentAmount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) return

    const newPayment = {
      amount: parsedAmount,
      created_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('cc_payments')
      .insert([newPayment])
      .select()

    if (error) {
      console.error('Error making payment:', error)
    } else if (data) {
      const mapped = data.map(p => ({ 
        id: p.id,
        amount: Number(p.amount),
        date: p.created_at
      }))
      setPayments([...mapped, ...payments])
      setPaymentAmount('')
    }
  }

  const deleteCharge = async (id: number) => {
    const { error } = await supabase.from('cc_charges').delete().eq('id', id)
    if (!error) setCharges(charges.filter(c => c.id !== id))
  }

  const deletePayment = async (id: number) => {
    const { error } = await supabase.from('cc_payments').delete().eq('id', id)
    if (!error) setPayments(payments.filter(p => p.id !== id))
  }

  // Edit actions
  const startEditCharge = (charge: Charge) => {
    setEditingChargeId(charge.id)
    setEditChargeDesc(charge.description)
    setEditChargeAmount(String(charge.amount))
  }

  const saveEditCharge = async (id: number) => {
    const parsedAmount = parseFloat(editChargeAmount)
    if (!editChargeDesc.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return

    const chargeToUpdate = charges.find(c => c.id === id)
    const newMonthly = chargeToUpdate?.isInstallment && chargeToUpdate.installmentMonths ? parsedAmount / chargeToUpdate.installmentMonths : null

    const { error } = await supabase
      .from('cc_charges')
      .update({ 
        description: editChargeDesc.trim(),
        amount: parsedAmount,
        monthly_amount: newMonthly
      })
      .eq('id', id)

    if (error) {
      console.error('Error saving edit:', error)
    } else {
      setCharges(charges.map(c => {
        if (c.id === id) {
          return { ...c, description: editChargeDesc.trim(), amount: parsedAmount, monthlyAmount: newMonthly || undefined }
        }
        return c
      }))
      setEditingChargeId(null)
      setEditChargeDesc('')
      setEditChargeAmount('')
    }
  }

  const cancelEditCharge = () => {
    setEditingChargeId(null)
    setEditChargeDesc('')
    setEditChargeAmount('')
  }

  // 5. Helpers
  const formatMoney = (num: number) => {
    return new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(num)
  }

  // 6. Dynamic Styles
  const cardBg = isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
  const inputBg = isDark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
  const rowBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-100'

  return (
    <div className="space-y-6 mt-8">
      <div className="border-t border-gray-200 dark:border-gray-800 pt-8">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <CreditCardIcon size={24} />
          Credit Card
        </h2>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`p-5 rounded-2xl border shadow-sm ${cardBg} transition-colors`}>
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={16} className={currentBalance > 0 ? 'text-red-500' : 'text-green-500'} />
            <p className="text-sm text-gray-500">Current Balance</p>
          </div>
          <p className={`text-2xl font-bold ${currentBalance > 0 ? 'text-red-500' : 'text-green-500'}`}>
            {formatMoney(currentBalance)}
          </p>
        </div>
        <div className={`p-5 rounded-2xl border shadow-sm ${cardBg} transition-colors`}>
          <p className="text-sm text-gray-500 mb-1">Due This Month</p>
          <p className="text-2xl font-bold text-orange-500">{formatMoney(totalDueThisMonth)}</p>
          <p className="text-xs text-gray-500 mt-1">
            Installments: {formatMoney(monthlyInstallments)} + One-time: {formatMoney(oneTimeCharges)}
          </p>
        </div>
        <div className={`p-5 rounded-2xl border shadow-sm ${cardBg} transition-colors`}>
          <p className="text-sm text-gray-500 mb-1">Total Paid</p>
          <p className="text-2xl font-bold text-green-500">{formatMoney(totalPayments)}</p>
        </div>
      </div>

      {/* ADD CHARGE FORM */}
      <div className={`p-6 rounded-2xl border shadow-sm ${cardBg} transition-colors`}>
        <h3 className="text-lg font-semibold mb-4">Add Charge</h3>
        <div className="space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              value={chargeDescription}
              onChange={(e) => setChargeDescription(e.target.value)}
              placeholder="Description (e.g. Groceries, Phone)"
              className={`flex-1 px-4 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`}
            />
            <input
              type="number"
              value={chargeAmount}
              onChange={(e) => setChargeAmount(e.target.value)}
              placeholder="Amount"
              className={`w-full md:w-32 px-4 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`}
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isInstallment}
                onChange={(e) => setIsInstallment(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">This is an installment payment</span>
            </label>
          </div>
          {isInstallment && (
            <input
              type="number"
              value={installmentMonths}
              onChange={(e) => setInstallmentMonths(e.target.value)}
              placeholder="Number of months"
              className={`w-full md:w-48 px-4 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`}
            />
          )}
          <button
            onClick={addCharge}
            className="w-full md:w-auto px-6 py-2 rounded-xl font-medium transition bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
          >
            <Plus size={18} />
            Add Charge
          </button>
        </div>
      </div>

      {/* MAKE PAYMENT FORM */}
      <div className={`p-6 rounded-2xl border shadow-sm ${cardBg} transition-colors`}>
        <h3 className="text-lg font-semibold mb-4">Make Payment</h3>
        <div className="flex gap-3">
          <input
            type="number"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            placeholder="Payment amount"
            className={`flex-1 px-4 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`}
          />
          <button
            onClick={makePayment}
            className="px-6 py-2 rounded-xl font-medium transition bg-green-600 hover:bg-green-700 text-white"
          >
            Pay
          </button>
        </div>
      </div>

      {/* CHARGES LIST */}
      <div className={`p-6 rounded-2xl border shadow-sm ${cardBg} transition-colors`}>
        <h3 className="text-lg font-semibold mb-4">Charges</h3>
        <div className="space-y-3">
          {loading ? (
            <p className="text-center text-gray-500 py-8">Loading credit card data...</p>
          ) : charges.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No charges yet.</p>
          ) : (
            charges.map(charge => (
              <div key={charge.id} className={`flex items-center justify-between p-4 rounded-xl border ${rowBg}`}>
                {editingChargeId === charge.id ? (
                  <div className="flex-1 flex flex-col gap-2">
                    <input
                      type="text"
                      value={editChargeDesc}
                      onChange={(e) => setEditChargeDesc(e.target.value)}
                      className={`px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`}
                    />
                    <input
                      type="number"
                      value={editChargeAmount}
                      onChange={(e) => setEditChargeAmount(e.target.value)}
                      className={`px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`}
                    />
                    <div className="flex gap-2">
                      <button onClick={() => saveEditCharge(charge.id)} className="px-3 py-1 text-sm rounded-lg font-medium transition bg-green-600 hover:bg-green-700 text-white">Save</button>
                      <button onClick={cancelEditCharge} className="px-3 py-1 text-sm rounded-lg font-medium transition bg-gray-500 hover:bg-gray-600 text-white">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1">
                      <p className="font-medium flex items-center gap-2">
                        {charge.description}
                        {charge.isInstallment && (
                          <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">
                            {charge.installmentMonths} months
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(charge.date).toLocaleDateString()}
                        {charge.isInstallment && charge.monthlyAmount && (
                          <> • {formatMoney(charge.monthlyAmount)}/month</>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-red-500">{formatMoney(charge.amount)}</span>
                      <button onClick={() => startEditCharge(charge)} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition" title="Edit"><Pencil size={18} /></button>
                      <button onClick={() => deleteCharge(charge.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition" title="Delete"><Trash2 size={18} /></button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* PAYMENTS LIST */}
      <div className={`p-6 rounded-2xl border shadow-sm ${cardBg} transition-colors`}>
        <h3 className="text-lg font-semibold mb-4">Payment History</h3>
        <div className="space-y-3">
          {payments.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No payments yet.</p>
          ) : (
            payments.map(payment => (
              <div key={payment.id} className={`flex items-center justify-between p-4 rounded-xl border ${rowBg}`}>
                <p className="text-sm text-gray-500">{new Date(payment.date).toLocaleDateString()}</p>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-green-500">{formatMoney(payment.amount)}</span>
                  <button onClick={() => deletePayment(payment.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition" title="Delete"><Trash2 size={18} /></button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}