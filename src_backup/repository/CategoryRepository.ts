import { v4 as uuidv4 } from 'uuid';
import { db } from '../data/db';
import type { Category } from '../types';

export class CategoryRepository {
  static async create(category: Omit<Category, 'id' | 'created_at'>): Promise<string> {
    const id = uuidv4();
    await db.categories.add({
      ...category,
      id,
      created_at: new Date(),
    });
    return id;
  }

  static async getAll(): Promise<Category[]> {
    return await db.categories.toArray();
  }

  static async delete(id: string): Promise<void> {
    await db.categories.delete(id);
  }
}
