import type { FC } from "react";

interface MoneyProps {
  amountCents: number;
  currency: string;
  className?: string;
  showSign?: boolean;
}

/**
 * Displays monetary amounts formatted according to currency conventions
 */
export const Money: FC<MoneyProps> = ({
  amountCents,
  currency,
  className = "",
  showSign = false,
}) => {
  const amount = amountCents / 100;
  const isNegative = amount < 0;

  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));

  const sign = isNegative ? "-" : showSign && amount > 0 ? "+" : "";

  return (
    <span className={`font-mono tabular-nums ${isNegative ? "text-red-600" : ""} ${className}`}>
      {sign}
      {formatted}
    </span>
  );
};
