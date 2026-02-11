// import './App.css';
// import { useEffect, useState } from 'react';
// import { useSocket } from './hooks/useSocket';

// function App() {
//     const AGENT_ID = 'cmlertdeh0000ku7bmn9xdtlr';
//     const API_URL = import.meta.env.VITE_API_URL;

//     // Use the socket hook
//     const {
//         socket,
//         isConnected,
//         error,
//         emit,
//         on,
//         off
//     } = useSocket(API_URL, {
//         transports: ['websocket'],
//         autoConnect: true
//     });

//     const [chats, setChats] = useState({});
//     const [messagesStore, setMessagesStore] = useState({});
//     const [activeChatId, setActiveChatId] = useState(null);
//     const [newMessage, setNewMessage] = useState('');

//     // =========================
//     // INITIALIZE SOCKET EVENTS
//     // =========================
//     useEffect(() => {
//         // Load existing chats (independent of socket)
//         fetch(`${API_URL}/api/chat/agent/${AGENT_ID}`)
//             .then(res => res.json())
//             .then(agentChats => {
//                 const chatMap = {};
//                 const messagesMap = {};

//                 agentChats.forEach(chat => {
//                     chatMap[chat.id] = chat;
//                     messagesMap[chat.id] = chat.messages || [];
//                 });

//                 setChats(chatMap);
//                 setMessagesStore(messagesMap);
//             })
//             .catch(err => {
//                 console.error('Failed to load chats:', err);
//             });

//         // Set up socket event listeners
//         const handleChatAssigned = (chat) => {
//             console.log('New chat assigned:', chat);
//             setChats(prev => ({
//                 ...prev,
//                 [chat.id]: chat
//             }));

//             setMessagesStore(prev => ({
//                 ...prev,
//                 [chat.id]: chat.messages || []
//             }));
//             // alert('New customer assigned!');
//         };

//         const handleNewMessage = (msg) => {
//             if (!msg || !msg.chatId) return;

//             console.log('New message received:', msg);
//             setMessagesStore(prev => ({
//                 ...prev,
//                 [msg.chatId]: [...(prev[msg.chatId] || []), msg]
//             }));
//         };

//         // Subscribe to events
//         on('chat:assigned', handleChatAssigned);
//         on('message:new', handleNewMessage);

//         // Cleanup
//         return () => {
//             off('chat:assigned', handleChatAssigned);
//             off('message:new', handleNewMessage);
//         };
//     }, [on, off]);

//     // =========================
//     // SEND AGENT CONNECT AFTER CONNECTION
//     // =========================
//     useEffect(() => {
//         if (isConnected) {
//             console.log('🟢 Sending agent:connect');
//             emit('agent:connect', { agentId: AGENT_ID }, (response) => {
//                 console.log('Agent connect response:', response);
//             });
//         }
//     }, [isConnected, emit]);

//     // =========================
//     // OPEN CHAT
//     // =========================
//     const openChat = (chatId) => {
//         console.log('Opening chat:', chatId);
//         setActiveChatId(chatId);

//         if (isConnected) {
//             emit('chat:join', { chatId });
//         } else {
//             console.log('Cannot join chat: socket not connected');
//         }
//     };

//     // =========================
//     // SEND MESSAGE
//     // =========================
//     const sendReply = () => {
//         const text = newMessage.trim();
//         if (!text || !activeChatId) return;

//         if (!isConnected) {
//             alert('Not connected to server. Please wait...');
//             return;
//         }

//         const messageData = {
//             chatId: activeChatId,
//             senderId: AGENT_ID,
//             senderType: 'agent',
//             message: text,
//         };

//         console.log('Sending message:', messageData);

//         emit('message:send', messageData, (response) => {
//             console.log('Message send response:', response);
//         });

//         // Optimistic update
//         const newMsg = {
//             chatId: activeChatId,
//             senderType: 'agent',
//             content: text,
//             timestamp: new Date().toISOString()
//         };

