import React, { useState } from 'react';
import { useAccounts } from '../hooks/useAccounts';
import { IncomeRepository } from '../repository/IncomeRepository';
import { getTodayISO } from '../utils/date';
import { PlusCircle, X } from 'lucide-react';
import { MoneyInput } from './ui/MoneyInput';

export function AccountForm() {
  const { addAccount } = useAccounts();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [amountCents, setAmountCents] = useState(0);
  const [dueDate, setDueDate] = useState(getTodayISO());
  const [type, setType] = useState<'expense' | 'income'>('expense');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amountCents) return;
    if (type === 'income') {
      await IncomeRepository.create({
        title,
        amount_cents: amountCents,
        expected_date: dueDate,
        status: 'pending',
        category_id: 'default',
      });
    } else {
      await addAccount({
        title,
        amount_cents: amountCents,
        due_date: dueDate,
        type: 'expense',
        status: 'pending',
        category_id: 'default',
      });
    }
    setTitle('');
    setAmountCents(0);
    setDueDate(getTodayISO());
    setOpen(false);
  };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-sm hover:bg-blue-700 active:scale-[.98] transition text-base"
      >
        <PlusCircle className="w-5 h-5" /> Nova Conta
      </button>

      {/* Bottom-sheet modal */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-t-[2rem] w-full max-w-md modal-sheet animate-page"
            onClick={e => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1.5 bg-gray-200 rounded-full" />
            </div>

            <div className="px-6 pb-10 pt-2">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-gray-900">Adicionar Conta</h2>
                <button
                  onClick={() => setOpen(false)}
                  className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 rounded-full transition"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Type toggle */}
                <div className="flex gap-2 bg-gray-100 p-1 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setType('expense')}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition ${type === 'expense' ? 'bg-white shadow text-red-600' : 'text-gray-500'}`}
                  >
                    🔴 Despesa
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('income')}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition ${type === 'income' ? 'bg-white shadow text-green-600' : 'text-gray-500'}`}
                  >
                    🟢 Receita
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1.5">Título</label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-3.5 text-base focus:outline-none focus:border-blue-400"
                    placeholder="Ex: Internet, Salário..."
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1.5">Valor</label>
                    <MoneyInput
                      valueCents={amountCents}
                      onChangeCents={setAmountCents}
                      className="w-full border border-gray-200 rounded-xl p-3.5 text-base focus:outline-none focus:border-blue-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1.5">Vencimento</label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={e => setDueDate(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl p-3.5 text-base focus:outline-none focus:border-blue-400"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 active:scale-[.98] transition text-base mt-2"
                >
                  Salvar
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
