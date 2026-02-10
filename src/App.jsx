import './App.css'
import { io } from 'socket.io-client';
import { useEffect, useRef, useState } from 'react';

function App() {
    const AGENT_ID = 'cmlertdeh0000ku7bmn9xdtlr';
    const API_URL = 'https://deen365.net';
    
    const socketRef = useRef(null);
    const [chats, setChats] = useState({});
    const [messagesStore, setMessagesStore] = useState({});
    const [activeChatId, setActiveChatId] = useState(null);
    const [newMessage, setNewMessage] = useState('');

    // =========================
    // INITIALIZE SOCKET ONCE
    // =========================
    useEffect(() => {
        // Create socket connection
        socketRef.current = io(API_URL, { transports: ['websocket'] });

        // =========================
        // AGENT CONNECT
        // =========================
        socketRef.current.emit('agent:connect', { agentId: AGENT_ID });

        // =========================
        // LOAD EXISTING CHATS
        // =========================
        fetch(`${API_URL}/api/chat/agent/${AGENT_ID}`)
            .then(res => res.json())
            .then(agentChats => {
                const chatMap = {};
                const messagesMap = {};
                
                agentChats.forEach(chat => {
                    chatMap[chat.id] = chat;
                    messagesMap[chat.id] = chat.messages || [];
                });
                
                setChats(chatMap);
                setMessagesStore(messagesMap);
            });

        // =========================
        // NEW CHAT ASSIGNED
        // =========================
        socketRef.current.on('chat:assigned', (chat) => {
            setChats(prev => ({
                ...prev,
                [chat.id]: chat
            }));
            setMessagesStore(prev => ({
                ...prev,
                [chat.id]: chat.messages || []
            }));
            alert('New customer assigned!');
        });

        // =========================
        // RECEIVE NEW MESSAGE
        // =========================
        socketRef.current.on('message:new', (msg) => {
            if (!msg || !msg.chatId) return;

            setMessagesStore(prev => ({
                ...prev,
                [msg.chatId]: [...(prev[msg.chatId] || []), msg]
            }));
        });

        // Cleanup on unmount
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [API_URL, AGENT_ID]);

    // =========================
    // OPEN CHAT
    // =========================
    const openChat = (chatId) => {
        setActiveChatId(chatId);
        if (socketRef.current) {
            socketRef.current.emit('chat:join', { chatId });
        }
    };

    // =========================
    // SEND MESSAGE
    // =========================
    const sendReply = () => {
        const text = newMessage.trim();
        if (!text || !activeChatId || !socketRef.current) return;

        socketRef.current.emit('message:send', {
            chatId: activeChatId,
            senderId: AGENT_ID,
            senderType: 'agent',
            message: text,
        });

        // Add message to UI immediately
        const newMsg = {
            chatId: activeChatId,
            senderType: 'agent',
            content: text,
            timestamp: new Date().toISOString()
        };

        setMessagesStore(prev => ({
            ...prev,
            [activeChatId]: [...(prev[activeChatId] || []), newMsg]
        }));

        setNewMessage('');
    };

    // Handle Enter key press
    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            sendReply();
        }
    };

    // Get messages for active chat
    const activeMessages = activeChatId ? messagesStore[activeChatId] || [] : [];

    return (
        <div className="app-container">
            {/* SIDEBAR */}
            <div className="sidebar">
                <h3>Chats</h3>
                {Object.keys(chats).length === 0 ? (
                    <p>No chats available</p>
                ) : (
                    Object.values(chats).map(chat => {
                        const customer = chat.participants?.find(p => p.id !== AGENT_ID);
                        return (
                            <div
                                key={chat.id}
                                className={`chat-item ${activeChatId === chat.id ? 'active' : ''}`}
                                onClick={() => openChat(chat.id)}
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

            {/* MAIN CHAT */}
            <div className="main-chat">
                {activeChatId ? (
                    <>
                        <div className="messages-container">
                            <div className="messages" id="messages">
                                {activeMessages.map((msg, index) => (
                                    <div
                                        key={index}
                                        className={`message ${msg.senderType === 'agent' ? 'me' : 'customer'}`}
                                    >
                                        {msg.content}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="input-box">
                            <input
                                id="reply"
                                placeholder="Type reply..."
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                            />
                            <button onClick={sendReply} disabled={!newMessage.trim()}>
                                Send
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="no-chat-selected">
                        <p>Select a chat to start messaging</p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default App;