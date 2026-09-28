import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  addPaymentMethod,
  deletePaymentMethod,
  listPaymentMethods,
  reorderPaymentMethods,
  updatePaymentMethod,
  type PaymentMethodPayload,
} from '@/api/payment-methods';

export function usePaymentMethods() {
  return useQuery({
    queryKey: ['payment-methods'],
    queryFn: listPaymentMethods,
  });
}

export function useAddPaymentMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PaymentMethodPayload) => addPaymentMethod(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payment-methods'] }),
  });
}

export function useUpdatePaymentMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ paymentMethodId, payload }: { paymentMethodId: string; payload: Partial<PaymentMethodPayload> }) =>
      updatePaymentMethod(paymentMethodId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payment-methods'] }),
  });
}

// Optimistic — the whole point of reordering is that the row should
// settle into its new position immediately, not snap into place only
// after a round trip. onSuccess replaces the optimistic list with the
// server's own (identical, barring a race with another edit).
export function useReorderPaymentMethods() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: string[]) => reorderPaymentMethods(orderedIds),
    onSuccess: (methods) => queryClient.setQueryData(['payment-methods'], methods),
  });
}

export function useDeletePaymentMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (paymentMethodId: string) => deletePaymentMethod(paymentMethodId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payment-methods'] }),
  });
}
