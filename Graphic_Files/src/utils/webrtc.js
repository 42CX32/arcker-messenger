import SimplePeer from 'simple-peer';

export function createCall(stream, initiator = true) {
  const peer = new SimplePeer({ initiator, stream, trickle: false });
  return peer;
}

export function getLocalStream() {
  return navigator.mediaDevices.getUserMedia({ video: true, audio: true });
}

// Signal exchange via socket
export function setupCallEvents(peer, socket, targetUserId) {
  peer.on('signal', (data) => {
    socket.emit('call_signal', { targetUserId, signal: data });
  });
  socket.on('call_signal', ({ signal, from }) => {
    if (from === targetUserId) peer.signal(signal);
  });
  return peer;
}