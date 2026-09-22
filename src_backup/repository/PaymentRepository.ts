import { v4 as uuidv4 } from 'uuid';
import { db } from '../data/db';
import type { Payment } from '../types';

export class PaymentRepository {
  static async create(payment: Omit<Payment, 'id' | 'created_at'>): Promise<string> {
    const id = uuidv4();
    await db.payments.add({
      ...payment,
      id,
      created_at: new Date(),
    });
    return id;
  }

  static async getByAccountId(accountId: string): Promise<Payment[]> {
    return await db.payments.where('account_id').equals(accountId).toArray();
  }
}
