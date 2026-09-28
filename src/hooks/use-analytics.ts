import { useQuery } from '@tanstack/react-query';

import {
  getAccommodationSummary,
  getChannelSummary,
  getRevenueSummary,
  getSalesSummary,
  getTransactionSummary,
} from '@/api/analytics';
import { priorRange, toApiRangeParams } from '@/utils/stats-date-range';

type Range = { from: Date; to: Date };

// Every report screen needs the SAME two things: the current period's real
// data, and (except Transactions, which has no "vs previous period" figure
// to show) the prior period's comparable total, purely so the screen can
// compute its own delta — hms-backend-node's analytics endpoints don't
// compute one themselves. One prior-period call is shared per report
// rather than baked into a single mega-hook, so a screen that doesn't need
// the comparison (none currently, but Transactions comes close) isn't
// forced to pay for a second request.

export function useRevenueSummary(range: Range) {
  const params = toApiRangeParams(range);
  const current = useQuery({
    queryKey: ['analytics-revenue', params.from, params.to],
    queryFn: () => getRevenueSummary(params),
  });
  const priorParams = toApiRangeParams(priorRange(range));
  const prior = useQuery({
    queryKey: ['analytics-revenue', priorParams.from, priorParams.to],
    queryFn: () => getRevenueSummary(priorParams),
  });
  return { current, priorTotal: prior.data?.totals.total };
}

export function useTransactionSummary(range: Range) {
  const params = toApiRangeParams(range);
  const current = useQuery({
    queryKey: ['analytics-transactions', params.from, params.to],
    queryFn: () => getTransactionSummary(params),
  });
  return { current };
}

export function useChannelSummary(range: Range) {
  const params = toApiRangeParams(range);
  const current = useQuery({
    queryKey: ['analytics-channel', params.from, params.to],
    queryFn: () => getChannelSummary(params),
  });
  const priorParams = toApiRangeParams(priorRange(range));
  const prior = useQuery({
    queryKey: ['analytics-channel', priorParams.from, priorParams.to],
    queryFn: () => getChannelSummary(priorParams),
  });
  return { current, prior };
}

export function useSalesSummary(range: Range) {
  const params = toApiRangeParams(range);
  const current = useQuery({
    queryKey: ['analytics-sales', params.from, params.to],
    queryFn: () => getSalesSummary(params),
  });
  const priorParams = toApiRangeParams(priorRange(range));
  const prior = useQuery({
    queryKey: ['analytics-sales', priorParams.from, priorParams.to],
    queryFn: () => getSalesSummary(priorParams),
  });
  return { current, priorTotal: prior.data?.totals.total };
}

export function useAccommodationSummary(range: Range) {
  const params = toApiRangeParams(range);
  const current = useQuery({
    queryKey: ['analytics-accommodation', params.from, params.to],
    queryFn: () => getAccommodationSummary(params),
  });
  const priorParams = toApiRangeParams(priorRange(range));
  const prior = useQuery({
    queryKey: ['analytics-accommodation', priorParams.from, priorParams.to],
    queryFn: () => getAccommodationSummary(priorParams),
  });
  return { current, priorTotals: prior.data?.totals };
}
