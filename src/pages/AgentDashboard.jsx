import { useEffect, useState, useRef } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useGetChatsQuery } from '@/store/api/chatApi.js';

function AgentDashboard() {
    const AGENT_ID = 'cmlertdeh0000ku7bmn9xdtlr';
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

    const { isConnected, error, emit, on, off } = useSocket(SOCKET_URL, {
        transports: ['websocket'],
        autoConnect: true,
    });

    const [chats, setChats] = useState({});
    const [messagesStore, setMessagesStore] = useState({});
    const [activeChatId, setActiveChatId] = useState(null);
    const [newMessage, setNewMessage] = useState('');

    const messagesEndRef = useRef(null);

    // ---------- LOAD INITIAL DATA (NORMALISED BY CHATAPI) ----------
    const { data: chatData, error: chatError } = useGetChatsQuery(AGENT_ID);

    useEffect(() => {
        if (chatData) {
            console.log("chatData", chatData);
            setChats(chatData.chatMap);
            setMessagesStore(chatData.messagesMap); // ✅ already perfect shape
        }
        if (chatError) console.error('Failed to load chats:', chatError);
    }, [chatData, chatError]);

    // ---------- SOCKET: ONE‑TIME SETUP ----------
    useEffect(() => {
        console.log("chats running");
        const handleChatAssigned = (chat) => {
            // Add new chat to sidebar
            setChats(prev => ({ ...prev, [chat.id]: chat }));

            // Normalise initial messages (same shape as chatApi)
            const initialMessages = (chat.messages || []).map(msg => ({
                chatId: chat.id,
                message: msg.content,
                senderId: msg.userId ?? msg.customerId,
                senderType: msg.userId ? 'agent' : 'customer',
                id: msg.id,
                timestamp: msg.createdAt,
            }));

            setMessagesStore(prev => ({
                ...prev,
                [chat.id]: initialMessages,
            }));

            // 🔥 JOIN ROOM IMMEDIATELY – receives all future messages
            console.log("chat", chat);
            emit('chat:join', { chatId: chat.id });
        };

        const handleNewMessage = (msg) => {
            console.log('📨 New message:', msg);
            if (!msg?.chatId) return;

            // Server already sends { chatId, message, senderId, senderType, id, timestamp }
            // or we normalise here for safety:
            const normalised = {
                chatId: msg.chatId,
                message: msg.message ?? msg.content,
                senderId: msg.senderId ?? msg.userId ?? msg.customerId,
                senderType: msg.senderType ?? (msg.userId ? 'agent' : 'customer'),
                id: msg.id,
                timestamp: msg.timestamp ?? msg.createdAt,
            };

            setMessagesStore(prev => ({
                ...prev,
                [msg.chatId]: [...(prev[msg.chatId] || []), normalised],
            }));

            // Unread counter for sidebar (if not active)
            if (activeChatId !== msg.chatId) {
                setChats(prev => ({
                    ...prev,
                    [msg.chatId]: {
                        ...prev[msg.chatId],
                        unreadCount: (prev[msg.chatId]?.unreadCount || 0) + 1,
                    },
                }));
            }
        };

        on('chat:assigned', handleChatAssigned);
        on('message:new', handleNewMessage);

        return () => {
            off('chat:assigned', handleChatAssigned);
            off('message:new', handleNewMessage);
        };
    }, [on, off, emit, activeChatId, chats]);

    // ---------- AGENT AUTH ----------
    useEffect(() => {
        if (isConnected) {
            console.log('🟢 Sending agent:connect');
            emit('agent:connect', { agentId: AGENT_ID }, (res) =>
                console.log('Agent connect response:', res)
            );
        }
    }, [isConnected, emit]);

    // ---------- JOIN ROOM WHEN ACTIVATING CHAT ----------
    useEffect(() => {
        console.log("activeChatId", activeChatId);
        if (activeChatId && isConnected) {
            emit('chat:join', { chatId: activeChatId });

            // Reset unread count when opening
            setChats(prev => ({
                ...prev,
                [activeChatId]: { ...prev[activeChatId], unreadCount: 0 },
            }));
        }
    }, [activeChatId, isConnected, emit]);

    // ---------- AUTO‑SCROLL ----------
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messagesStore, activeChatId]);

    // ---------- SEND MESSAGE ----------
    const sendReply = () => {
        const text = newMessage.trim();
        if (!text || !activeChatId) return;
        if (!isConnected) return alert('Not connected');

        const messageData = {
            chatId: activeChatId,
            senderId: AGENT_ID,
            senderType: 'agent',
            message: text,
        };

        emit('message:send', messageData, (response) => {
            console.log('✅ Message sent:', response);
        });

        // Optimistic update – unique temporary ID
        const optimisticMsg = {
            chatId: activeChatId,
            message: text,
            senderId: AGENT_ID,
            senderType: 'agent',
            id: `temp-${Date.now()}-${Math.random()}`,
            timestamp: new Date().toISOString(),
        };

        setMessagesStore(prev => ({
            ...prev,
            [activeChatId]: [...(prev[activeChatId] || []), optimisticMsg],
        }));

        setNewMessage('');
    };

    const handleKeyPress = (e) => e.key === 'Enter' && sendReply();

    const activeMessages = activeChatId ? messagesStore[activeChatId] || [] : [];

    return (
        <div className="app-container">
            {/* Connection Status */}
            <div className="connection-status">
                Status:
                <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}>
                    {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
                </span>
                {error && <span className="error">Error: {error}</span>}
            </div>

            {/* Sidebar */}
            <div className="sidebar">
                <h3>Chats</h3>
                {Object.keys(chats).length === 0 ? (
                    <p>No chats available</p>
                ) : (
                    Object.values(chats).map(chat => {
                        const customer = chat.customer;
                        return (
                            <div
                                key={chat.id}
                                className={`chat-item ${activeChatId === chat.id ? 'active' : ''}`}
                                onClick={() => setActiveChatId(chat.id)}
                            >
                                <div className="chat-customer-name">
                                    {customer?.name || customer?.email || 'Customer'}
                                </div>
                                {chat.unreadCount > 0 && (
                                    <span className="unread-badge">{chat.unreadCount}</span>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Main Chat Area */}
            <div className="main-chat">
                {activeChatId ? (
                    <>
                        <div className="messages-container">
                            <div className="messages">
                                {activeMessages.map(msg => (
                                    <div
                                        key={msg.id} // ✅ guaranteed unique
                                        className={`message ${msg.senderType === 'agent' ? 'me' : 'customer'}`}
                                    >
                                        {msg.message}
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>
                        </div>

                        <div className="input-box">
                            <input
                                placeholder={isConnected ? 'Type reply...' : 'Connecting...'}
                                value={newMessage}
                                onChange={e => setNewMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                disabled={!isConnected}
                            />
                            <button
                                onClick={sendReply}
                                disabled={!newMessage.trim() || !isConnected}
                            >
                                {isConnected ? 'Send' : 'Connecting...'}
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                        <p className="text-gray-600">Select a chat to start messaging</p>
                        {!isConnected && <p className="text-red-500">⚠️ Waiting for connection...</p>}
                    </div>
                )}
            </div>
        </div>
    );
}

export default AgentDashboard;