import { DataColumn, DataTable, Icon, Row, Text } from '@umami/react-zen';
import { useMemo } from 'react';
import Link from '@/components/common/Link';
import { LoadingPanel } from '@/components/common/LoadingPanel';
import { useMessages, useNavigation } from '@/components/hooks';
import type { WebsiteOverviewData } from '@/components/hooks/queries/useWebsiteOverviewQuery';
import { Favicon } from '@/index';
import { decodePunycodeDomain, formatLongNumber } from '@/lib/format';
import { Trend } from './Trend';

function bounceRate({ visits, bounces }: { visits: number; bounces: number }) {
  return visits ? (Math.min(visits, bounces) / visits) * 100 : 0;
}

export function OverviewTable({
  data,
  isLoading,
  isFetching,
  error,
}: {
  data?: WebsiteOverviewData[];
  isLoading?: boolean;
  isFetching?: boolean;
  error?: unknown;
}) {
  const { t, labels, getErrorMessage } = useMessages();
  const { renderUrl } = useNavigation();

  const rows = useMemo(
    () => [...(data || [])].sort((a, b) => b.pageviews - a.pageviews),
    [data],
  );

  return (
    <LoadingPanel
      data={rows}
      isLoading={isLoading}
      isFetching={isFetching}
      error={getErrorMessage(error)}
      minHeight="200px"
    >
      <DataTable data={rows}>
        <DataColumn id="name" label={t(labels.name)} style={{ minWidth: 0 }}>
          {(row: WebsiteOverviewData) => (
            <Row alignItems="center" gap="3" minWidth="0" width="100%">
              <Icon size="md" color="muted" style={{ flexShrink: 0 }}>
                <Favicon domain={row.domain} />
              </Icon>
              <Text truncate title={row.name} style={{ maxWidth: '100%' }}>
                <Link href={renderUrl(`/websites/${row.id}`, false)}>{row.name}</Link>
              </Text>
            </Row>
          )}
        </DataColumn>
        <DataColumn id="domain" label={t(labels.domain)} style={{ minWidth: 0 }}>
          {(row: WebsiteOverviewData) => (
            <Text truncate title={decodePunycodeDomain(row.domain) ?? undefined}>
              {decodePunycodeDomain(row.domain)}
            </Text>
          )}
        </DataColumn>
        <DataColumn id="visitors" label={t(labels.visitors)} align="end" width="150px">
          {(row: WebsiteOverviewData) => (
            <Row alignItems="center" justifyContent="flex-end" gap="2">
              <Text>{formatLongNumber(row.visitors)}</Text>
              <Trend value={row.visitors} previousValue={row.comparison?.visitors} />
            </Row>
          )}
        </DataColumn>
        <DataColumn id="visits" label={t(labels.visits)} align="end" width="150px">
          {(row: WebsiteOverviewData) => (
            <Row alignItems="center" justifyContent="flex-end" gap="2">
              <Text>{formatLongNumber(row.visits)}</Text>
              <Trend value={row.visits} previousValue={row.comparison?.visits} />
            </Row>
          )}
        </DataColumn>
        <DataColumn id="pageviews" label={t(labels.views)} align="end" width="150px">
          {(row: WebsiteOverviewData) => (
            <Row alignItems="center" justifyContent="flex-end" gap="2">
              <Text>{formatLongNumber(row.pageviews)}</Text>
              <Trend value={row.pageviews} previousValue={row.comparison?.pageviews} />
            </Row>
          )}
        </DataColumn>
        <DataColumn id="bounceRate" label={t(labels.bounceRate)} align="end" width="150px">
          {(row: WebsiteOverviewData) => {
            const rate = bounceRate(row);
            const previousRate = row.comparison ? bounceRate(row.comparison) : undefined;

            return (
              <Row alignItems="center" justifyContent="flex-end" gap="2">
                <Text>{row.visits ? `${Math.round(rate)}%` : '-'}</Text>
                <Trend
                  value={rate}
                  previousValue={previousRate}
                  formatValue={n => `${Math.round(Math.abs(n))}%`}
                  reverseColors
                />
              </Row>
            );
          }}
        </DataColumn>
      </DataTable>
    </LoadingPanel>
  );
}
