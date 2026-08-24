import { LoadingPanel } from '@/components/common/LoadingPanel';
import { useMessages } from '@/components/hooks';
import type { WebsiteOverviewResponse } from '@/components/hooks/queries/useWebsiteOverviewQuery';
import { MetricCard } from '@/components/metrics/MetricCard';
import { MetricsBar } from '@/components/metrics/MetricsBar';
import { formatLongNumber, formatShortTime } from '@/lib/format';

export function OverviewMetricsBar({
  data,
  isLoading,
  isFetching,
  error,
}: {
  data?: WebsiteOverviewResponse;
  isLoading?: boolean;
  isFetching?: boolean;
  error?: unknown;
}) {
  const { t, labels, getErrorMessage } = useMessages();
  const { totals, websites } = data || {};

  const metrics = totals
    ? [
        {
          value: totals.visitors,
          label: t(labels.visitors),
          formatValue: formatLongNumber,
        },
        {
          value: totals.visits,
          label: t(labels.visits),
          formatValue: formatLongNumber,
        },
        {
          value: totals.pageviews,
          label: t(labels.views),
          formatValue: formatLongNumber,
        },
        {
          label: t(labels.bounceRate),
          value: totals.visits ? (Math.min(totals.visits, totals.bounces) / totals.visits) * 100 : 0,
          formatValue: n => `${Math.round(+n)}%`,
        },
        {
          label: t(labels.visitDuration),
          value: totals.visits ? totals.totaltime / totals.visits : 0,
          formatValue: n => formatShortTime(Math.abs(~~n), ['m', 's'], ' '),
        },
        {
          label: t(labels.websites),
          value: websites?.length || 0,
          formatValue: formatLongNumber,
        },
      ]
    : null;

  return (
    <LoadingPanel
      data={metrics}
      isLoading={isLoading}
      isFetching={isFetching}
      error={getErrorMessage(error)}
      minHeight="136px"
    >
      <MetricsBar>
        {metrics?.map(({ label, value, formatValue }) => {
          return <MetricCard key={label} value={value} label={label} formatValue={formatValue} />;
        })}
      </MetricsBar>
    </LoadingPanel>
  );
}
