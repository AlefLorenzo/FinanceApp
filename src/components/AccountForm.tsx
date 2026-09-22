import React, { useState } from 'react';
import { useAccounts } from '../hooks/useAccounts';
import { IncomeRepository } from '../repository/IncomeRepository';
import { getTodayISO } from '../utils/date';
import { PlusCircle, X } from 'lucide-react';
import { MoneyInput } from './ui/MoneyInput';
import { useToast } from './ui/ToastContext';

type AccountType = 'expense' | 'income';

interface AccountFormProps {
  type?: AccountType;
}

export function AccountForm({ type = 'expense' }: AccountFormProps) {
  const { addAccount } = useAccounts();
  const { showToast } = useToast();

  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [title, setTitle] = useState('');
  const [amountCents, setAmountCents] = useState(0);
  const [dueDate, setDueDate] = useState(getTodayISO());

  const resetForm = () => {
    setTitle('');
    setAmountCents(0);
    setDueDate(getTodayISO());
  };

  const closeForm = () => {
    setClosing(true);
    setTimeout(() => {
      setOpen(false);
      setClosing(false);
      resetForm();
    }, 200); // 200ms para a animação fade-out/slide-down
  };

  // Suporte a ESC
  React.useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeForm();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || amountCents <= 0) return;

    try {
      if (type === 'income') {
        await IncomeRepository.create({
          title: title.trim(),
          amount_cents: amountCents,
          expected_date: dueDate,
          status: 'pending',
          category_id: 'default',
        });
        showToast(`Receita adicionada · ${title.trim()}`, 'success');
      } else {
        await addAccount({
          title: title.trim(),
          amount_cents: amountCents,
          due_date: dueDate,
          type: 'expense',
          status: 'pending',
          category_id: 'default',
        });
        showToast(`Despesa adicionada · ${title.trim()}`, 'success');
      }
    } catch {
      showToast('Erro ao salvar. Tente novamente.', 'error');
    }

    closeForm();
  };

  const isExpense = type === 'expense';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`w-full min-h-[58px] flex items-center justify-center gap-2 px-4 py-4 text-white font-black rounded-2xl shadow-sm active:scale-[0.98] transition text-base ${
          isExpense
            ? 'bg-red-600 hover:bg-red-700'
            : 'bg-green-600 hover:bg-green-700'
        }`}
      >
        <PlusCircle className="w-5 h-5 shrink-0" />

        <span>
          {isExpense ? 'Nova Despesa' : 'Nova Receita'}
        </span>
      </button>

      {open && (
        <div
          className={`fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm overflow-y-auto ${closing ? 'animate-out fade-out' : 'animate-in fade-in'}`}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeForm();
          }}
        >
          <div className="min-h-full w-full flex items-center justify-center p-4">
            <div
              className={`relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden ${closing ? 'animate-out slide-out-to-bottom-8 duration-200' : 'animate-in slide-in-from-bottom-8 duration-200'}`}
              onMouseDown={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >

              <div className="flex items-center justify-between px-5 sm:px-6 py-5 border-b border-gray-100">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-gray-900">
                    {isExpense ? 'Adicionar Despesa' : 'Adicionar Receita'}
                  </h2>

                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    {isExpense
                      ? 'Cadastre uma conta que precisa pagar'
                      : 'Cadastre um valor que espera receber'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeForm}
                  className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <form
                onSubmit={handleSubmit}
                className="p-5 sm:p-6 space-y-5"
              >

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    {isExpense ? 'Nome da despesa' : 'Nome da receita'}
                  </label>

                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full min-h-[52px] border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                    placeholder={
                      isExpense
                        ? 'Ex.: Internet, Energia...'
                        : 'Ex.: Salário, Freelance...'
                    }
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
                      className="w-full min-h-[52px] border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      {isExpense ? 'Vencimento' : 'Data prevista'}
                    </label>

                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full min-h-[52px] border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                      required
                    />
                  </div>

                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">

                  <button
                    type="button"
                    onClick={closeForm}
                    className="min-h-[52px] rounded-xl border border-gray-200 bg-white text-gray-700 font-bold hover:bg-gray-50 transition"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className={`min-h-[52px] rounded-xl text-white font-bold transition ${
                      isExpense
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {isExpense ? 'Salvar Despesa' : 'Salvar Receita'}
                  </button>

                </div>

              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
