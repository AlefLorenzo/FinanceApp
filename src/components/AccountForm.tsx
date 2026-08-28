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

  const resetForm = () => {
    setTitle('');
    setAmountCents(0);
    setDueDate(getTodayISO());
    setType('expense');
  };

  const closeForm = () => {
    setOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || amountCents <= 0) return;

    if (type === 'income') {
      await IncomeRepository.create({
        title: title.trim(),
        amount_cents: amountCents,
        expected_date: dueDate,
        status: 'pending',
        category_id: 'default',
      });
    } else {
      await addAccount({
        title: title.trim(),
        amount_cents: amountCents,
        due_date: dueDate,
        type: 'expense',
        status: 'pending',
        category_id: 'default',
      });
    }

    closeForm();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full min-h-[56px] flex items-center justify-center gap-2 px-4 py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-sm hover:bg-blue-700 active:scale-[0.98] transition text-base"
      >
        <PlusCircle className="w-5 h-5 shrink-0" />
        <span>Nova Conta</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm overflow-y-auto"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeForm();
          }}
        >
          <div className="min-h-full w-full flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div
              className="relative w-full sm:max-w-lg bg-white rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center pt-3 sm:hidden">
                <div className="w-10 h-1.5 rounded-full bg-gray-200" />
              </div>

              <div className="flex items-center justify-between px-5 sm:px-6 pt-4 sm:pt-6 pb-4 border-b border-gray-100">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-gray-900">
                    Adicionar Conta
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    Cadastre uma despesa ou receita
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeForm}
                  className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200 transition"
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="max-h-[calc(100dvh-100px)] sm:max-h-[calc(100dvh-140px)] overflow-y-auto overscroll-contain">
                <form
                  onSubmit={handleSubmit}
                  className="p-5 sm:p-6 space-y-5"
                >
                  <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => setType('expense')}
                      className={`min-h-[46px] rounded-xl font-bold text-sm transition ${
                        type === 'expense'
                          ? 'bg-white shadow text-red-600'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      🔴 Despesa
                    </button>

                    <button
                      type="button"
                      onClick={() => setType('income')}
                      className={`min-h-[46px] rounded-xl font-bold text-sm transition ${
                        type === 'income'
                          ? 'bg-white shadow text-green-600'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      🟢 Receita
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Título
                    </label>

                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full min-h-[52px] border border-gray-200 rounded-xl px-4 py-3 text-base bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                      placeholder="Ex.: Internet, Salário..."
                      autoComplete="off"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Valor
                      </label>

                      <MoneyInput
                        valueCents={amountCents}
                        onChangeCents={setAmountCents}
                        className="w-full min-h-[52px] border border-gray-200 rounded-xl px-4 py-3 text-base bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Vencimento
                      </label>

                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full min-h-[52px] border border-gray-200 rounded-xl px-4 py-3 text-base bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="pt-2 pb-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={closeForm}
                      className="order-2 sm:order-1 min-h-[52px] px-4 rounded-xl border border-gray-200 bg-white text-gray-700 font-bold hover:bg-gray-50 active:scale-[0.98] transition"
                    >
                      Cancelar
                    </button>

                    <button
                      type="submit"
                      className="order-1 sm:order-2 min-h-[52px] px-4 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 active:scale-[0.98] transition"
                    >
                      Salvar Conta
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
