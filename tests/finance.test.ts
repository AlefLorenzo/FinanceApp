import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../src/data/db';
import { AccountRepository } from '../src/repository/AccountRepository';
import { IncomeRepository } from '../src/repository/IncomeRepository';
import { FinancialEngine } from '../src/services/FinancialEngine';

// Helpers to clear db between tests
async function clearDatabase() {
  await db.accounts.clear();
  await db.income.clear();
  await db.payments.clear();
  await db.transactions.clear();
  await db.wallets.clear();
  await db.reserves.clear();
  await db.debts.clear();
  await db.debt_installments.clear();
}

describe('Módulo Financeiro Core - Fase 1', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  describe('Regras Financeiras de Saldo (Wallet Balance)', () => {
    it('deve inicializar a carteira com R$ 3900 se não existir', async () => {
      // Create a pending account
      const accountId = await AccountRepository.create({
        title: 'Aluguel',
        amount_cents: 100000,
        due_date: '2026-09-01',
        type: 'expense',
        status: 'pending',
        category_id: 'default',
      });

      // Wallet should not be created yet or is created during markAsPaid
      let wallets = await db.wallets.toArray();
      expect(wallets.length).toBe(0);

      // Mark as paid triggers wallet creation
      await AccountRepository.markAsPaid(accountId);
      wallets = await db.wallets.toArray();
      expect(wallets.length).toBe(1);
      expect(wallets[0].balance_cents).toBe(390000 - 100000); // 3900 - 1000 = 2900
    });

    it('conta cadastrada (pendente) não altera saldo real', async () => {
      // Setup wallet
      await db.wallets.add({ id: 'w1', name: 'Minha Conta', balance_cents: 300000, created_at: new Date(), updated_at: new Date() });

      // Create a pending expense
      await AccountRepository.create({
        title: 'Internet',
        amount_cents: 10000,
        due_date: '2026-09-01',
        type: 'expense',
        status: 'pending',
        category_id: 'default',
      });

      const wallet = await db.wallets.get('w1');
      expect(wallet?.balance_cents).toBe(300000); // Balanço não mudou!
    });

    it('conta paga altera o saldo real e gera transação', async () => {
      await db.wallets.add({ id: 'w1', name: 'Minha Conta', balance_cents: 300000, created_at: new Date(), updated_at: new Date() });

      const accountId = await AccountRepository.create({
        title: 'Internet',
        amount_cents: 10000,
        due_date: '2026-09-01',
        type: 'expense',
        status: 'pending',
        category_id: 'default',
      });

      await AccountRepository.markAsPaid(accountId);

      const wallet = await db.wallets.get('w1');
      expect(wallet?.balance_cents).toBe(290000); // 3000 - 100 = 2900

      // Check transactions
      const txs = await db.transactions.toArray();
      expect(txs.length).toBe(1);
      expect(txs[0].type).toBe('expense_paid');
      expect(txs[0].amount_cents).toBe(-10000);
      expect(txs[0].reference_id).toBe(accountId);
    });

    it('receita pendente (prevista) não altera saldo real', async () => {
      await db.wallets.add({ id: 'w1', name: 'Minha Conta', balance_cents: 300000, created_at: new Date(), updated_at: new Date() });

      await IncomeRepository.create({
        title: 'Salário',
        amount_cents: 390000,
        expected_date: '2026-09-05',
        status: 'pending',
        category_id: 'default',
      });

      const wallet = await db.wallets.get('w1');
      expect(wallet?.balance_cents).toBe(300000); // Balanço não mudou!
    });

    it('receita recebida aumenta saldo real e gera transação', async () => {
      await db.wallets.add({ id: 'w1', name: 'Minha Conta', balance_cents: 300000, created_at: new Date(), updated_at: new Date() });

      const incomeId = await IncomeRepository.create({
        title: 'Freelance',
        amount_cents: 50000,
        expected_date: '2026-09-05',
        status: 'pending',
        category_id: 'default',
      });

      await IncomeRepository.markAsReceived(incomeId);

      const wallet = await db.wallets.get('w1');
      expect(wallet?.balance_cents).toBe(350000); // 3000 + 500 = 3500

      const txs = await db.transactions.toArray();
      expect(txs.length).toBe(1);
      expect(txs[0].type).toBe('income_received');
      expect(txs[0].amount_cents).toBe(50000);
    });

    it('receita cancelada não afeta o saldo', async () => {
      await db.wallets.add({ id: 'w1', name: 'Minha Conta', balance_cents: 300000, created_at: new Date(), updated_at: new Date() });

      const incomeId = await IncomeRepository.create({
        title: 'Bônus Cancelado',
        amount_cents: 100000,
        expected_date: '2026-09-05',
        status: 'pending',
        category_id: 'default',
      });

      await IncomeRepository.updateStatus(incomeId, 'cancelled');

      const wallet = await db.wallets.get('w1');
      expect(wallet?.balance_cents).toBe(300000); // Continua igual
    });
  });

  describe('Prevenção de Duplicidades e Atomocidade', () => {
    it('não deve processar pagamento de despesa duas vezes', async () => {
      await db.wallets.add({ id: 'w1', name: 'Minha Conta', balance_cents: 300000, created_at: new Date(), updated_at: new Date() });

      const accountId = await AccountRepository.create({
        title: 'Energia',
        amount_cents: 15000,
        due_date: '2026-09-02',
        type: 'expense',
        status: 'pending',
        category_id: 'default',
      });

      // Process first time
      await AccountRepository.markAsPaid(accountId);
      
      // Process second time (should be ignored safely)
      await AccountRepository.markAsPaid(accountId);

      const wallet = await db.wallets.get('w1');
      expect(wallet?.balance_cents).toBe(285000); // Subtracted only once!
      
      const txs = await db.transactions.toArray();
      expect(txs.length).toBe(1); // One transaction log
    });

    it('não deve processar recebimento de receita duas vezes', async () => {
      await db.wallets.add({ id: 'w1', name: 'Minha Conta', balance_cents: 300000, created_at: new Date(), updated_at: new Date() });

      const incomeId = await IncomeRepository.create({
        title: 'Salário',
        amount_cents: 390000,
        expected_date: '2026-09-05',
        status: 'pending',
        category_id: 'default',
      });

      await IncomeRepository.markAsReceived(incomeId);
      await IncomeRepository.markAsReceived(incomeId);

      const wallet = await db.wallets.get('w1');
      expect(wallet?.balance_cents).toBe(690000); // Added only once!
      
      const txs = await db.transactions.toArray();
      expect(txs.length).toBe(1);
    });
  });

  describe('FinancialEngine & useBalance Calculations', () => {
    it('deve calcular corretamente Saldo Projetado e Dinheiro Livre', async () => {
      // 1. Setup Wallet Balance (Saldo Atual)
      await db.wallets.add({ id: 'w1', name: 'Minha Conta', balance_cents: 200000, created_at: new Date(), updated_at: new Date() }); // R$ 2000

      // 2. Setup Pending Expenses (Contas Futuras) -> Total R$ 1200
      const exp1: any = {
        id: 'e1',
        title: 'Internet',
        amount_cents: 20000,
        due_date: '2026-09-10',
        type: 'expense',
        status: 'pending',
        category_id: 'default',
      };
      const exp2: any = {
        id: 'e2',
        title: 'Supermercado',
        amount_cents: 100000,
        due_date: '2026-09-15',
        type: 'expense',
        status: 'pending',
        category_id: 'default',
      };

      // 3. Setup Pending Incomes (Receitas Futuras) -> Total R$ 4000
      const inc1: any = {
        id: 'i1',
        title: 'Freelance 1',
        amount_cents: 150000,
        expected_date: '2026-09-05',
        status: 'pending',
        category_id: 'default',
      };
      const inc2: any = {
        id: 'i2',
        title: 'Freelance 2',
        amount_cents: 250000,
        expected_date: '2026-09-20',
        status: 'pending',
        category_id: 'default',
      };

      // reserves (R$ 0 target)
      const reserves: any[] = [];

      // Calculate Summary (new API: calculateSummary)
      const currentBalanceCents = 200000;
      const plan = FinancialEngine.calculateSummary([exp1, exp2], [inc1, inc2], [], currentBalanceCents);
      
      // expectedIncomeCents = 150000 + 250000 = 400000
      expect(plan.expectedIncomeCents).toBe(400000);
      // totalExpensesCents = 20000 + 100000 = 120000
      expect(plan.totalExpensesCents).toBe(120000);
      // freeMoneyCents = expectedIncomeCents (400000) - totalExpensesCents (120000) - suggestedReserveCents (0) = 280000
      expect(plan.freeMoneyCents).toBe(280000);

      // projectedBalanceCents = currentBalance (200000) + pendingIncomes (400000) - pendingExpenses (120000) = 480000
      expect(plan.projectedBalanceCents).toBe(480000);
    });
  });
});

