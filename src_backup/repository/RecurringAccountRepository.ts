import { v4 as uuidv4 } from 'uuid';
import { db } from '../data/db';
import type { RecurringAccount } from '../types';

export class RecurringAccountRepository {
  static async create(recurring: Omit<RecurringAccount, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    const id = uuidv4();
    const now = new Date();
    await db.recurring_accounts.add({
      ...recurring,
      id,
      created_at: now,
      updated_at: now,
    });
    return id;
  }

  static async getAllActive(): Promise<RecurringAccount[]> {
    // Note: IndexedDB booleans need special handling sometimes, but dexie handles it well. 
    // If querying boolean, we filter in memory or index as number (0/1) for better performance later.
    const all = await db.recurring_accounts.toArray();
    return all.filter(r => r.active);
  }
}
