import { useState, useEffect, useRef } from 'react';
import { Send, X, CheckCheck, Sparkles } from 'lucide-react';
import api from '../services/api';
import socket from '../services/socket';

const ChatBox = ({ booking, currentUser, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  const otherParty = currentUser.role === 'customer' ? booking.worker : booking.customer;
  const bookingId = booking._id;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await api.get(`/messages/${bookingId}`);
        setMessages(res.data);
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoading(false);
        setTimeout(scrollToBottom, 100);
      }
    };

    fetchMessages();

    // Join socket room
    socket.emit('join_booking', bookingId);

    // Listen for new messages
    const handleReceiveMessage = (message) => {
      if (message.bookingId === bookingId) {
        setMessages(prev => [...prev, message]);
        setTimeout(scrollToBottom, 100);
      }
    };
    socket.on('receive_message', handleReceiveMessage);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
    };
  }, [bookingId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messageData = {
      bookingId,
      senderId: currentUser._id,
      senderModel: currentUser.role === 'customer' ? 'Customer' : 'Worker',
      content: newMessage,
      timestamp: new Date().toISOString()
    };

    try {
      await api.post('/messages', messageData);
      socket.emit('send_message', messageData);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="glass-premium w-full max-w-lg h-[600px] flex flex-col rounded-[2.5rem] border-white/10 shadow-glow-blue/20 overflow-hidden animate-in zoom-in-95 duration-300">

        {/* Chat Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={otherParty?.photoUrl || `https://ui-avatars.com/api/?name=${otherParty?.name}&background=7F5AF0&color=fff`}
                className="w-12 h-12 rounded-2xl object-cover border border-white/10 shadow-glow-blue/10"
                alt=""
              />
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-neon-green rounded-full border-2 border-[#020617] shadow-glow-blue"></div>
            </div>
            <div>
              <h3 className="text-white font-black text-sm tracking-tight">{otherParty?.name || 'User'}</h3>
              <p className="text-neon-blue text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1 h-1 bg-neon-blue rounded-full animate-pulse"></span>
                {booking.status === 'completed' ? 'Archive Chat' : 'Live Discussion'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 bg-white/5 rounded-2xl text-white/40 hover:text-white hover:bg-white/10 transition-all active:scale-90"
          >
            <X size={20} />
          </button>
        </div>

        {/* Message List */}
        <div className="flex-grow overflow-y-auto p-6 space-y-4 custom-scrollbar bg-black/20">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center">
              <div className="w-10 h-10 border-4 border-neon-blue/20 border-t-neon-blue rounded-full animate-spin mb-4"></div>
              <p className="text-white/20 text-[10px] font-black uppercase tracking-widest">Securing Connection...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-10">
              <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center mb-4 border border-white/10 rotate-3">
                <Sparkles size={28} className="text-neon-blue/50" />
              </div>
              <p className="text-white font-black text-sm uppercase tracking-tight">No Messages Yet</p>
              <p className="text-white/30 text-[11px] font-bold mt-2 leading-relaxed">
                Be the first to say hi! Discuss your project requirements or share updates here.
              </p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const isMe = msg.senderId === currentUser._id;
              return (
                <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                  <div className={`max-w-[80%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`px-4 py-3 rounded-2xl text-[13px] font-bold leading-relaxed ${isMe
                      ? 'bg-gradient-primary text-white shadow-glow-blue/20 rounded-tr-none'
                      : 'bg-white/5 text-white/90 border border-white/10 rounded-tl-none backdrop-blur-md'
                      }`}>
                      {msg.content}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5 px-1">
                      <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isMe && <CheckCheck size={12} className="text-neon-blue opacity-50" />}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-6 border-t border-white/5 bg-white/[0.02] backdrop-blur-md">
          <form onSubmit={handleSendMessage} className="flex items-center gap-3">
            <div className="flex-grow relative group">
              <input
                type="text"
                placeholder="Message details..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-5 pr-4 py-4 text-sm text-white placeholder-white/20 outline-none focus:border-neon-blue/50 focus:ring-2 focus:ring-neon-blue/10 transition-all font-bold"
              />
              <div className="absolute inset-0 rounded-2xl bg-neon-blue/5 opacity-0 group-focus-within:opacity-100 pointer-events-none transition-opacity"></div>
            </div>
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="p-4 bg-gradient-primary text-white rounded-2xl shadow-glow-blue hover:opacity-90 transition-all active:scale-95 disabled:opacity-30 disabled:grayscale"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatBox;