import { DebtRepository } from '../src/repository/DebtRepository';
import { DebtService } from '../src/services/DebtService';
import { getTodayISO } from '../src/utils/date';

describe('Fase 2 - Módulo de Dívidas', () => {
  beforeEach(async () => {
    await clearDatabase();
    await db.wallets.add({ id: 'default', name: 'Minha Conta', balance_cents: 1000000, created_at: new Date(), updated_at: new Date() });
  });

  it('Criação de dívida gera N parcelas + N Accounts herdando categoria', async () => {
    const debtId = await DebtRepository.create({
      title: 'Empréstimo',
      creditor: 'Banco',
      category_id: 'cat_emp',
      original_amount_cents: 120000,
      total_installments: 3,
      installment_amount_cents: 40000,
      first_due_date: '2026-09-01'
    });

    const insts = await db.debt_installments.where('debt_id').equals(debtId).toArray();
    expect(insts.length).toBe(3);
    
    // Check accounts
    const accs = await db.accounts.where('debtId').equals(debtId).toArray();
    expect(accs.length).toBe(3);
    expect(accs[0].category_id).toBe('cat_emp');
    expect(accs[0].status).toBe('pending');
  });

  it('Parcela pendente NÃO altera saldo', async () => {
    await DebtRepository.create({
      title: 'Empréstimo',
      creditor: 'Banco',
      category_id: 'cat_emp',
      original_amount_cents: 10000,
      total_installments: 1,
      installment_amount_cents: 10000,
      first_due_date: '2026-09-01'
    });

    const wallet = await db.wallets.get('default');
    expect(wallet?.balance_cents).toBe(1000000);
  });

  it('Pagamento integral de parcela debita saldo e marca como paid', async () => {
    const debtId = await DebtRepository.create({
      title: 'Empréstimo',
      creditor: 'Banco',
      category_id: 'cat_emp',
      original_amount_cents: 10000,
      total_installments: 1,
      installment_amount_cents: 10000,
      first_due_date: '2026-09-01'
    });

    const insts = await DebtRepository.getInstallments(debtId);
    await DebtRepository.payInstallment(insts[0].id, 10000);

    const wallet = await db.wallets.get('default');
    expect(wallet?.balance_cents).toBe(990000); // 1000000 - 10000

    const updatedInst = await db.debt_installments.get(insts[0].id);
    expect(updatedInst?.status).toBe('paid');

    const updatedAcc = await db.accounts.get(insts[0].account_id);
    expect(updatedAcc?.status).toBe('paid');
  });

  it('Pagamento parcial NÃO marca como paid, status vira partial, debita apenas valor pago', async () => {
    const debtId = await DebtRepository.create({
      title: 'Empréstimo',
      creditor: 'Banco',
      category_id: 'cat_emp',
      original_amount_cents: 48000,
      total_installments: 1,
      installment_amount_cents: 48000,
      first_due_date: '2026-09-01'
    });

    const insts = await DebtRepository.getInstallments(debtId);
    await DebtRepository.payInstallment(insts[0].id, 20000);

    const wallet = await db.wallets.get('default');
    expect(wallet?.balance_cents).toBe(980000); // 1000000 - 20000

    const updatedInst = await db.debt_installments.get(insts[0].id);
    expect(updatedInst?.status).toBe('partial');
    expect(updatedInst?.paid_amount_cents).toBe(20000);

    const updatedAcc = await db.accounts.get(insts[0].account_id);
    expect(updatedAcc?.status).toBe('pending'); // partial maps to pending in MVP for account
  });

  it('Pagamento do restante apos pagamento parcial', async () => {
    const debtId = await DebtRepository.create({
      title: 'Empréstimo',
      creditor: 'Banco',
      category_id: 'cat_emp',
      original_amount_cents: 48000,
      total_installments: 1,
      installment_amount_cents: 48000,
      first_due_date: '2026-09-01'
    });

    const insts = await DebtRepository.getInstallments(debtId);
    
    await DebtRepository.payInstallment(insts[0].id, 20000);
    expect((await db.wallets.get('default'))?.balance_cents).toBe(980000);
    
    await DebtRepository.payInstallment(insts[0].id, 28000);
    expect((await db.wallets.get('default'))?.balance_cents).toBe(952000); // 980000 - 28000

    const updatedInst = await db.debt_installments.get(insts[0].id);
    expect(updatedInst?.status).toBe('paid');
    expect(updatedInst?.paid_amount_cents).toBe(48000);
  });

  it('Tentativa de pagamento acima do restante capta no limite (nao debita extra)', async () => {
    const debtId = await DebtRepository.create({
      title: 'Empréstimo',
      creditor: 'Banco',
      category_id: 'cat_emp',
      original_amount_cents: 48000,
      total_installments: 1,
      installment_amount_cents: 48000,
      first_due_date: '2026-09-01'
    });
    const insts = await DebtRepository.getInstallments(debtId);
    
    await DebtRepository.payInstallment(insts[0].id, 50000);
    
    expect((await db.wallets.get('default'))?.balance_cents).toBe(952000); // 1000000 - 48000 limit
  });

  it('Pagamento duplicado de parcela já paga é ignorado', async () => {
    const debtId = await DebtRepository.create({
      title: 'Empréstimo',
      creditor: 'Banco',
      category_id: 'cat_emp',
      original_amount_cents: 48000,
      total_installments: 1,
      installment_amount_cents: 48000,
      first_due_date: '2026-09-01'
    });
    const insts = await DebtRepository.getInstallments(debtId);
    
    await DebtRepository.payInstallment(insts[0].id, 48000);
    await DebtRepository.payInstallment(insts[0].id, 48000);
    
    expect((await db.wallets.get('default'))?.balance_cents).toBe(952000); 
  });

  it('Parcela com due_date passada tem status calculado como overdue sem depender de update', async () => {
    const debtId = await DebtRepository.create({
      title: 'Empréstimo',
      creditor: 'Banco',
      category_id: 'cat_emp',
      original_amount_cents: 48000,
      total_installments: 1,
      installment_amount_cents: 48000,
      first_due_date: '2000-01-01' // Very old date
    });
    const insts = await DebtRepository.getInstallments(debtId);
    
    expect(insts[0].status).toBe('pending'); // Stored as pending
    expect(DebtService.getInstallmentStatus(insts[0])).toBe('overdue'); // Computed as overdue
  });

  it('Quitação total: débito é settlementAmount, não soma; e gera uma Transaction; marca td pago', async () => {
    const debtId = await DebtRepository.create({
      title: 'Empréstimo',
      creditor: 'Banco',
      category_id: 'cat_emp',
      original_amount_cents: 100000,
      total_installments: 2,
      installment_amount_cents: 50000,
      first_due_date: '2026-09-01'
    });
    
    await DebtRepository.settleDebt(debtId, 70000); // Quitação com desconto
    
    expect((await db.wallets.get('default'))?.balance_cents).toBe(930000); // 1000000 - 70000
    
    const txs = await db.transactions.where('reference_id').equals(debtId).toArray();
    expect(txs.length).toBe(1);
    expect(txs[0].type).toBe('debt_settlement');
    
    const insts = await DebtRepository.getInstallments(debtId);
    expect(insts.every(i => i.status === 'paid')).toBe(true);
    
    const debt = await db.debts.get(debtId);
    expect(debt?.status).toBe('paid_off');
  });

  it('Quitação dupla é ignorada', async () => {
    const debtId = await DebtRepository.create({
      title: 'Empréstimo',
      creditor: 'Banco',
      category_id: 'cat_emp',
      original_amount_cents: 100000,
      total_installments: 1,
      installment_amount_cents: 100000,
      first_due_date: '2026-09-01'
    });
    
    await DebtRepository.settleDebt(debtId, 70000);
    await DebtRepository.settleDebt(debtId, 70000);
    
    expect((await db.wallets.get('default'))?.balance_cents).toBe(930000); 
  });

  it('Inconsistência entre paid_installments e parcelas não quebra a fonte de verdade', async () => {
    const debtId = await DebtRepository.create({
      title: 'Empréstimo',
      creditor: 'Banco',
      category_id: 'cat_emp',
      original_amount_cents: 100000,
      total_installments: 1,
      installment_amount_cents: 100000,
      first_due_date: '2026-09-01'
    });
    const insts = await DebtRepository.getInstallments(debtId);
    
    // Simulate inconsistency manually
    await db.debts.update(debtId, { paid_installments: 5 }); 
    
    expect(DebtService.countPaidInstallments(insts)).toBe(0); // Computes properly
  });

  it('FinancialEngine calcula Debt metrics sem duplicar em despesas gerais', async () => {
    await DebtRepository.create({
      title: 'Carro',
      creditor: 'Banco',
      category_id: 'cat',
      original_amount_cents: 10000,
      total_installments: 1,
      installment_amount_cents: 10000,
      first_due_date: getTodayISO()
    });
    
    const accounts = await db.accounts.toArray();
    const insts = await db.debt_installments.toArray();
    
    const summary = FinancialEngine.calculateSummary(accounts, [], [], 1000000, insts);
    
    // It should be in totalExpensesCents via Accounts
    expect(summary.totalExpensesCents).toBe(10000);
    
    // And in totalDebtRemainingCents via Installments
    expect(summary.totalDebtRemainingCents).toBe(10000);
    
    // It should NOT be double counted in projected balance
    // 1000000 - 10000
    expect(summary.projectedBalanceCents).toBe(990000);
  });
});

