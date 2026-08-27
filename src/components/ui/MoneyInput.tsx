import React, { useEffect, useState } from 'react';
import { formatBRLFromCents, parseBRLToCents } from '../../utils/currency';

interface MoneyInputProps {
  valueCents: number;
  onChangeCents: (cents: number) => void;
  allowNegative?: boolean;
  className?: string;
  placeholder?: string;
  id?: string;
  required?: boolean;
  autoFocus?: boolean;
}

export function MoneyInput({
  valueCents,
  onChangeCents,
  allowNegative = false,
  className = '',
  placeholder = 'R$ 0,00',
  id,
  required,
  autoFocus
}: MoneyInputProps) {
  const [displayValue, setDisplayValue] = useState(() => formatBRLFromCents(valueCents));

  useEffect(() => {
    // Only update internal display state if the prop changed externally
    if (parseBRLToCents(displayValue) !== valueCents) {
      setDisplayValue(formatBRLFromCents(valueCents));
    }
  }, [valueCents, displayValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value;
    
    // Prevent negative sign if not allowed
    if (!allowNegative && inputValue.includes('-')) {
      inputValue = inputValue.replace(/-/g, '');
    }

    const cents = parseBRLToCents(inputValue);
    const newDisplay = formatBRLFromCents(cents);
    
    setDisplayValue(newDisplay);
    onChangeCents(cents);
  };

  return (
    <input
      type="tel" // Opens numeric keypad on mobile (and doesn't allow random characters as easily, though text would work too, tel is widely supported)
      inputMode="numeric"
      id={id}
      required={required}
      className={className}
      placeholder={placeholder}
      value={displayValue}
      onChange={handleChange}
      autoFocus={autoFocus}
    />
  );
}
