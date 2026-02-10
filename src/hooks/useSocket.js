// /src/hooks/useSocket.js
import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

export const useSocket = (url, options = {}) => {
    const socketRef = useRef(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState(null);

    // Queue for events before connection
    const eventQueueRef = useRef([]);

    // Initialize socket
    useEffect(() => {
        // Create socket connection
        socketRef.current = io(url, {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            ...options
        });

        // Connection events
        socketRef.current.on('connect', () => {
            console.log('✅ Socket connected');
            setIsConnected(true);
            setError(null);

            // Process queued events after connection
            processEventQueue();
        });

        socketRef.current.on('connect_error', (err) => {
            console.error('❌ Socket connection error:', err);
            setError(err.message);
            setIsConnected(false);
        });

        socketRef.current.on('disconnect', () => {
            console.log('⚠️ Socket disconnected');
            setIsConnected(false);
        });

        // Cleanup
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [url, options]);

    // Process queued events
    const processEventQueue = useCallback(() => {
        if (socketRef.current && isConnected) {
            while (eventQueueRef.current.length > 0) {
                const { event, data, callback } = eventQueueRef.current.shift();
                socketRef.current.emit(event, data, callback);
            }
        }
    }, [isConnected]);

    // Emit event (with queue support)
    const emit = useCallback((event, data, callback) => {
        if (!socketRef.current) {
            console.error('Socket not initialized');
            return false;
        }

        // If connected, emit immediately
        if (isConnected) {
            socketRef.current.emit(event, data, callback);
            return true;
        }
        // If not connected, queue the event
        else {
            console.log(`📝 Queuing event '${event}' until connection...`);
            eventQueueRef.current.push({ event, data, callback });
            return false;
        }
    }, [isConnected]);

    // Listen to event
    const on = useCallback((event, callback) => {
        if (socketRef.current) {
            socketRef.current.on(event, callback);
        }
    }, []);

    // Remove listener
    const off = useCallback((event, callback) => {
        if (socketRef.current) {
            socketRef.current.off(event, callback);
        }
    }, []);

    // Manual connect
    const connect = useCallback(() => {
        if (socketRef.current && !socketRef.current.connected) {
            socketRef.current.connect();
        }
    }, []);

    // Manual disconnect
    const disconnect = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.disconnect();
        }
    }, []);

    return {
        socket: socketRef.current,
        isConnected,
        error,
        emit,
        on,
        off,
        connect,
        disconnect,
        hasQueuedEvents: eventQueueRef.current.length > 0,
    };
};