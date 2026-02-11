import { createSlice } from '@reduxjs/toolkit'

const initialState = {
    activeChatId: null,
    sidebarOpen: true,
}

const chatSlice = createSlice({
    name: 'chat',
    initialState,
    reducers: {
        setActiveChat: (state, action) => {
            state.activeChatId = action.payload
        },
        toggleSidebar: (state) => {
            state.sidebarOpen = !state.sidebarOpen
        },
    },
})

export const { setActiveChat, toggleSidebar } = chatSlice.actions
export default chatSlice.reducer
