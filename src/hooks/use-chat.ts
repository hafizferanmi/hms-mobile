import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getChatHistory, sendChatMessage, type ChatMessageDto } from '@/api/chat';

const QUERY_KEY = ['chat-history'];

export function useChatHistory() {
  return useQuery({ queryKey: QUERY_KEY, queryFn: getChatHistory });
}

// Optimistically appends the user's own message immediately (same as the
// web app's local echo, swapped for the real saved doc once the request
// resolves), then appends the assistant's reply once it arrives — there's
// nothing to stream, the backend only ever returns one finished message.
export function useSendChatMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (message: string) => sendChatMessage(message),
    onMutate: async (message: string) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<ChatMessageDto[]>(QUERY_KEY) ?? [];
      const tempId = `temp-${Date.now()}`;
      const optimisticUser: ChatMessageDto = {
        _id: tempId,
        companyId: '',
        staffId: '',
        role: 'user',
        content: message,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      queryClient.setQueryData<ChatMessageDto[]>(QUERY_KEY, [...previous, optimisticUser]);
      return { tempId };
    },
    onSuccess: (data, _message, context) => {
      queryClient.setQueryData<ChatMessageDto[]>(QUERY_KEY, (current) => {
        const withoutOptimistic = (current ?? []).filter((m) => m._id !== context?.tempId);
        return [...withoutOptimistic, data.userMessage, data.assistantMessage];
      });
    },
    // hms-backend-node saves the user's message before it even attempts a
    // reply, so a failure here only means the *reply* failed — same as
    // the web app, the optimistic user bubble stays put (not rolled back)
    // and a local, unpersisted error bubble is appended in place of a
    // real assistant reply.
    onError: (err: Error) => {
      queryClient.setQueryData<ChatMessageDto[]>(QUERY_KEY, (current) => [
        ...(current ?? []),
        {
          _id: `error-${Date.now()}`,
          companyId: '',
          staffId: '',
          role: 'assistant',
          content: err.message || 'Something went wrong. Please try again.',
          isError: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);
    },
  });
}
