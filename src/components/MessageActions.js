// MessageActions.js - created by script
export default function MessageActions({ message, onEdit, onDelete, onForward, onPin, onReact, onReply }) {
  const div = document.createElement('div');
  div.className = 'message-actions-popup';
  div.innerHTML = `
    <button class="msg-action" data-action="reply">↩ Reply</button>
    <button class="msg-action" data-action="react">😊 React</button>
    <button class="msg-action" data-action="forward">➡ Forward</button>
    ${message.sender_id === currentUserId ? `
      <button class="msg-action" data-action="edit">✏ Edit</button>
      <button class="msg-action" data-action="delete">🗑 Delete</button>
    ` : ''}
    <button class="msg-action" data-action="pin">📌 ${message.pinned ? 'Unpin' : 'Pin'}</button>
  `;
  div.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      if (action === 'reply') onReply(message);
      else if (action === 'react') onReact(message);
      else if (action === 'forward') onForward(message);
      else if (action === 'edit') onEdit(message);
      else if (action === 'delete') onDelete(message);
      else if (action === 'pin') onPin(message);
    });
  });
  return div;
}