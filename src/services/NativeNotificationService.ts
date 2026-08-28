/**
 * NativeNotificationService.ts
 *
 * Handles scheduling and cancellation of native Android notifications
 * for FinanceApp bill/income due date reminders.
 *
 * Architecture:
 *   - Runs ONLY inside Cordova/Android (guarded by isCordovaAndroid())
 *   - Uses the local FinanceNotifications Cordova plugin (window.FinanceNotifications)
 *   - Never throws — silently no-ops in web/PWA context
 *   - IDs are deterministic (no Math.random)
 *
 * Notification IDs (must be integers for Android):
 *   expense_tomorrow_<accountId> → hash → int
 *   expense_today_<accountId>   → hash → int
 *   income_tomorrow_<incomeId>  → hash → int
 *   income_today_<incomeId>     → hash → int
 *
 * Trigger time: 09:00 local time on the alert day.
 */

import { db } from '../data/db';
import { formatBRLFromCents } from '../utils/currency';

// ── Helpers ────────────────────────────────────────────────────────────────

/** Detects if running inside Cordova on Android. */
function isCordovaAndroid(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof (window as any).cordova !== 'undefined' &&
    (window as any).cordova.platformId === 'android'
  );
}

/** Low-collision djb2-based string-to-positive-int hash. */
function hashToInt(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  // Mask to positive 31-bit integer (Android notification ID must be positive int)
  return Math.abs(hash & 0x7fffffff);
}

/**
 * Converts a YYYY-MM-DD date string to a JS Date at 09:00 local time.
 * Avoids UTC midnight pitfall (new Date("2026-08-29") = UTC midnight = off by timezone).
 */
function localDateAt9am(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day, 9, 0, 0, 0); // local 09:00
  return d;
}

