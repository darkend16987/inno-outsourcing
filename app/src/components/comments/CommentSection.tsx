'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Heart, Reply, Paperclip } from 'lucide-react';
import { useAuth } from '@/lib/firebase/auth-context';
import { addComment, subscribeToComments, toggleCommentLike } from '@/lib/firebase/comments';
import type { Comment } from '@/types';
import styles from './CommentSection.module.css';

interface CommentSectionProps {
  jobId: string;
  className?: string;
}

export function CommentSection({ jobId, className = '' }: CommentSectionProps) {
  const { firebaseUser, userProfile } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyToName, setReplyToName] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = subscribeToComments(jobId, (items) => {
      setComments(items);
    });
    return unsub;
  }, [jobId]);

  const handleSend = async () => {
    if (!content.trim() || !firebaseUser || !userProfile) return;
    setSending(true);
    try {
      await addComment({
        jobId,
        authorId: firebaseUser.uid,
        authorName: userProfile.displayName || 'Người dùng',
        authorRole: userProfile.role || 'freelancer',
        content: content.trim(),
        parentCommentId: replyTo,
      });
      setContent('');
      setReplyTo(null);
      setReplyToName('');
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      console.error('Error sending comment:', err);
    }
    setSending(false);
  };

  const handleLike = async (commentId: string, likes: string[]) => {
    if (!firebaseUser) return;
    const isLiked = likes.includes(firebaseUser.uid);
    await toggleCommentLike(commentId, firebaseUser.uid, isLiked);
  };

  const handleReply = (commentId: string, authorName: string) => {
    setReplyTo(commentId);
    setReplyToName(authorName);
  };

  // Organize comments: top-level then replies
  const topLevel = comments.filter(c => !c.parentCommentId);
  const getReplies = (parentId: string) =>
    comments.filter(c => c.parentCommentId === parentId);

  const getInitials = (name: string) => {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  };

  const getRoleBadge = (role: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      admin: { label: 'Admin', cls: styles.roleAdmin },
      jobmaster: { label: 'Quản lý', cls: styles.roleJobmaster },
      accountant: { label: 'Kế toán', cls: styles.roleAccountant },
      freelancer: { label: 'Freelancer', cls: styles.roleFreelancer },
    };
    return map[role] || map.freelancer;
  };

  const formatTime = (date: Date | { toDate: () => Date } | null) => {
    if (!date) return '';
    const d = typeof (date as { toDate?: unknown }).toDate === 'function'
      ? (date as { toDate: () => Date }).toDate()
      : new Date(date as unknown as string);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    return `${Math.floor(diff / 86400)} ngày trước`;
  };

  const renderComment = (comment: Comment, isReply = false) => {
    const role = getRoleBadge(comment.authorRole);
    const isLiked = firebaseUser ? comment.likes?.includes(firebaseUser.uid) : false;

    return (
      <div key={comment.id} className={`${styles.comment} ${isReply ? styles.reply : ''}`}>
        <div className={styles.avatar} data-role={comment.authorRole}>
          {getInitials(comment.authorName)}
        </div>
        <div className={styles.commentBody}>
          <div className={styles.commentHeader}>
            <span className={styles.authorName}>{comment.authorName}</span>
            <span className={`${styles.roleBadge} ${role.cls}`}>{role.label}</span>
            <span className={styles.time}>{formatTime(comment.createdAt)}</span>
          </div>
          <p className={styles.commentContent}>{comment.content}</p>
          {comment.attachmentURL && (
            <a href={comment.attachmentURL} target="_blank" rel="noopener noreferrer" className={styles.attachment}>
              <Paperclip size={12} /> Tệp đính kèm
            </a>
          )}
          <div className={styles.commentActions}>
            <button
              className={`${styles.actionBtn} ${isLiked ? styles.liked : ''}`}
              onClick={() => handleLike(comment.id, comment.likes || [])}
            >
              <Heart size={13} fill={isLiked ? 'currentColor' : 'none'} />
              {(comment.likes?.length || 0) > 0 && <span>{comment.likes.length}</span>}
            </button>
            {!isReply && (
              <button
                className={styles.actionBtn}
                onClick={() => handleReply(comment.id, comment.authorName)}
              >
                <Reply size={13} /> Trả lời
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`${styles.section} ${className}`}>
      <h3 className={styles.title}>
        Bình luận & Trao đổi
        {comments.length > 0 && <span className={styles.count}>{comments.length}</span>}
      </h3>

      <div className={styles.commentsList}>
        {topLevel.length === 0 && (
          <p className={styles.empty}>Chưa có bình luận nào. Hãy là người đầu tiên!</p>
        )}
        {topLevel.map(comment => (
          <React.Fragment key={comment.id}>
            {renderComment(comment)}
            {getReplies(comment.id).map(reply => renderComment(reply, true))}
          </React.Fragment>
        ))}
        <div ref={endRef} />
      </div>

      {firebaseUser ? (
        <div className={styles.inputArea}>
          {replyTo && (
            <div className={styles.replyIndicator}>
              <span>Đang trả lời <strong>{replyToName}</strong></span>
              <button onClick={() => { setReplyTo(null); setReplyToName(''); }}>✕</button>
            </div>
          )}
          <div className={styles.inputRow}>
            <div className={styles.inputAvatar}>
              {getInitials(userProfile?.displayName || 'U')}
            </div>
            <input
              type="text"
              className={styles.input}
              placeholder="Viết bình luận..."
              value={content}
              onChange={e => setContent(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              disabled={sending}
            />
            <button
              className={styles.sendBtn}
              onClick={handleSend}
              disabled={!content.trim() || sending}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      ) : (
        <p className={styles.loginPrompt}>
          <a href="/login">Đăng nhập</a> để tham gia bình luận
        </p>
      )}
    </div>
  );
}
