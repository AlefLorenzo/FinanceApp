import { v4 as uuidv4 } from 'uuid';
import { db } from '../data/db';

const DEFAULT_WALLET_BALANCE_CENTS = 0;

export class WalletService {
  static async adjustBalance(newBalanceCents: number): Promise<void> {
    if (!Number.isFinite(newBalanceCents) || isNaN(newBalanceCents)) {
      throw new Error('Valor inválido para o saldo.');
    }
    
    // Ensure integer
    newBalanceCents = Math.round(newBalanceCents);

    await db.transaction('rw', db.wallets, db.transactions, async () => {
      const wallets = await db.wallets.toArray();
      const now = new Date();
      let wallet = wallets[0];

      if (!wallet) {
        wallet = {
          id: 'default',
          name: 'Minha Conta',
          balance_cents: DEFAULT_WALLET_BALANCE_CENTS,
          created_at: now,
          updated_at: now,
        };
        await db.wallets.add(wallet);
      }

      const difference = newBalanceCents - wallet.balance_cents;

      // If exactly the same, do nothing
      if (difference === 0) return;

      // Update wallet balance
      await db.wallets.update(wallet.id, {
        balance_cents: newBalanceCents,
        updated_at: now,
      });

      // Register historical transaction
      await db.transactions.add({
        id: uuidv4(),
        wallet_id: wallet.id,
        reference_id: 'manual',
        type: 'manual_adjustment',
        amount_cents: difference,
        date: now,
        description: 'Ajuste manual de saldo',
        created_at: now,
      });
    });
  }

  static async reconcileWallet(): Promise<{ storedBalance: number, calculatedBalance: number, difference: number, isConsistent: boolean }> {
    const wallets = await db.wallets.toArray();
    const storedBalance = wallets.length > 0 ? wallets[0].balance_cents : 0;

    const transactions = await db.transactions.toArray();
    let calculatedBalance = 0;
    
    for (const tx of transactions) {
      calculatedBalance += tx.amount_cents;
    }

    const difference = storedBalance - calculatedBalance;
    
    return {
      storedBalance,
      calculatedBalance,
      difference,
      isConsistent: difference === 0
    };
  }
}
