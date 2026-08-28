export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  created_at: Date;
}

export type AccountStatus = 'pending' | 'paid' | 'cancelled';
export type AccountType = 'expense'; // V5: Only expenses now. Income is separated.
export type AccountPriority = 'urgent' | 'next' | 'attention' | 'normal';

export interface Account {
  id: string;
  title: string;
  description?: string;
  amount_cents: number;
  due_date: string; // YYYY-MM-DD
  category_id: string;
  status: AccountStatus;
  type: AccountType; // Keeping for retro-compatibility / structural safety
  recurring_id?: string;
  installment_id?: string;
  installment_current?: number;
  installment_total?: number;
  debtId?: string;
  debtInstallmentId?: string;
  created_at: Date;
  updated_at: Date;
}

export type IncomeStatus = 'pending' | 'received' | 'cancelled';

export interface Income {
  id: string;
  title: string;
  description?: string;
  amount_cents: number;
  expected_date: string; // YYYY-MM-DD
  received_date?: string; // YYYY-MM-DD
  category_id: string;
  status: IncomeStatus;
  recurring_id?: string;
  created_at: Date;
  updated_at: Date;
}

export type PaymentMethod = 'cash' | 'pix' | 'debit_card' | 'credit_card' | 'bank_transfer' | 'other';

export interface Payment {
  id: string;
  account_id: string;
  amount_cents: number;
  paid_at: Date;
  payment_method: PaymentMethod;
  note?: string;
  created_at: Date;
}

// debt_settlement added for Phase 2
export type TransactionType =
  | 'expense_paid'
  | 'income_received'
  | 'debt_paid'
  | 'debt_settlement'
  | 'reserve_contribution'
  | 'manual_adjustment';

export interface AppTransaction {
  id: string;
  wallet_id: string;
  reference_id: string; // ID of Account, Income, Debt, etc.
  type: TransactionType;
  amount_cents: number; // Positive for incoming, negative for outgoing
  date: Date;
  description: string;
  created_at: Date;
}

// ─── Debt Model ─────────────────────────────────────────────────────────────

export type DebtStatus = 'active' | 'paid_off' | 'cancelled';

/**
 * Represents the primary financial obligation.
 * paid_installments is a DERIVED/CACHE field — DebtInstallments are the source of truth.
 */
export interface Debt {
  id: string;
  title: string;
  creditor: string;
  /** Category inherited from the debt and propagated to each generated Account. */
  category_id: string;
  original_amount_cents: number;
  total_installments: number;
  /** Cache field. Source of truth = COUNT(installments WHERE status='paid') */
  paid_installments: number;
  installment_amount_cents: number; // value per installment (may differ with interest)
  interest_rate?: number;           // % per period, optional
  first_due_date: string;           // YYYY-MM-DD — date of installment #1
  status: DebtStatus;
  /**
   * Settlement amount for early payoff. May differ from sum of remaining installments
   * (e.g., discount, renegotiation, fees). Always store explicitly — never assume
   * settlementAmountCents === sum of remaining installments.
   */
  settlement_amount_cents?: number;
  settled_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export type DebtInstallmentStatus = 'pending' | 'partial' | 'paid';

/**
 * Represents an individual installment obligation.
 * The actual overdue determination is computed at runtime via DebtService.getInstallmentStatus()
 * and is NOT stored to avoid stale data when the app is opened after several days.
 */
export interface DebtInstallment {
  id: string;
  debt_id: string;
  account_id: string;           // FK → Account generated for this installment
  installment_number: number;   // 1-based
  amount_cents: number;         // Full installment value
  paid_amount_cents: number;    // How much has been paid (0..amount_cents)
  due_date: string;             // YYYY-MM-DD
  status: DebtInstallmentStatus;
  paid_at?: Date;               // Only set when fully paid
  created_at: Date;
}

// ─── Other models ────────────────────────────────────────────────────────────

export type RecurringFrequency = 'monthly';

export interface RecurringAccount {
  id: string;
  title: string;
  description?: string;
  amount_cents: number;
  type: AccountType | 'income'; // Legacy union needed here for now
  frequency: RecurringFrequency;
  day_of_month: number;
  start_date: string;
  end_date?: string;
  active: boolean;
  category_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface Reminder {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  description?: string;
  category: 'personal' | 'work' | 'health' | 'study' | 'financial';
  completed: boolean;
  repeat?: 'none' | 'daily' | 'weekly' | 'monthly';
  created_at: Date;
}

export interface AppNotification {
  id: string;
  type: 'due_soon' | 'overdue' | 'income_expected' | 'income_received' | 'reserve_tip' | 'invest_tip' | 'goal' | 'system';
  title: string;
  message: string;
  read: boolean;
  reference_id?: string;
  created_at: Date;
}

export interface SentNotificationLog {
  id: string; // referenceId_notificationType_date
  reference_id: string; // accountId or incomeId
  notification_type: 'due_tomorrow' | 'due_today' | 'income_tomorrow' | 'income_today';
  reference_date: string; // YYYY-MM-DD
  sent_at: Date;
}

export interface AppSettings {
  id: string;
  hide_values: boolean;
  theme: 'light' | 'dark' | 'system';
  minimum_reserve_cents: number;
  salary_cents: number;
  salary_day: number;
  created_at: Date;
}

export interface Wallet {
  id: string;
  name: string;
  balance_cents: number;
  created_at: Date;
  updated_at: Date;
}

export interface Reserve {
  id: string;
  name: string;
  icon: string;
  color: string;
  target_cents: number;
  current_cents: number;
  contribution_cents: number;
  contribution_frequency: 'weekly' | 'biweekly' | 'monthly';
  contribution_day: number;
  created_at: Date;
  updated_at: Date;
}

export interface ReserveContribution {
  id: string;
  reserve_id: string;
  amount_cents: number;
  note?: string;
  contributed_at: Date;
  created_at: Date;
}

export interface PasswordEntry {
  id: string;
  title: string;
  username?: string;
  password: string;
  url?: string;
  notes?: string;
  icon?: string;
  created_at: Date;
  updated_at: Date;
}

export type InvestmentProfile = 'conservative' | 'moderate' | 'aggressive';

export interface InvestmentPlan {
  id: string;
  profile: InvestmentProfile;
  monthly_amount_cents: number;
  allocations: { name: string; percent: number; color: string }[];
  created_at: Date;
  updated_at: Date;
}

export interface NextAction {
  type: 'pay' | 'receive' | 'reserve' | 'invest' | 'review';
  title: string;
  description: string;
  amountCents?: number;
  entityId?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface FinancialSummary {
  currentBalanceCents: number;
  projectedBalanceCents: number;
  expectedIncomeCents: number;
  receivedIncomeCents: number;
  totalExpensesCents: number;
  paidExpensesCents: number;
  overdueExpensesCents: number;
  suggestedReserveCents: number;
  freeMoneyCents: number;
  availableForInvestmentCents: number;
  isTight: boolean;
  nextAction: NextAction | null;
  overdueCount: number;
  // Phase 2 — Debt fields
  totalDebtRemainingCents: number;       // sum of remaining on all active installments
  monthlyDebtCommitmentCents: number;    // installments due this calendar month
  overdueDebtInstallmentsCents: number;  // installments past due (not paid)
}
