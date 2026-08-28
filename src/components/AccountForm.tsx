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
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setTitle('');
    setAmountCents(0);
    setDueDate(getTodayISO());
    setType('expense');
    setSaving(false);
  };

  const closeForm = () => {
    if (saving) return;
    setOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || amountCents <= 0 || saving) {
      return;
    }

    try {
      setSaving(true);

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

      setOpen(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao cadastrar conta:', error);
      setSaving(false);
    }
  };

  return (
    <>
      {/* Botão principal */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-blue-600 text-white font-bold rounded-2xl shadow-sm hover:bg-blue-700 active:scale-[.98] transition text-base"
      >
        <PlusCircle className="w-5 h-5 shrink-0" />
        Nova Conta
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeForm();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-form-title"
            className="w-full sm:max-w-lg bg-white rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[90dvh] overflow-hidden animate-page"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Indicador mobile */}
            <div className="flex justify-center pt-3 pb-2 shrink-0 sm:hidden">
              <div className="w-10 h-1.5 bg-gray-200 rounded-full" />
            </div>

            {/* Cabeçalho fixo */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100 shrink-0">
              <div>
                <h2
                  id="account-form-title"
                  className="text-xl font-black text-gray-900"
                >
                  Adicionar Conta
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Cadastre uma despesa ou receita
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full transition disabled:opacity-50"
                aria-label="Fechar"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Conteúdo rolável */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              <form
                id="account-form"
                onSubmit={handleSubmit}
                className="px-5 sm:px-6 py-5 space-y-5 pb-6"
              >
                {/* Tipo */}
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-wide mb-2">
                    Tipo
                  </label>

                  <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1.5 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => setType('expense')}
                      className={`min-h-12 rounded-xl font-bold text-sm transition ${
                        type === 'expense'
                          ? 'bg-white shadow-sm text-red-600'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      🔴 Despesa
                    </button>

                    <button
                      type="button"
                      onClick={() => setType('income')}
                      className={`min-h-12 rounded-xl font-bold text-sm transition ${
                        type === 'income'
                          ? 'bg-white shadow-sm text-green-600'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      🟢 Receita
                    </button>
                  </div>
                </div>

                {/* Título */}
                <div>
                  <label
                    htmlFor="account-title"
                    className="block text-sm font-bold text-gray-700 mb-1.5"
                  >
                    Título
                  </label>

                  <input
                    id="account-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full min-h-12 border border-gray-200 rounded-xl px-4 py-3 text-base bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition"
                    placeholder={
                      type === 'expense'
                        ? 'Ex.: Internet, aluguel, energia...'
                        : 'Ex.: Salário, freelance...'
                    }
                    autoComplete="off"
                    required
                  />
                </div>

                {/* Valor */}
                <div>
                  <label
                    htmlFor="account-amount"
                    className="block text-sm font-bold text-gray-700 mb-1.5"
                  >
                    Valor
                  </label>

                  <MoneyInput
                    id="account-amount"
                    valueCents={amountCents}
                    onChangeCents={setAmountCents}
                    className="w-full min-h-12 border border-gray-200 rounded-xl px-4 py-3 text-base bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition"
                    required
                  />
                </div>

                {/* Data */}
                <div>
                  <label
                    htmlFor="account-due-date"
                    className="block text-sm font-bold text-gray-700 mb-1.5"
                  >
                    {type === 'expense'
                      ? 'Data de vencimento'
                      : 'Data prevista'}
                  </label>

                  <input
                    id="account-due-date"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full min-h-12 border border-gray-200 rounded-xl px-4 py-3 text-base bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition"
                    required
                  />
                </div>
              </form>
            </div>

            {/* Rodapé fixo */}
            <div className="border-t border-gray-100 bg-white px-5 sm:px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] shrink-0">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="flex-1 min-h-12 rounded-xl border border-gray-200 bg-white text-gray-700 font-bold hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  form="account-form"
                  disabled={
                    saving ||
                    !title.trim() ||
                    amountCents <= 0 ||
                    !dueDate
                  }
                  className="flex-[1.5] min-h-12 rounded-xl bg-blue-600 text-white font-black hover:bg-blue-700 active:scale-[.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Salvando...' : 'Salvar Conta'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
