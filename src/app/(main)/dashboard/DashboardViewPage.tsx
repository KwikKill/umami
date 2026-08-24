'use client';
import { Column } from '@umami/react-zen';
import { Empty } from '@/components/common/Empty';
import { PageBody } from '@/components/common/PageBody';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel } from '@/components/common/Panel';
import { useMessages, useNavigation, useWebsiteOverviewQuery } from '@/components/hooks';
import { OverviewChart } from './OverviewChart';
import { OverviewControls } from './OverviewControls';
import { OverviewMetricsBar } from './OverviewMetricsBar';
import { OverviewTable } from './OverviewTable';
import { OverviewTopPages } from './OverviewTopPages';

export function DashboardViewPage() {
  const { t, labels, messages } = useMessages();
  const { teamId } = useNavigation();
  const { data, isLoading, isFetching, error } = useWebsiteOverviewQuery({ teamId });

  const isEmpty = !isLoading && !isFetching && !error && data?.websites?.length === 0;

  return (
    <PageBody>
      <Column gap="6" margin="2">
        <PageHeader title={t(labels.dashboard)}>
          <OverviewControls />
        </PageHeader>
        {isEmpty ? (
          <Empty message={t(messages.emptyOverview)} />
        ) : (
          <>
            <OverviewMetricsBar
              data={data}
              isLoading={isLoading}
              isFetching={isFetching}
              error={error}
            />
            <Panel>
              <OverviewChart websites={data?.websites || []} teamId={teamId} />
            </Panel>
            <Panel>
              <OverviewTable
                data={data?.websites}
                isLoading={isLoading}
                isFetching={isFetching}
                error={error}
              />
            </Panel>
            <Panel title={t(labels.pages)}>
              <OverviewTopPages teamId={teamId} />
            </Panel>
          </>
        )}
      </Column>
    </PageBody>
  );
}
