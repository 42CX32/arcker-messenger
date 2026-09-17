import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

let socket = null;
let isConnected = false;
let listenersRegistered = false;

const messageListeners = [];
const typingListeners = [];
const statusListeners = [];
const unseenListeners = [];
const messageSeenListeners = [];

export function initSocket(token) {
    return new Promise((resolve, reject) => {
        // اگر سوکت قبلاً متصل است، همان را برگردان
        if (socket && socket.connected) {
            resolve(socket);
            return;
        }

        // اگر سوکت وجود دارد اما قطع است، دوباره وصل شو
        if (socket) {
            socket.connect();
            resolve(socket);
            return;
        }

        // ساخت سوکت جدید
        socket = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000
        });

        socket.on('connect', () => {
            console.log('✅ Socket connected');
            isConnected = true;
            if (!listenersRegistered) {
                setupListeners();
                listenersRegistered = true;
            }
            resolve(socket);
        });

        socket.on('connect_error', (error) => {
            console.error('❌ Socket connection error:', error);
            reject(error);
        });

        socket.on('disconnect', () => {
            console.log('🔌 Socket disconnected');
            isConnected = false;
        });

        socket.on('reconnect', () => {
            console.log('🔄 Socket reconnected');
            isConnected = true;
        });

        socket.on('reconnect_failed', () => {
            console.error('❌ Socket reconnection failed');
        });
    });
}

function setupListeners() {
    if (!socket) return;
    
    // حذف لیسنرهای قبلی برای جلوگیری از تکرار
    socket.off('new_message');
    socket.off('message_sent');
    socket.off('user_typing');
    socket.off('user_status');
    socket.off('online_users');
    socket.off('unseen_update');
    socket.off('message_seen');

    socket.on('new_message', (data) => {
        messageListeners.forEach(fn => fn(data));
    });
    socket.on('message_sent', (data) => {
        messageListeners.forEach(fn => fn(data, true));
    });
    socket.on('user_typing', (data) => {
        typingListeners.forEach(fn => fn(data));
    });
    socket.on('user_status', (data) => {
        statusListeners.forEach(fn => fn(data));
    });
    socket.on('online_users', (data) => {
        statusListeners.forEach(fn => fn({ type: 'online_list', ...data }));
    });
    socket.on('unseen_update', (data) => {
        unseenListeners.forEach(fn => fn(data));
    });
    socket.on('message_seen', (data) => {
        messageSeenListeners.forEach(fn => fn(data));
    });
}

export function getSocket() {
    return socket;
}

export function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
        isConnected = false;
        listenersRegistered = false;
    }
    // پاک کردن لیسنرها
    messageListeners.length = 0;
    typingListeners.length = 0;
    statusListeners.length = 0;
    unseenListeners.length = 0;
    messageSeenListeners.length = 0;
}

// ---- ثبت لیسنر ----
export function onMessage(fn) {
    messageListeners.push(fn);
    return () => {
        const index = messageListeners.indexOf(fn);
        if (index > -1) messageListeners.splice(index, 1);
    };
}
export function onTyping(fn) {
    typingListeners.push(fn);
    return () => {
        const index = typingListeners.indexOf(fn);
        if (index > -1) typingListeners.splice(index, 1);
    };
}
export function onStatus(fn) {
    statusListeners.push(fn);
    return () => {
        const index = statusListeners.indexOf(fn);
        if (index > -1) statusListeners.splice(index, 1);
    };
}
export function onUnseen(fn) {
    unseenListeners.push(fn);
    return () => {
        const index = unseenListeners.indexOf(fn);
        if (index > -1) unseenListeners.splice(index, 1);
    };
}
export function onMessageSeen(fn) {
    messageSeenListeners.push(fn);
    return () => {
        const index = messageSeenListeners.indexOf(fn);
        if (index > -1) messageSeenListeners.splice(index, 1);
    };
}

// ---- ارسال اقدامات ----
export function sendTyping(receiverId, isTyping) {
    if (socket && socket.connected) {
        socket.emit('typing', { receiverId, isTyping });
    } else {
        console.warn('⚠️ Socket not connected, cannot send typing');
    }
}
export function sendMessage(data) {
    if (socket && socket.connected) {
        socket.emit('send_message', data);
    } else {
        console.warn('⚠️ Socket not connected, cannot send message');
    }
}
export function markSeen(messageIds) {
    if (socket && socket.connected) {
        socket.emit('mark_seen', { messageIds });
    } else {
        console.warn('⚠️ Socket not connected, cannot mark seen');
    }
}