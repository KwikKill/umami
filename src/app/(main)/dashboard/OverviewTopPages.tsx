import { DataColumn, DataTable, Icon, Row, Text } from '@umami/react-zen';
import Link from '@/components/common/Link';
import { LoadingPanel } from '@/components/common/LoadingPanel';
import { useMessages, useNavigation, useWebsiteTopPagesQuery } from '@/components/hooks';
import { Favicon } from '@/index';
import { formatLongNumber } from '@/lib/format';
import { Trend } from './Trend';

export interface OverviewTopPagesProps {
  teamId?: string;
}

export function OverviewTopPages({ teamId }: OverviewTopPagesProps) {
  const { t, labels, getErrorMessage } = useMessages();
  const { renderUrl } = useNavigation();
  const { data, isLoading, isFetching, error } = useWebsiteTopPagesQuery({ teamId, limit: 20 });
  const rows = data?.data;

  return (
    <LoadingPanel
      data={rows}
      isLoading={isLoading}
      isFetching={isFetching}
      error={getErrorMessage(error)}
      minHeight="200px"
    >
      <DataTable data={rows}>
        <DataColumn id="website" label={t(labels.website)} style={{ minWidth: 0 }}>
          {(row: any) => (
            <Row alignItems="center" gap="3" minWidth="0" width="100%">
              <Icon size="md" color="muted" style={{ flexShrink: 0 }}>
                <Favicon domain={row.websiteDomain} />
              </Icon>
              <Text truncate title={row.websiteName} style={{ maxWidth: '100%' }}>
                {row.websiteName}
              </Text>
            </Row>
          )}
        </DataColumn>
        <DataColumn id="urlPath" label={t(labels.pages)} style={{ minWidth: 0 }}>
          {(row: any) => (
            <Text truncate title={row.urlPath} style={{ maxWidth: '100%' }}>
              <Link href={renderUrl(`/websites/${row.websiteId}`, { path: row.urlPath })}>
                {row.urlPath}
              </Link>
            </Text>
          )}
        </DataColumn>
        <DataColumn id="visitors" label={t(labels.visitors)} align="end" width="150px">
          {(row: any) => (
            <Row alignItems="center" justifyContent="flex-end" gap="2">
              <Text>{formatLongNumber(row.visitors)}</Text>
              <Trend value={row.visitors} previousValue={row.previousVisitors} />
            </Row>
          )}
        </DataColumn>
        <DataColumn id="pageviews" label={t(labels.views)} align="end" width="150px">
          {(row: any) => (
            <Row alignItems="center" justifyContent="flex-end" gap="2">
              <Text>{formatLongNumber(row.pageviews)}</Text>
              <Trend value={row.pageviews} previousValue={row.previousPageviews} />
            </Row>
          )}
        </DataColumn>
      </DataTable>
    </LoadingPanel>
  );
}
