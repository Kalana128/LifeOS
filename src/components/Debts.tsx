import { useState, useEffect } from 'react'
import { Plus, Trash2, Pencil, CreditCard as CreditCardIcon, DollarSign } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Debt {
  id: number
  name: string
  totalAmount: number
  paidAmount: number
  monthlyPayment: number
  createdAt: string
}

interface DebtsProps {
  isDark: boolean
}

export default function Debts({ isDark }: DebtsProps) {
  // 1. State
  const [debts, setDebts] = useState<Debt[]>([])
  const [name, setName] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [monthlyPayment, setMonthlyPayment] = useState('')
  
  // State for making a custom payment
  const [paymentInputs, setPaymentInputs] = useState<{[key: number]: string}>({})
  
  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editTotal, setEditTotal] = useState('')
  const [editMonthly, setEditMonthly] = useState('')

  const [loading, setLoading] = useState(true)

  // 2. Load from Supabase
  useEffect(() => {
    fetchDebts()
  }, [])

  const fetchDebts = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('debts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching debts:', error)
    } else if (data) {
      const mappedData = data.map(d => ({ 
        ...d, 
        totalAmount: Number(d.total_amount), 
        paidAmount: Number(d.paid_amount), 
        monthlyPayment: Number(d.monthly_payment),
        createdAt: d.created_at
      }))
      setDebts(mappedData)
    }
    setLoading(false)
  }

  // 3. Calculate totals
  const totalOwed = debts.reduce((sum, d) => sum + Number(d.totalAmount), 0)
  const totalPaid = debts.reduce((sum, d) => sum + Number(d.paidAmount), 0)
  const totalRemaining = totalOwed - totalPaid

  // 4. Actions (Supabase)
  const addDebt = async () => {
    const parsedTotal = parseFloat(totalAmount)
    const parsedMonthly = parseFloat(monthlyPayment)
    
    if (!name.trim() || isNaN(parsedTotal) || parsedTotal <= 0) return

    const newDebt = {
      name,
      total_amount: parsedTotal,
      paid_amount: 0,
      monthly_payment: isNaN(parsedMonthly) ? 0 : parsedMonthly,
      created_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('debts')
      .insert([newDebt])
      .select()

    if (error) {
      console.error('Error adding debt:', error)
    } else if (data) {
      const mappedData = data.map(d => ({ 
        ...d, 
        totalAmount: Number(d.total_amount), 
        paidAmount: Number(d.paid_amount), 
        monthlyPayment: Number(d.monthly_payment),
        createdAt: d.created_at
      }))
      setDebts([...mappedData, ...debts])
      setName('')
      setTotalAmount('')
      setMonthlyPayment('')
    }
  }

  const makePayment = async (id: number) => {
    const customAmount = parseFloat(paymentInputs[id] || '')
    const debtToPay = debts.find(d => d.id === id)
    if (!debtToPay) return

    const payAmount = !isNaN(customAmount) && customAmount > 0 ? customAmount : debtToPay.monthlyPayment
    const newPaidAmount = Math.min(debtToPay.paidAmount + payAmount, debtToPay.totalAmount)

    const { error } = await supabase
      .from('debts')
      .update({ paid_amount: newPaidAmount })
      .eq('id', id)

    if (error) {
      console.error('Error making payment:', error)
    } else {
      setDebts(debts.map(debt => 
        debt.id === id ? { ...debt, paidAmount: newPaidAmount } : debt
      ))
      setPaymentInputs({ ...paymentInputs, [id]: '' })
    }
  }

  const deleteDebt = async (id: number) => {
    const { error } = await supabase
      .from('debts')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting debt:', error)
    } else {
      setDebts(debts.filter(d => d.id !== id))
    }
  }

  // Edit actions
  const startEdit = (debt: Debt) => {
    setEditingId(debt.id)
    setEditName(debt.name)
    setEditTotal(String(debt.totalAmount))
    setEditMonthly(String(debt.monthlyPayment))
  }

  const saveEdit = async (id: number) => {
    const parsedTotal = parseFloat(editTotal)
    const parsedMonthly = parseFloat(editMonthly)
    
    if (!editName.trim() || isNaN(parsedTotal) || parsedTotal <= 0) return

    const { error } = await supabase
      .from('debts')
      .update({ 
        name: editName.trim(),
        total_amount: parsedTotal,
        monthly_payment: isNaN(parsedMonthly) ? 0 : parsedMonthly
      })
      .eq('id', id)

    if (error) {
      console.error('Error saving edit:', error)
    } else {
      setDebts(debts.map(debt => {
        if (debt.id === id) {
          return {
            ...debt,
            name: editName.trim(),
            totalAmount: parsedTotal,
            monthlyPayment: isNaN(parsedMonthly) ? 0 : parsedMonthly
          }
        }
        return debt
      }))
      
      setEditingId(null)
      setEditName('')
      setEditTotal('')
      setEditMonthly('')
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditTotal('')
    setEditMonthly('')
  }

  // 5. Helpers
  const formatMoney = (num: number) => {
    return new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(num)
  }

  const getProgressPercent = (debt: Debt) => {
    return Math.min((debt.paidAmount / debt.totalAmount) * 100, 100)
  }

  // 6. Dynamic Styles
  const cardBg = isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
  const inputBg = isDark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
  const rowBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-100'
  const progressBg = isDark ? 'bg-gray-700' : 'bg-gray-200'

  return (
    <div className="space-y-6 mt-8">
      <div className="border-t border-gray-200 dark:border-gray-800 pt-8">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <CreditCardIcon size={24} />
          Loans & Credit Cards
        </h2>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`p-5 rounded-2xl border shadow-sm ${cardBg} transition-colors`}>
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={16} className="text-orange-500" />
            <p className="text-sm text-gray-500">Total Owed</p>
          </div>
          <p className="text-2xl font-bold text-orange-500">{formatMoney(totalOwed)}</p>
        </div>
        <div className={`p-5 rounded-2xl border shadow-sm ${cardBg} transition-colors`}>
          <p className="text-sm text-gray-500 mb-1">Total Paid</p>
          <p className="text-2xl font-bold text-green-500">{formatMoney(totalPaid)}</p>
        </div>
        <div className={`p-5 rounded-2xl border shadow-sm ${cardBg} transition-colors`}>
          <p className="text-sm text-gray-500 mb-1">Total Remaining</p>
          <p className="text-2xl font-bold text-red-500">{formatMoney(totalRemaining)}</p>
        </div>
      </div>

      {/* ADD DEBT FORM */}
      <div className={`p-6 rounded-2xl border shadow-sm ${cardBg} transition-colors`}>
        <h3 className="text-lg font-semibold mb-4">Add New Debt or Loan</h3>
        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (e.g. iPhone, Friend's Loan)"
            className={`flex-1 px-4 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`}
          />
          <input
            type="number"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            placeholder="Total Amount"
            className={`w-full md:w-40 px-4 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`}
          />
          <input
            type="number"
            value={monthlyPayment}
            onChange={(e) => setMonthlyPayment(e.target.value)}
            placeholder="Monthly Payment"
            className={`w-full md:w-40 px-4 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`}
          />
          <button
            onClick={addDebt}
            className="px-6 py-2 rounded-xl font-medium transition bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
          >
            <Plus size={18} />
            Add
          </button>
        </div>
      </div>

      {/* DEBTS LIST */}
      <div className="space-y-4">
        {loading ? (
          <p className="text-center text-gray-500 py-8">Loading debts from the cloud...</p>
        ) : debts.length === 0 ? (
          <div className={`p-8 rounded-2xl border shadow-sm text-center ${cardBg} transition-colors`}>
            <p className="text-gray-500">No loans or credit cards tracked yet.</p>
          </div>
        ) : (
          debts.map(debt => {
            const remaining = debt.totalAmount - debt.paidAmount
            const isPaidOff = remaining <= 0
            const progress = getProgressPercent(debt)

            return (
              <div key={debt.id} className={`p-5 rounded-2xl border shadow-sm ${rowBg} transition-colors`}>
                {editingId === debt.id ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`}
                    />
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={editTotal}
                        onChange={(e) => setEditTotal(e.target.value)}
                        placeholder="Total Amount"
                        className={`flex-1 px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`}
                      />
                      <input
                        type="number"
                        value={editMonthly}
                        onChange={(e) => setEditMonthly(e.target.value)}
                        placeholder="Monthly Payment"
                        className={`flex-1 px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(debt.id)}
                        className="px-4 py-2 text-sm rounded-lg font-medium transition bg-green-600 hover:bg-green-700 text-white"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-4 py-2 text-sm rounded-lg font-medium transition bg-gray-500 hover:bg-gray-600 text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                      <div>
                        <h4 className="text-lg font-semibold flex items-center gap-2">
                          {debt.name}
                          {isPaidOff && <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">PAID OFF</span>}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {formatMoney(debt.paidAmount)} paid of {formatMoney(debt.totalAmount)} 
                          {debt.monthlyPayment > 0 && !isPaidOff && ` • ${formatMoney(debt.monthlyPayment)}/month`}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        {!isPaidOff && (
                          <>
                            <input
                              type="number"
                              value={paymentInputs[debt.id] || ''}
                              onChange={(e) => setPaymentInputs({ ...paymentInputs, [debt.id]: e.target.value })}
                              placeholder={debt.monthlyPayment > 0 ? String(debt.monthlyPayment) : "Amount"}
                              className={`w-28 px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`}
                            />
                            <button
                              onClick={() => makePayment(debt.id)}
                              className="px-4 py-2 text-sm rounded-lg font-medium transition bg-green-600 hover:bg-green-700 text-white"
                            >
                              Pay
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => startEdit(debt)}
                          className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition"
                          title="Edit"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          onClick={() => deleteDebt(debt.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    <div className={`w-full h-2 rounded-full overflow-hidden ${progressBg}`}>
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${isPaidOff ? 'bg-green-500' : 'bg-blue-500'}`} 
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-right">
                      {remaining > 0 ? `${formatMoney(remaining)} remaining` : 'Fully paid!'}
                    </p>
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