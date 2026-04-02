'use client';

import React, { useState } from 'react';
import { MessageSquare, Search, Briefcase } from 'lucide-react';
import { ChatPanel } from '@/components/chat';
import { Avatar, Badge } from '@/components/ui';
import styles from './page.module.css';

const MOCK_CONVERSATIONS = [
  { id: 'conv-1', participantName: 'Nguyễn Thanh Hùng', jobTitle: 'Thiết kế kiến trúc Nhà xưởng KCN Bình Dương', lastMessage: 'Em đã upload bản vẽ phương án 2 rồi ạ.', lastTime: '10:30', unread: 2 },
  { id: 'conv-2', participantName: 'Trần Minh Tuấn', jobTitle: 'BIM Modeling tổ hợp văn phòng Q7', lastMessage: 'Anh ơi, file Revit model ở link GDrive em gửi nhé.', lastTime: 'Hôm qua', unread: 0 },
  { id: 'conv-3', participantName: 'Lê Thị Hoa', jobTitle: 'Hệ thống MEP chung cư Thủ Đức', lastMessage: 'OK em xác nhận milestone 1 đạt rồi.', lastTime: '28/03', unread: 0 },
  { id: 'conv-4', participantName: 'Phạm Đức Anh', jobTitle: 'Dự toán trường học TPHCM', lastMessage: 'Dạ em đang làm đợt cuối, khoảng 3 ngày nữa xong ạ.', lastTime: '25/03', unread: 1 },
];

export default function JobMasterChatPage() {
  const [selectedConv, setSelectedConv] = useState<string | null>(MOCK_CONVERSATIONS[0]?.id || null);
  const [search, setSearch] = useState('');

  const selected = MOCK_CONVERSATIONS.find(c => c.id === selectedConv);
  const filtered = MOCK_CONVERSATIONS.filter(c =>
    c.participantName.toLowerCase().includes(search.toLowerCase()) ||
    c.jobTitle.toLowerCase().includes(search.toLowerCase())
  );

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
          {filtered.map(conv => (
            <button
              key={conv.id}
              className={`${styles.convItem} ${selectedConv === conv.id ? styles.convActive : ''}`}
              onClick={() => setSelectedConv(conv.id)}
            >
              <Avatar name={conv.participantName} size="sm" />
              <div className={styles.convInfo}>
                <div className={styles.convName}>{conv.participantName}</div>
                <div className={styles.convJob}><Briefcase size={12} /> {conv.jobTitle}</div>
                <div className={styles.convLast}>{conv.lastMessage}</div>
              </div>
              <div className={styles.convMeta}>
                <span className={styles.convTime}>{conv.lastTime}</span>
                {conv.unread > 0 && <span className={styles.unreadBadge}>{conv.unread}</span>}
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className={styles.emptyConv}>Không có cuộc trò chuyện nào.</div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={styles.chatArea}>
        {selectedConv && selected ? (
          <ChatPanel
            conversationId={selectedConv}
            participantName={selected.participantName}
          />
        ) : (
          <div className={styles.noChatSelected}>
            <MessageSquare size={48} />
            <p>Chọn một cuộc trò chuyện để bắt đầu.</p>
          </div>
        )}
      </div>
    </div>
  );
}
