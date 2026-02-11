import { baseApi } from './baseApi'

export const chatApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getChats: builder.query({
            query: (agentId) => `/chat/agent/${agentId}`,
            transformResponse: (response) => {
                const chatMap = {};
                const messagesMap = {};
                response.forEach(chat => {
                    chatMap[chat.id] = chat;
                    messagesMap[chat.id] = chat.messages || [];
                });
                return { chatMap, messagesMap };
            },
            transformErrorResponse: (response) => response.error,
            providesTags: ['Chats'],
        }),
    }),
})

export const {
    useGetChatsQuery,
} = chatApi
