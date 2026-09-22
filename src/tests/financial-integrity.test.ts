import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../data/db';
import { AccountRepository } from '../repository/AccountRepository';
import { IncomeRepository } from '../repository/IncomeRepository';
import { WalletService } from '../services/WalletService';
import type { Account, Income } from '../types';

describe('Financial Integrity (FASE 1)', () => {
  beforeEach(async () => {
    // Clear all tables for fresh state
    await db.accounts.clear();
    await db.income.clear();
    await db.payments.clear();
    await db.transactions.clear();
    await db.wallets.clear();
  });

  describe('Wallet Invariant & Adjustments', () => {
    it('should create manual adjustment transaction', async () => {
      await WalletService.adjustBalance(15000);
      
      const res1 = await WalletService.reconcileWallet();
      expect(res1.storedBalance).toBe(15000);
      expect(res1.isConsistent).toBe(true);

      // Adjust again down to 5000
      await WalletService.adjustBalance(5000);
      
      const res2 = await WalletService.reconcileWallet();
      expect(res2.storedBalance).toBe(5000);
      expect(res2.isConsistent).toBe(true);
      
      const txs = await db.transactions.toArray();
      expect(txs).toHaveLength(2);
      expect(txs[0].amount_cents).toBe(15000);
      expect(txs[1].amount_cents).toBe(-10000); // 5000 - 15000
    });

    it('should ignore duplicate identical adjustments', async () => {
      await WalletService.adjustBalance(5000);
      await WalletService.adjustBalance(5000);
      const txs = await db.transactions.toArray();
      expect(txs).toHaveLength(1); // Only the first one created a transaction
    });
  });

  describe('Expenses', () => {
    it('should handle full expense lifecycle: create, pay, undo, delete', async () => {
      // 1. Create
      const accountId = await AccountRepository.create({
        title: 'Test Expense',
        amount_cents: 10000,
        due_date: '2026-10-01',
        category_id: 'default',
        status: 'pending',
        type: 'expense'
      });

      // 2. Pay R$ 100
      await AccountRepository.markAsPaid(accountId);
      
      let res = await WalletService.reconcileWallet();
      expect(res.storedBalance).toBe(-10000);
      expect(res.isConsistent).toBe(true);

      // Verify payment was created
      const payments = await db.payments.toArray();
      expect(payments).toHaveLength(1);

      // 3. Undo (Refund)
      await AccountRepository.markAsPending(accountId);
      
      res = await WalletService.reconcileWallet();
      expect(res.storedBalance).toBe(0);
      expect(res.isConsistent).toBe(true);
      
      let txs = await db.transactions.toArray();
      expect(txs).toHaveLength(2); // expense_paid (-10000) and expense_refund (+10000)
      
      const paymentsAfterUndo = await db.payments.toArray();
      expect(paymentsAfterUndo).toHaveLength(0);

      // 4. Delete pending
      await AccountRepository.delete(accountId);
      
      res = await WalletService.reconcileWallet();
      expect(res.storedBalance).toBe(0);
      expect(res.isConsistent).toBe(true);
      
      txs = await db.transactions.toArray();
      expect(txs).toHaveLength(2); // Unchanged
    });

    it('should handle deletion of a paid expense (generating refund automatically)', async () => {
      const accountId = await AccountRepository.create({
        title: 'Paid Expense Delete',
        amount_cents: 5000,
        due_date: '2026-10-01',
        category_id: 'default',
        status: 'pending',
        type: 'expense'
      });

      await AccountRepository.markAsPaid(accountId);
      let res = await WalletService.reconcileWallet();
      expect(res.storedBalance).toBe(-5000);

      // Delete the paid expense
      await AccountRepository.delete(accountId);
      
      res = await WalletService.reconcileWallet();
      expect(res.storedBalance).toBe(0);
      expect(res.isConsistent).toBe(true);
      
      const txs = await db.transactions.toArray();
      expect(txs).toHaveLength(2); // payment and refund before physical delete
    });
  });

  describe('Incomes', () => {
    it('should handle full income lifecycle: create, receive, undo, delete', async () => {
      const incomeId = await IncomeRepository.create({
        title: 'Salary',
        amount_cents: 50000,
        expected_date: '2026-10-01',
        category_id: 'default',
        status: 'pending'
      });

      // Receive
      await IncomeRepository.markAsReceived(incomeId);
      
      let res = await WalletService.reconcileWallet();
      expect(res.storedBalance).toBe(50000);
      expect(res.isConsistent).toBe(true);

      // Undo
      await IncomeRepository.markAsPending(incomeId);
      
      res = await WalletService.reconcileWallet();
      expect(res.storedBalance).toBe(0);
      expect(res.isConsistent).toBe(true);
      
      let txs = await db.transactions.toArray();
      expect(txs).toHaveLength(2); // income_received (+50000) and income_refund (-50000)

      // Delete pending
      await IncomeRepository.delete(incomeId);
      
      res = await WalletService.reconcileWallet();
      expect(res.storedBalance).toBe(0);
      expect(res.isConsistent).toBe(true);
    });

    it('should handle deletion of a received income (generating refund automatically)', async () => {
      const incomeId = await IncomeRepository.create({
        title: 'Bonus',
        amount_cents: 20000,
        expected_date: '2026-10-01',
        category_id: 'default',
        status: 'pending'
      });

      await IncomeRepository.markAsReceived(incomeId);
      
      // Delete directly
      await IncomeRepository.delete(incomeId);
      
      const res = await WalletService.reconcileWallet();
      expect(res.storedBalance).toBe(0);
      expect(res.isConsistent).toBe(true);
    });
  });
});
