import { colord } from 'colord';
import { useCallback, useMemo, useState } from 'react';
import { BarChart } from '@/components/charts/BarChart';
import { LoadingPanel } from '@/components/common/LoadingPanel';
import {
  useDateRange,
  useLocale,
  useMessages,
  useWebsiteOverviewPageviewsQuery,
} from '@/components/hooks';
import { renderDateLabels } from '@/lib/charts';
import { hex6 } from '@/lib/colors';
import { CHART_COLORS } from '@/lib/constants';
import { generateTimeSeries } from '@/lib/date';

// Cap individual series so each one always gets a distinct color from
// CHART_COLORS; sites beyond this are summed into a single "Other" series.
const MAX_SERIES = 8;
const OTHER_COLOR = '#9e9e9e';

export interface OverviewChartProps {
  websites: { id: string; name: string }[];
  teamId?: string;
}

export function OverviewChart({ websites, teamId }: OverviewChartProps) {
  const { dateRange } = useDateRange();
  const { startDate, endDate, unit } = dateRange;
  const { locale, dateLocale } = useLocale();
  const { t, labels } = useMessages();
  const { data, isLoading, isFetching, error } = useWebsiteOverviewPageviewsQuery({ teamId });
  const [hiddenLabels, setHiddenLabels] = useState<Set<string>>(() => new Set());

  const nameById = useMemo(
    () => new Map(websites.map(website => [website.id, website.name])),
    [websites],
  );

  const handleLegendClick = useCallback((label: string, willBeHidden: boolean) => {
    setHiddenLabels(prev => {
      const next = new Set(prev);
      if (willBeHidden) next.add(label);
      else next.delete(label);
      return next;
    });
  }, []);

  const chartData: any = useMemo(() => {
    const rows = data?.data;

    if (!rows) return;

    const map = rows.reduce((obj: Record<string, { x: string; y: number }[]>, { websiteId, x, y }) => {
      if (!obj[websiteId]) {
        obj[websiteId] = [];
      }

      obj[websiteId].push({ x, y });

      return obj;
    }, {});

    const keys = Object.keys(map);

    if (keys.length === 0) {
      return {
        datasets: [
          {
            data: generateTimeSeries([], startDate, endDate, unit, dateLocale),
            lineTension: 0,
            borderWidth: 1,
          },
        ],
      };
    }

    // Keep the biggest sites as their own series; fold the long tail into
    // "Other" so every visible series can get a distinct, stable color.
    const totalByKey = Object.fromEntries(
      keys.map(key => [key, map[key].reduce((sum, point) => sum + point.y, 0)]),
    );
    const rankedKeys = [...keys].sort((a, b) => totalByKey[b] - totalByKey[a]);
    const topKeys = rankedKeys.slice(0, MAX_SERIES);
    const otherKeys = rankedKeys.slice(MAX_SERIES);

    const colorByKey: Record<string, string> = {};
    const used = new Set<string>();
    const hashOf = Object.fromEntries(topKeys.map(key => [key, parseInt(hex6(key), 16)]));
    const orderedKeys = [...topKeys].sort((a, b) => hashOf[a] - hashOf[b]);

    for (const key of orderedKeys) {
      const start = (hashOf[key] >>> 4) % CHART_COLORS.length;
      let chosen = CHART_COLORS[start];
      for (let i = 0; i < CHART_COLORS.length; i++) {
        const candidate = CHART_COLORS[(start + i) % CHART_COLORS.length];
        if (!used.has(candidate)) {
          chosen = candidate;
          break;
        }
      }
      used.add(chosen);
      colorByKey[key] = chosen;
    }

    const topDatasets = topKeys.map(key => {
      const color = colord(colorByKey[key]);

      return {
        label: nameById.get(key) || key,
        data: generateTimeSeries(map[key], startDate, endDate, unit, dateLocale),
        lineTension: 0,
        backgroundColor: color.alpha(0.6).toRgbString(),
        borderColor: color.alpha(0.7).toRgbString(),
        borderWidth: 1,
      };
    });

    const otherDatasets = otherKeys.length
      ? (() => {
          const alignedSeries = otherKeys.map(key =>
            generateTimeSeries(map[key], startDate, endDate, unit, dateLocale),
          );
          const otherColor = colord(OTHER_COLOR);

          return [
            {
              label: `${t(labels.other)} (${otherKeys.length})`,
              data: alignedSeries[0].map((point, index) => ({
                x: point.x,
                y: alignedSeries.reduce((sum, series) => sum + (series[index]?.y || 0), 0),
              })),
              lineTension: 0,
              backgroundColor: otherColor.alpha(0.4).toRgbString(),
              borderColor: otherColor.alpha(0.6).toRgbString(),
              borderWidth: 1,
            },
          ];
        })()
      : [];

    return {
      datasets: [...topDatasets, ...otherDatasets],
    };
  }, [data, startDate, endDate, unit, dateLocale, nameById, t, labels.other]);

  const renderXLabel = useCallback(renderDateLabels(unit, locale), [unit, locale]);

  return (
    <LoadingPanel isLoading={isLoading} isFetching={isFetching} error={error} minHeight="400px">
      {chartData && (
        <BarChart
          chartData={chartData}
          minDate={startDate}
          maxDate={endDate}
          unit={unit}
          stacked={true}
          renderXLabel={renderXLabel}
          height="400px"
          hiddenLabels={hiddenLabels}
          onLegendClick={handleLegendClick}
        />
      )}
    </LoadingPanel>
  );
}
