import { useQuery } from '@tanstack/react-query';

import { listCustomFields, type CustomFieldForm } from '@/api/custom-fields';

export function useCustomFields(form: CustomFieldForm) {
  return useQuery({
    queryKey: ['custom-fields', form],
    queryFn: () => listCustomFields(form),
  });
}
