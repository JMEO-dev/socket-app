import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from './api/baseApi.js'
import chatReducer from './slices/chatSlice.js'

export const store = configureStore({
    reducer: {
        chat: chatReducer,
        [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(baseApi.middleware),
})
