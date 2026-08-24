import { useTheme } from '@umami/react-zen';
import { memo, useCallback, useMemo, useState } from 'react';
import { Chart, type ChartProps } from '@/components/charts/Chart';
import { ChartTooltip } from '@/components/charts/ChartTooltip';
import { useLocale } from '@/components/hooks';
import { renderNumberLabels } from '@/lib/charts';
import { getThemeColors } from '@/lib/colors';
import { DATE_FORMATS, formatDate } from '@/lib/date';
import { formatLongCurrency, formatLongNumber } from '@/lib/format';

const MemoChart = memo(Chart);

const dateFormats = {
  millisecond: 'T',
  second: 'pp',
  minute: 'p',
  hour: 'p - PP',
  day: 'PPPP',
  week: 'PPPP',
  month: 'LLLL yyyy',
  quarter: 'qqq',
  year: 'yyyy',
};

export interface ChartAnnotation {
  id: string;
  value: string;
  title: string;
  text: string;
}

export interface BarChartProps extends ChartProps {
  unit?: string;
  stacked?: boolean;
  currency?: string;
  renderXLabel?: (label: string, index: number, values: any[]) => string;
  renderYLabel?: (label: string, index: number, values: any[]) => string;
  XAxisType?: string;
  YAxisType?: string;
  minDate?: Date;
  maxDate?: Date;
  annotations?: ChartAnnotation[];
  onAnnotationClick?: (id: string) => void;
}

interface TooltipState {
  title: string;
  color?: string;
  value: string;
}

const ANNOTATION_COLOR = '#e68619';

function BarChartComponent({
  chartData,
  renderXLabel,
  renderYLabel,
  unit,
  XAxisType = 'timeseries',
  YAxisType = 'linear',
  stacked = false,
  minDate,
  maxDate,
  currency,
  annotations,
  onAnnotationClick,
  ...props
}: BarChartProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [annotationTooltip, setAnnotationTooltip] = useState<TooltipState | null>(null);
  const { theme } = useTheme();
  const { locale } = useLocale();
  const { colors } = useMemo(() => getThemeColors(theme), [theme]);

  const chartOptions: any = useMemo(() => {
    return {
      __id: Date.now(),
      scales: {
        x: {
          type: XAxisType,
          stacked: true,
          min: formatDate(minDate, DATE_FORMATS[unit], locale),
          max: formatDate(maxDate, DATE_FORMATS[unit], locale),
          offset: true,
          time: {
            unit,
          },
          grid: {
            display: false,
          },
          border: {
            color: colors.chart.line,
          },
          ticks: {
            color: colors.chart.text,
            autoSkip: false,
            maxRotation: 0,
            callback: renderXLabel,
          },
        },
        y: {
          type: YAxisType,
          min: 0,
          beginAtZero: true,
          stacked: !!stacked,
          grid: {
            color: colors.chart.line,
          },
          border: {
            color: colors.chart.line,
          },
          ticks: {
            color: colors.chart.text,
            callback: renderYLabel || renderNumberLabels,
          },
        },
      },
      plugins: {
        annotation: {
          annotations: Object.fromEntries(
            (annotations || []).map(({ id, value, title, text }) => [
              id,
              {
                type: 'line',
                scaleID: 'x',
                value,
                borderColor: ANNOTATION_COLOR,
                borderWidth: 2,
                borderDash: [4, 4],
                label: {
                  display: true,
                  content: '🚩',
                  position: 'start',
                  rotation: 0,
                  yAdjust: -4,
                  backgroundColor: 'transparent',
                  font: { size: 12 },
                  padding: 0,
                },
                enter: () => setAnnotationTooltip({ title, color: ANNOTATION_COLOR, value: text }),
                leave: () => setAnnotationTooltip(null),
                click: () => onAnnotationClick?.(id),
              },
            ]),
          ),
        },
      },
    };
  }, [
    colors,
    unit,
    stacked,
    renderXLabel,
    renderYLabel,
    minDate,
    maxDate,
    locale,
    XAxisType,
    YAxisType,
    annotations,
    onAnnotationClick,
  ]);

  const handleTooltip = useCallback(
    ({ tooltip }: { tooltip: any }) => {
      const { opacity, labelColors, dataPoints } = tooltip;
      const nextTooltip = opacity
        ? {
            title: formatDate(
              new Date(dataPoints[0].raw?.d || dataPoints[0].raw?.x || dataPoints[0].raw),
              dateFormats[unit],
              locale,
            ),
            color: labelColors?.[0]?.borderColor || labelColors?.[0]?.backgroundColor,
            value: currency
              ? formatLongCurrency(dataPoints[0].raw.y, currency)
              : `${formatLongNumber(dataPoints[0].raw.y)} ${dataPoints[0].dataset.label}`,
          }
        : null;

      setTooltip(prev => {
        if (
          prev?.title === nextTooltip?.title &&
          prev?.color === nextTooltip?.color &&
          prev?.value === nextTooltip?.value
        ) {
          return prev;
        }

        return nextTooltip;
      });
    },
    [currency, locale, unit],
  );

  return (
    <>
      <MemoChart
        {...props}
        type="bar"
        chartData={chartData}
        chartOptions={chartOptions}
        onTooltip={handleTooltip}
      />
      {tooltip && <ChartTooltip {...tooltip} />}
      {annotationTooltip && <ChartTooltip {...annotationTooltip} />}
    </>
  );
}

export const BarChart = memo(BarChartComponent);

BarChart.displayName = 'BarChart';
