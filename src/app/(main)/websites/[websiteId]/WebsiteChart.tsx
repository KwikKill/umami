import { useMemo, useState } from 'react';
import { LoadingPanel } from '@/components/common/LoadingPanel';
import { useDateRange, useTimezone, useWebsiteAnnotationsQuery } from '@/components/hooks';
import { useWebsitePageviewsQuery } from '@/components/hooks/queries/useWebsitePageviewsQuery';
import { DialogButton } from '@/components/input/DialogButton';
import { PageviewsChart } from '@/components/metrics/PageviewsChart';
import { AnnotationEditForm } from './AnnotationEditForm';

export function WebsiteChart({
  websiteId,
  compareMode,
}: {
  websiteId: string;
  compareMode?: boolean;
}) {
  const { timezone } = useTimezone();
  const { dateRange, dateCompare } = useDateRange({ timezone: timezone });
  const { startDate, endDate, unit, value } = dateRange;
  const { data, isLoading, isFetching, error } = useWebsitePageviewsQuery({
    websiteId,
    compare: compareMode ? dateCompare?.compare : undefined,
  });
  const { data: annotations } = useWebsiteAnnotationsQuery(websiteId);
  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);
  const { pageviews, sessions, compare } = (data || {}) as any;

  const chartData = useMemo(() => {
    if (!data) {
      return { pageviews: [], sessions: [] };
    }

    return {
      pageviews,
      sessions,
      ...(compare && {
        compare: {
          pageviews: pageviews.map(({ x }, i) => ({
            x,
            y: compare.pageviews[i]?.y,
            d: compare.pageviews[i]?.x,
          })),
          sessions: sessions.map(({ x }, i) => ({
            x,
            y: compare.sessions[i]?.y,
            d: compare.sessions[i]?.x,
          })),
        },
      }),
    };
  }, [data, startDate, endDate, unit]);

  const editingAnnotation = annotations?.find(({ id }) => id === editingAnnotationId);

  return (
    <LoadingPanel data={data} isFetching={isFetching} isLoading={isLoading} error={error}>
      <PageviewsChart
        key={value}
        data={chartData}
        minDate={startDate}
        maxDate={endDate}
        unit={unit}
        annotations={annotations}
        onAnnotationClick={setEditingAnnotationId}
      />
      <DialogButton
        isOpen={!!editingAnnotationId}
        onOpenChange={isOpen => !isOpen && setEditingAnnotationId(null)}
        width="500px"
      >
        {({ close }) =>
          editingAnnotation ? (
            <AnnotationEditForm
              websiteId={websiteId}
              annotation={editingAnnotation}
              onClose={close}
            />
          ) : null
        }
      </DialogButton>
    </LoadingPanel>
  );
}
