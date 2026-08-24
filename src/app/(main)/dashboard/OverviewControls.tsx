import { Button, Icon, Row } from '@umami/react-zen';
import { isAfter } from 'date-fns';
import { useMemo } from 'react';
import { DateFilter } from '@/components/input/DateFilter';
import { useDateRange, useNavigation } from '@/components/hooks';
import { ChevronRight } from '@/components/icons';
import { getDateRangeValue } from '@/lib/date';

export function OverviewControls() {
  const { dateRange, isAllTime, isCustomRange } = useDateRange();
  const {
    router,
    updateParams,
    query: { offset = 0 },
  } = useNavigation();
  const disableForward = isAllTime || isAfter(dateRange.endDate, new Date());

  const handleChange = (date: string) => {
    router.push(updateParams({ date, offset: undefined, unit: undefined, page: 1 }));
  };

  const handleIncrement = (increment: number) => {
    router.push(updateParams({ offset: Number(offset) + increment }));
  };

  const dateValue = useMemo(() => {
    return offset !== 0
      ? getDateRangeValue(dateRange.startDate, dateRange.endDate)
      : dateRange.value;
  }, [dateRange, offset]);

  return (
    <Row justifyContent="flex-end" gap wrap="wrap">
      {!isAllTime && !isCustomRange && (
        <Row gap="1">
          <Button onPress={() => handleIncrement(-1)} variant="outline">
            <Icon rotate={180}>
              <ChevronRight />
            </Icon>
          </Button>
          <Button onPress={() => handleIncrement(1)} variant="outline" isDisabled={disableForward}>
            <Icon>
              <ChevronRight />
            </Icon>
          </Button>
        </Row>
      )}
      <DateFilter
        className="min-w-[200px]"
        value={dateValue}
        onChange={handleChange}
        renderDate={+offset !== 0}
      />
    </Row>
  );
}