/** Returns today's date string YYYY-MM-DD in local time. */
function getTodayLocal(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Returns tomorrow's date string YYYY-MM-DD in local time. */
function getTomorrowLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Formats amount_cents for display in notification text. */
function formatAmount(cents: number): string {
  return formatBRLFromCents(cents);
}

// ── Plugin bridge ──────────────────────────────────────────────────────────

interface FinanceNotifPlugin {
  requestPermission: (ok: (r: string) => void, err: (e: string) => void) => void;
  createChannel: (ok: (r: string) => void, err: (e: string) => void) => void;
  schedule: (
    id: number, title: string, message: string, triggerAtMillis: number,
    ok: (r: string) => void, err: (e: string) => void
  ) => void;
  cancel: (id: number, ok: (r: string) => void, err: (e: string) => void) => void;
  cancelAll: (ok: (r: string) => void, err: (e: string) => void) => void;
}

function getPlugin(): FinanceNotifPlugin | null {
  if (!isCordovaAndroid()) return null;
  return (window as any).FinanceNotifications as FinanceNotifPlugin ?? null;
}

function pluginSchedule(id: number, title: string, message: string, triggerMs: number): Promise<void> {
  return new Promise((resolve) => {
    const plugin = getPlugin();
    if (!plugin) { resolve(); return; }
    plugin.schedule(id, title, message, triggerMs,
      () => resolve(),
      (e) => { console.warn('[FinanceNotif] schedule error', e); resolve(); }
    );
  });
}

function pluginCancel(id: number): Promise<void> {
  return new Promise((resolve) => {
    const plugin = getPlugin();
    if (!plugin) { resolve(); return; }
    plugin.cancel(id,
      () => resolve(),
      (e) => { console.warn('[FinanceNotif] cancel error', e); resolve(); }
    );
  });
}

// ── Public API ─────────────────────────────────────────────────────────────

export const NativeNotificationService = {

  /** Call once after deviceready. Sets up channel and permission. */
  async init(): Promise<void> {
    if (!isCordovaAndroid()) return;
    const plugin = getPlugin();
    if (!plugin) return;

    // Create notification channel
    await new Promise<void>((resolve) => {
      plugin.createChannel(() => resolve(), () => resolve());
    });

    // Request POST_NOTIFICATIONS permission (Android 13+)
    await new Promise<void>((resolve) => {
      plugin.requestPermission(
        (result) => {
          console.log('[FinanceNotif] Permission:', result);
          resolve();
        },
        () => resolve()
      );
    });
  },

  /** Schedule a reminder for an expense (account). */
  async scheduleExpenseReminder(
    accountId: string,
    title: string,
    amountCents: number,
    dueDate: string
  ): Promise<void> {
    if (!isCordovaAndroid()) return;

    const today = getTodayLocal();
    const tomorrow = getTomorrowLocal();

    if (dueDate === today) {
      // "vence hoje" → 09:00 today
      const triggerMs = localDateAt9am(dueDate).getTime();
      const id = hashToInt(`expense_today_${accountId}`);
      const msg = `A conta "${title}" vence hoje. Valor: ${formatAmount(amountCents)}`;
      await pluginSchedule(id, 'Conta vence hoje', msg, triggerMs);

    } else if (dueDate === tomorrow) {
      // "vence amanhã" → 09:00 tomorrow
      const triggerMs = localDateAt9am(dueDate).getTime();
      const id = hashToInt(`expense_tomorrow_${accountId}`);
      const msg = `A conta "${title}" vence amanhã. Valor: ${formatAmount(amountCents)}`;
      await pluginSchedule(id, 'Conta vence amanhã', msg, triggerMs);
    }
  },

  /** Schedule a reminder for income. */
  async scheduleIncomeReminder(
    incomeId: string,
    title: string,
    amountCents: number,
    expectedDate: string
  ): Promise<void> {
    if (!isCordovaAndroid()) return;

    const today = getTodayLocal();
    const tomorrow = getTomorrowLocal();

    if (expectedDate === today) {
      const triggerMs = localDateAt9am(expectedDate).getTime();
      const id = hashToInt(`income_today_${incomeId}`);
      const msg = `Você deve receber "${title}" hoje. Valor: ${formatAmount(amountCents)}`;
      await pluginSchedule(id, 'Receita prevista para hoje', msg, triggerMs);

    } else if (expectedDate === tomorrow) {
      const triggerMs = localDateAt9am(expectedDate).getTime();
      const id = hashToInt(`income_tomorrow_${incomeId}`);
      const msg = `Você deve receber "${title}" amanhã. Valor: ${formatAmount(amountCents)}`;
      await pluginSchedule(id, 'Receita prevista para amanhã', msg, triggerMs);
    }
  },

  /** Cancel all reminders for an expense (call when paid/deleted/date changed). */
  async cancelExpenseReminder(accountId: string): Promise<void> {
    if (!isCordovaAndroid()) return;
    await pluginCancel(hashToInt(`expense_today_${accountId}`));
    await pluginCancel(hashToInt(`expense_tomorrow_${accountId}`));
  },

  /** Cancel all reminders for an income (call when received/deleted/date changed). */
  async cancelIncomeReminder(incomeId: string): Promise<void> {
    if (!isCordovaAndroid()) return;
    await pluginCancel(hashToInt(`income_today_${incomeId}`));
    await pluginCancel(hashToInt(`income_tomorrow_${incomeId}`));
  },

  /**
   * Master sync — call on app start.
   * 1. Reads all pending expenses/incomes from Dexie.
   * 2. Re-schedules reminders for today/tomorrow.
   * (AlarmManager de-dupes by PendingIntent ID, so re-scheduling
   *  the same ID just updates/replaces, no duplicates.)
   */
  async syncAllReminders(): Promise<void> {
    if (!isCordovaAndroid()) return;

    const today = getTodayLocal();
    const tomorrow = getTomorrowLocal();

    // -- Expenses --
    const accounts = await db.accounts.toArray();
    for (const account of accounts) {
      if (account.status !== 'pending') {
        // Cancel any stale reminders for paid/cancelled accounts
        await NativeNotificationService.cancelExpenseReminder(account.id);
        continue;
      }
      if (account.due_date === today || account.due_date === tomorrow) {
        await NativeNotificationService.scheduleExpenseReminder(
          account.id,
          account.title,
          account.amount_cents,
          account.due_date
        );
      } else {
        // Out of alert window — cancel any stale reminders
        await NativeNotificationService.cancelExpenseReminder(account.id);
      }
    }

    // -- Incomes --
    const incomes = await db.income.toArray();
    for (const income of incomes) {
      if (income.status !== 'pending') {
        await NativeNotificationService.cancelIncomeReminder(income.id);
        continue;
      }
      if (income.expected_date === today || income.expected_date === tomorrow) {
        await NativeNotificationService.scheduleIncomeReminder(
          income.id,
          income.title,
          income.amount_cents,
          income.expected_date
        );
      } else {
        await NativeNotificationService.cancelIncomeReminder(income.id);
      }
    }

    console.log('[FinanceNotif] syncAllReminders complete');
  },
};
