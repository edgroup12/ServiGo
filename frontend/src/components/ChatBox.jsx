import React, { useState, useEffect, useRef } from 'react';
import { User, X, Send } from 'lucide-react';
import api from '../services/api';
import socket from '../services/socket';

const ChatBox = ({ booking, currentUser, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  // The other party's details
  const otherParty = currentUser.role === 'customer' ? booking.worker : booking.customer;

  useEffect(() => {
    // Fetch previous messages
    const fetchMessages = async () => {
      try {
        const res = await api.get(`/messages/${booking._id}`);
        setMessages(res.data);
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };
    fetchMessages();

    // Join socket room
    socket.emit('join_booking', booking._id);

    // Listen for incoming messages
    socket.on('receive_message', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      socket.off('receive_message');
    };
  }, [booking._id]);

  useEffect(() => {
    // Scroll to bottom on new message
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messageData = {
      bookingId: booking._id,
      senderId: currentUser._id,
      senderModel: currentUser.role === 'customer' ? 'Customer' : 'Worker',
      content: newMessage,
      timestamp: new Date().toISOString(),
    };

    try {
      // Save to database
      await api.post('/messages', messageData);
      
      // Emit via socket
      socket.emit('send_message', messageData);
      
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 h-[500px] max-h-[80vh] flex flex-col glass-premium rounded-[2rem] shadow-2xl border border-[var(--glass-border)] z-50 overflow-hidden transform transition-all duration-300">
      {/* Header */}
      <div className="p-4 bg-[var(--navbar-bg)] backdrop-blur-md border-b border-[var(--glass-border)] flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center shadow-soft">
            <User className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-[var(--text-main)] text-sm">{otherParty?.name || 'User'}</h3>
            <p className="text-[10px] text-neon-teal font-bold uppercase tracking-widest">
              {booking.status === 'completed' ? 'Completed Job' : 'Active Job'}
            </p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-2 bg-[var(--glass-bg)] hover:bg-white/20 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-main)] transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 hide-scrollbar bg-[var(--bg-color)]/50 backdrop-blur-sm">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest">No messages yet</p>
            <p className="text-[10px]">Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.senderId === currentUser._id;
            return (
              <div key={index} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[75%] p-3 rounded-2xl ${
                    isMe 
                      ? 'bg-gradient-primary text-white rounded-br-sm shadow-glow-blue/20' 
                      : 'bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-main)] rounded-bl-sm'
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                  <p className={`text-[9px] mt-1 font-bold ${isMe ? 'text-white/60 text-right' : 'text-[var(--text-muted)]'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-[var(--navbar-bg)] backdrop-blur-md border-t border-[var(--glass-border)]">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input 
            type="text" 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-full px-4 py-2.5 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-neon-blue transition-colors"
          />
          <button 
            type="submit"
            disabled={!newMessage.trim()}
            className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white shadow-soft disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform"
          >
            <Send size={16} className="ml-1" />
          </button>
        </form>
      </div>
      
      <div className="h-4"></div>
    </div>
  );
};

export default ChatBox;