//         setMessagesStore(prev => ({
//             ...prev,
//             [activeChatId]: [...(prev[activeChatId] || []), newMsg]
//         }));

//         setNewMessage('');
//     };

//     // Handle Enter key press
//     const handleKeyPress = (e) => {
//         if (e.key === 'Enter') {
//             sendReply();
//         }
//     };

//     // Get messages for active chat
//     const activeMessages = activeChatId ? messagesStore[activeChatId] || [] : [];

//     return (
//         <div className="app-container">
//             {/* Connection Status */}
//             <div className="connection-status">
//                 Status:
//                 <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}>
//                     {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
//                 </span>
//                 {error && <span className="error">Error: {error}</span>}
//             </div>

//             {/* SIDEBAR */}
//             <div className="sidebar">
//                 <h3>Chats</h3>
//                 {Object.keys(chats).length === 0 ? (
//                     <p>No chats available</p>
//                 ) : (
//                     Object.values(chats).map(chat => {
//                         const customer = chat.participants?.find(p => p.id !== AGENT_ID);
//                         return (
//                             <div
//                                 key={chat.id}
//                                 className={`chat-item ${activeChatId === chat.id ? 'active' : ''}`}
//                                 onClick={() => openChat(chat.id)}
//                             >
//                                 <div className="chat-customer-name">
//                                     {customer?.name || customer?.email || 'Customer'}
//                                 </div>
//                                 {chat.unreadCount > 0 && (
//                                     <span className="unread-badge">{chat.unreadCount}</span>
//                                 )}
//                             </div>
//                         );
//                     })
//                 )}
//             </div>

//             {/* MAIN CHAT */}
//             <div className="main-chat">
//                 {activeChatId ? (
//                     <>
//                         <div className="messages-container">
//                             <div className="messages" id="messages">
//                                 {activeMessages.map((msg, index) => {
//                                     return (
//                                         <div
//                                             key={index}
//                                             className={`message ${msg.senderType === 'agent' ? 'me' : 'customer'}`}
//                                         >
//                                             {msg.content}
//                                         </div>
//                                     )
//                                 })}
//                             </div>
//                         </div>

//                         <div className="input-box">
//                             <input
//                                 id="reply"
//                                 placeholder={isConnected ? "Type reply..." : "Connecting..."}
//                                 value={newMessage}
//                                 onChange={(e) => setNewMessage(e.target.value)}
//                                 onKeyPress={handleKeyPress}
//                                 disabled={!isConnected}
//                             />
//                             <button
//                                 onClick={sendReply}
//                                 disabled={!newMessage.trim() || !isConnected}
//                             >
//                                 {isConnected ? 'Send' : 'Connecting...'}
//                             </button>
//                         </div>
//                     </>
//                 ) : (
//                     <div className="flex flex-col items-center justify-center h-full">
//                         <p className="text-gray-600">Select a chat to start messaging</p>
//                         {!isConnected && <p className="text-red-500">⚠️ Waiting for connection...</p>}
//                     </div>
//                 )}
//             </div>
//         </div>
//     )
// }

// export default App;


import AgentDashboard from "./pages/AgentDashboard";
import NotFound from "./pages/NotFound";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
// import ProtectedRoute from "./components/ProtectedRoute";
// import Login from "./pages/Login";
// import Index from "./pages/Index";
import './App.css';

const App = () => (
    <TooltipProvider>
        <Toaster />
        <BrowserRouter>
            <Routes>
                {/* Public Routes */}
                {/* <Route path="/login" element={<Login />} /> */}

                {/* Protected Routes */}
                {/* <Route
                        path="/"
                        element={
                            <ProtectedRoute>
                                <Index />
                            </ProtectedRoute>
                        }
                    /> */}
                <Route path="/dashboard" element={<AgentDashboard />} />

                {/* 404 */}
                <Route path="*" element={<NotFound />} />
            </Routes>
        </BrowserRouter>
    </TooltipProvider>
);

export default App;