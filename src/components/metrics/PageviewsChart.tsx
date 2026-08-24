import { useTheme } from '@umami/react-zen';
import { useCallback, useMemo } from 'react';
import { BarChart, type BarChartProps } from '@/components/charts/BarChart';
import { useLocale, useMessages } from '@/components/hooks';
import { renderDateLabels } from '@/lib/charts';
import { getThemeColors } from '@/lib/colors';
import { DATE_FORMATS, formatDate, generateTimeSeries } from '@/lib/date';

export interface PageviewsChartAnnotation {
  id: string;
  date: string | Date;
  text: string;
}

export interface PageviewsChartProps extends Omit<BarChartProps, 'annotations'> {
  data: {
    pageviews: any[];
    sessions: any[];
    compare?: {
      pageviews: any[];
      sessions: any[];
    };
  };
  unit: string;
  annotations?: PageviewsChartAnnotation[];
}

export function PageviewsChart({
  data,
  unit,
  minDate,
  maxDate,
  annotations,
  ...props
}: PageviewsChartProps) {
  const { t, labels } = useMessages();
  const { theme } = useTheme();
  const { locale, dateLocale } = useLocale();
  const { colors } = useMemo(() => getThemeColors(theme), [theme]);

  const chartAnnotations = useMemo(() => {
    return (annotations || []).map(({ id, date, text }) => ({
      id,
      value: formatDate(date, DATE_FORMATS[unit], dateLocale),
      title: formatDate(date, 'PPPP', dateLocale),
      text,
    }));
  }, [annotations, unit, dateLocale]);

  const chartData: any = useMemo(() => {
    if (!data) return;

    return {
      __id: Date.now(),
      datasets: [
        {
          type: 'bar',
          label: t(labels.visitors),
          data: generateTimeSeries(data.sessions, minDate, maxDate, unit, dateLocale),
          borderWidth: 1,
          barPercentage: 0.9,
          categoryPercentage: 0.9,
          ...colors.chart.visitors,
          order: 3,
        },
        {
          type: 'bar',
          label: t(labels.views),
          data: generateTimeSeries(data.pageviews, minDate, maxDate, unit, dateLocale),
          barPercentage: 0.9,
          categoryPercentage: 0.9,
          borderWidth: 1,
          ...colors.chart.views,
          order: 4,
        },
        ...(data.compare
          ? [
              {
                type: 'line',
                label: `${t(labels.views)} (${t(labels.previous)})`,
                data: generateTimeSeries(
                  data.compare.pageviews,
                  minDate,
                  maxDate,
                  unit,
                  dateLocale,
                ),
                borderWidth: 2,
                backgroundColor: '#8601B0',
                borderColor: '#8601B0',
                order: 1,
              },
              {
                type: 'line',
                label: `${t(labels.visitors)} (${t(labels.previous)})`,
                data: generateTimeSeries(data.compare.sessions, minDate, maxDate, unit, dateLocale),
                borderWidth: 2,
                backgroundColor: '#f15bb5',
                borderColor: '#f15bb5',
                order: 2,
              },
            ]
          : []),
      ],
    };
  }, [data, locale]);

  const renderXLabel = useCallback(renderDateLabels(unit, locale), [unit, locale]);

  return (
    <BarChart
      {...props}
      chartData={chartData}
      unit={unit}
      minDate={minDate}
      maxDate={maxDate}
      renderXLabel={renderXLabel}
      annotations={chartAnnotations}
      height="400px"
    />
  );
}
