import { useLiveQuery } from 'dexie-react-hooks';
import { AccountRepository } from '../repository/AccountRepository';
import type { Account } from '../types';

export function useAccounts() {
  const accounts = useLiveQuery(() => AccountRepository.getAllExpenses(), []);

  const addAccount = async (account: Omit<Account, 'id' | 'created_at' | 'updated_at'>) => {
    return await AccountRepository.create(account);
  };

  const togglePaid = async (id: string, isCurrentlyPaid: boolean) => {
    if (isCurrentlyPaid) {
      return await AccountRepository.markAsPending(id);
    } else {
      return await AccountRepository.markAsPaid(id);
    }
  };

  const deleteAccount = async (id: string) => {
    return await AccountRepository.delete(id);
  };

  return {
    accounts: accounts || [],
    addAccount,
    togglePaid,
    deleteAccount
  };
}
