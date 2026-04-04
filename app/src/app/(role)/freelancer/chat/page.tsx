'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { MessageSquare, Search, Briefcase, Loader2, Inbox } from 'lucide-react';
import { ChatPanel } from '@/components/chat';
import { Avatar } from '@/components/ui';
import { subscribeToConversations } from '@/lib/firebase/firestore';
import { useAuth } from '@/lib/firebase/auth-context';
import type { Conversation } from '@/types';
import styles from './page.module.css';

function formatTime(d: unknown): string {
  if (!d) return '';
  let date: Date;
  if (typeof d === 'object' && d !== null && 'toDate' in d) {
    date = (d as { toDate: () => Date }).toDate();
  } else if (d instanceof Date) {
    date = d;
  } else {
    return '';
  }
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Hôm qua';
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

export default function FreelancerChatPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '2rem', color: 'var(--text-secondary)' }}><Loader2 size={18} /> Đang tải...</div>}>
      <FreelancerChatContent />
    </Suspense>
  );
}

function FreelancerChatContent() {
  const { userProfile } = useAuth();
  const searchParams = useSearchParams();
  const convParam = searchParams.get('conv');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConv, setSelectedConv] = useState<string | null>(convParam);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!userProfile) return;
    setLoading(true);
    const unsub = subscribeToConversations(userProfile.uid, (convs) => {
      setConversations(convs);
      setLoading(false);
      // Auto-select conv from URL param, or first conversation
      if (!selectedConv && convs.length > 0) {
        setSelectedConv(convParam || convs[0].id);
      }
    });
    return unsub;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile]);

  const selected = conversations.find(c => c.id === selectedConv);

  const getParticipantName = (conv: Conversation): string => {
    if (!userProfile) return '';
    const otherId = conv.participants.find(p => p !== userProfile.uid);
    // Use metadata participantNames if available
    if (otherId && conv.participantNames && conv.participantNames[otherId]) {
      return conv.participantNames[otherId];
    }
    return 'Job Master';
  };

  const myUnread = (conv: Conversation): number => {
    if (!userProfile) return 0;
    return conv.unreadCount?.[userProfile.uid] || 0;
  };

  const filtered = conversations.filter(c => {
    if (!search) return true;
    const name = getParticipantName(c).toLowerCase();
    const msg = (c.lastMessage || '').toLowerCase();
    return name.includes(search.toLowerCase()) || msg.includes(search.toLowerCase());
  });

  return (
    <div className={styles.chatPage}>
      {/* Sidebar - Conversation List */}
      <div className={styles.convSidebar}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.sidebarTitle}><MessageSquare size={20} /> Tin nhắn</h2>
        </div>
        <div className={styles.searchBox}>
          <Search size={16} />
          <input
            type="text"
            placeholder="Tìm cuộc trò chuyện..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.convList}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '2rem', color: 'var(--text-secondary)' }}>
              <Loader2 size={18} /> Đang tải...
            </div>
          ) : filtered.length === 0 ? (
            <div className={styles.emptyConv}>
              <Inbox size={24} />
              <p>{conversations.length === 0 ? 'Chưa có cuộc trò chuyện nào.' : 'Không tìm thấy kết quả.'}</p>
            </div>
          ) : (
            filtered.map(conv => {
              const participantName = getParticipantName(conv);
              const unread = myUnread(conv);

              return (
                <button
                  key={conv.id}
                  className={`${styles.convItem} ${selectedConv === conv.id ? styles.convActive : ''}`}
                  onClick={() => setSelectedConv(conv.id)}
                >
                  <Avatar name={participantName} size="sm" />
                  <div className={styles.convInfo}>
                    <div className={styles.convName}>{participantName}</div>
                    {conv.jobTitle ? (
                      <div className={styles.convJob}><Briefcase size={12} /> {conv.jobTitle}</div>
                    ) : conv.jobId ? (
                      <div className={styles.convJob}><Briefcase size={12} /> Job #{conv.jobId.slice(0, 8)}</div>
                    ) : null}
                    <div className={styles.convLast}>{conv.lastMessage || 'Bắt đầu trò chuyện...'}</div>
                  </div>
                  <div className={styles.convMeta}>
                    <span className={styles.convTime}>{formatTime(conv.lastMessageAt)}</span>
                    {unread > 0 && <span className={styles.unreadBadge}>{unread}</span>}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={styles.chatArea}>
        {selectedConv && selected ? (
          <ChatPanel
            conversationId={selectedConv}
            participantName={getParticipantName(selected)}
          />
        ) : (
          <div className={styles.noChatSelected}>
            <MessageSquare size={48} />
            <p>{conversations.length === 0 ? 'Bạn chưa có cuộc trò chuyện nào.' : 'Chọn một cuộc trò chuyện để bắt đầu.'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
