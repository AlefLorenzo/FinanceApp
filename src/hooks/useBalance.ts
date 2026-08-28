import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';

export function useBalance() {
  const wallets = useLiveQuery(() => db.wallets.toArray(), []) || [];

  const currentBalanceCents =
    wallets.length > 0
      ? wallets[0].balance_cents
      : 0;

  return {
    currentBalanceCents,
  };
}
