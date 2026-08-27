import { describe, it, expect } from 'vitest';
import { formatBRLFromCents, parseBRLToCents } from '../src/utils/currency';

describe('Currency Utilities', () => {
  describe('parseBRLToCents', () => {
    it('parses basic numeric strings correctly', () => {
      expect(parseBRLToCents("0")).toBe(0);
      expect(parseBRLToCents("1")).toBe(1);
      expect(parseBRLToCents("10")).toBe(10);
      expect(parseBRLToCents("100")).toBe(100);
      expect(parseBRLToCents("1000")).toBe(1000);
      expect(parseBRLToCents("360000")).toBe(360000);
    });

    it('parses formatted currency strings correctly', () => {
      expect(parseBRLToCents("3.600,00")).toBe(360000);
      expect(parseBRLToCents("10.563,96")).toBe(1056396);
      expect(parseBRLToCents("150,50")).toBe(15050);
      expect(parseBRLToCents("0,99")).toBe(99);
      expect(parseBRLToCents("1.999,99")).toBe(199999);
      expect(parseBRLToCents("R$ 3.600,00")).toBe(360000);
    });

    it('handles negative values correctly', () => {
      expect(parseBRLToCents("-R$ 150,50")).toBe(-15050);
      expect(parseBRLToCents("-3.600,00")).toBe(-360000);
    });
  });

  describe('formatBRLFromCents', () => {
    it('formats cents into BRL currency strings', () => {
      expect(formatBRLFromCents(360000)).toBe("R$ 3.600,00");
      expect(formatBRLFromCents(1056396)).toBe("R$ 10.563,96");
      expect(formatBRLFromCents(99)).toBe("R$ 0,99");
      expect(formatBRLFromCents(1)).toBe("R$ 0,01");
      expect(formatBRLFromCents(10)).toBe("R$ 0,10");
      expect(formatBRLFromCents(15050)).toBe("R$ 150,50");
      expect(formatBRLFromCents(0)).toBe("R$ 0,00");
    });

    it('handles negative formatting properly', () => {
      expect(formatBRLFromCents(-15050)).toBe("-R$ 150,50");
    });
  });
});
