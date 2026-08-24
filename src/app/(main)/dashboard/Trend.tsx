import { ChangeLabel } from '@/components/metrics/ChangeLabel';
import { formatLongNumber } from '@/lib/format';

export function Trend({
  value,
  previousValue,
  formatValue = n => formatLongNumber(Math.abs(n)),
  reverseColors,
}: {
  value: number;
  previousValue?: number;
  formatValue?: (n: number) => string;
  reverseColors?: boolean;
}) {
  if (previousValue === undefined) {
    return null;
  }

  const change = value - previousValue;

  return (
    <ChangeLabel value={change} size="sm" reverseColors={reverseColors}>
      {`${change > 0 ? '+' : change < 0 ? '-' : ''}${formatValue(change)}`}
    </ChangeLabel>
  );
}
