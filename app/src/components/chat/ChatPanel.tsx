'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X, Video } from 'lucide-react';
import { useMessages, useSendMessage } from '@/lib/hooks/useChat';
import { useAuth } from '@/lib/firebase/auth-context';
import { markConversationRead } from '@/lib/firebase/firestore';
import { Avatar } from '@/components/ui';
import styles from './ChatPanel.module.css';

interface ChatPanelProps {
  conversationId: string;
  participantName?: string;
  onClose?: () => void;
}

export default function ChatPanel({ conversationId, participantName, onClose }: ChatPanelProps) {
  const { userProfile } = useAuth();
  const { messages, loading } = useMessages(conversationId);
  const { send, sending } = useSendMessage(conversationId);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark conversation as read when panel opens or new messages arrive
  useEffect(() => {
    if (conversationId && userProfile?.uid) {
      markConversationRead(conversationId, userProfile.uid);
    }
  }, [conversationId, userProfile?.uid, messages.length]);

  const handleSend = async () => {
    if (!input.trim() || !userProfile) return;
    const content = input.trim();
    setInput('');
    await send(userProfile.uid, content);
  };

  const handleCreateMeeting = async () => {
    if (!userProfile) return;
    const meetUrl = 'https://meet.google.com/new';
    await send(userProfile.uid, `📹 Đã tạo cuộc họp Google Meet — Tham gia tại: ${meetUrl}`);
    window.open(meetUrl, '_blank');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.chatPanel}>
      {/* Header */}
      <div className={styles.chatHeader}>
        <div className={styles.chatHeaderInfo}>
          <Avatar name={participantName || 'Chat'} size="sm" />
          <span className={styles.chatHeaderName}>{participantName || 'Tin nhắn'}</span>
        </div>
        {onClose && (
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close chat">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className={styles.messagesContainer}>
        {loading && <div className={styles.loadingState}>Đang tải tin nhắn...</div>}
        {!loading && messages.length === 0 && (
          <div className={styles.emptyState}>Chưa có tin nhắn. Hãy bắt đầu cuộc trò chuyện!</div>
        )}
        {messages.map((msg) => {
          const isOwn = msg.senderId === userProfile?.uid;
          return (
            <div key={msg.id} className={`${styles.message} ${isOwn ? styles.own : styles.other}`}>
              <div className={styles.messageBubble}>
                <p className={styles.messageContent}>{msg.content}</p>
                {msg.type === 'file' && msg.fileURL && (
                  <a href={msg.fileURL} target="_blank" rel="noopener noreferrer" className={styles.fileLink}>
                    <Paperclip size={14} /> {msg.fileName || 'File đính kèm'}
                  </a>
                )}
                <span className={styles.messageTime}>
                  {msg.createdAt && typeof msg.createdAt === 'object' && 'toDate' in msg.createdAt
                    ? (msg.createdAt as { toDate: () => Date }).toDate().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                    : ''}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className={styles.inputContainer}>
        <button
          className={styles.sendBtn}
          onClick={handleCreateMeeting}
          aria-label="Create meeting"
          title="Tạo cuộc họp Google Meet"
          style={{ marginRight: 4 }}
        >
          <Video size={18} />
        </button>
        <textarea
          className={styles.textInput}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nhập tin nhắn..."
          rows={1}
          disabled={sending}
        />
        <button
          className={styles.sendBtn}
          onClick={handleSend}
          disabled={!input.trim() || sending}
          aria-label="Send message"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
