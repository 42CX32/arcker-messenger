import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3000`;
let socket = null;
let isConnected = false;
let listenersRegistered = false;

const messageListeners = [];
const typingListeners = [];
const statusListeners = [];
const unseenListeners = [];
const messageSeenListeners = [];
const unseenMessagesListeners = [];
const avatarUpdateListeners = [];
const profileUpdateListeners = [];
const reactionAddedListeners = []; // <-- اضافه شد
const reactionRemovedListeners = []; // <-- اضافه شد

export function initSocket(token) {
    return new Promise((resolve, reject) => {
        if (socket && socket.connected) {
            resolve(socket);
            return;
        }

        if (socket) {
            socket.connect();
            resolve(socket);
            return;
        }

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
    if (!socket) {
        console.error('❌ Cannot setup listeners: socket is null');
        return;
    }

    socket.off('new_message');
    socket.off('message_sent');
    socket.off('user_typing');
    socket.off('user_status');
    socket.off('online_users');
    socket.off('unseen_update');
    socket.off('message_seen');
    socket.off('unseen_messages');
    socket.off('avatar_update');
    socket.off('profile_update');
    socket.off('reaction_added');    // <-- اضافه شد
    socket.off('reaction_removed');  // <-- اضافه شد

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
    socket.on('unseen_messages', (data) => {
        unseenMessagesListeners.forEach(fn => fn(data));
    });
    socket.on('avatar_update', (data) => {
        avatarUpdateListeners.forEach(fn => fn(data));
    });
    socket.on('profile_update', (data) => {
        profileUpdateListeners.forEach(fn => fn(data));
    });
    socket.on('reaction_added', (data) => {    // <-- اضافه شد
        reactionAddedListeners.forEach(fn => fn(data));
    });
    socket.on('reaction_removed', (data) => {  // <-- اضافه شد
        reactionRemovedListeners.forEach(fn => fn(data));
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
    // پاک کردن تمام لیسنرها
    messageListeners.length = 0;
    typingListeners.length = 0;
    statusListeners.length = 0;
    unseenListeners.length = 0;
    messageSeenListeners.length = 0;
    unseenMessagesListeners.length = 0;
    avatarUpdateListeners.length = 0;
    profileUpdateListeners.length = 0;
    reactionAddedListeners.length = 0;    // <-- اضافه شد
    reactionRemovedListeners.length = 0;  // <-- اضافه شد
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
export function onUnseenMessages(fn) {
    unseenMessagesListeners.push(fn);
    return () => {
        const index = unseenMessagesListeners.indexOf(fn);
        if (index > -1) unseenMessagesListeners.splice(index, 1);
    };
}
export function onAvatarUpdate(fn) {
    avatarUpdateListeners.push(fn);
    return () => {
        const index = avatarUpdateListeners.indexOf(fn);
        if (index > -1) avatarUpdateListeners.splice(index, 1);
    };
}
export function onProfileUpdate(fn) {
    profileUpdateListeners.push(fn);
    return () => {
        const index = profileUpdateListeners.indexOf(fn);
        if (index > -1) profileUpdateListeners.splice(index, 1);
    };
}
// ---- توابع جدید برای واکنش‌ها ----
export function onReactionAdded(fn) {
    reactionAddedListeners.push(fn);
    return () => {
        const index = reactionAddedListeners.indexOf(fn);
        if (index > -1) reactionAddedListeners.splice(index, 1);
    };
}
export function onReactionRemoved(fn) {
    reactionRemovedListeners.push(fn);
    return () => {
        const index = reactionRemovedListeners.indexOf(fn);
        if (index > -1) reactionRemovedListeners.splice(index, 1);
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