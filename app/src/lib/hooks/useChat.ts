'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Message, Conversation } from '@/types';
import {
  subscribeToMessages,
  subscribeToConversations,
  sendMessage as sendChatMessage,
  getOrCreateConversation,
} from '@/lib/firebase/firestore';

export function useConversations(userId: string | undefined) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset state when no userId
      setConversations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = subscribeToConversations(userId, (convs) => {
      setConversations(convs);
      setLoading(false);
    });

    return unsub;
  }, [userId]);

  return { conversations, loading };
}

export function useMessages(conversationId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!conversationId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset state when no conversationId
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = subscribeToMessages(conversationId, (msgs) => {
      setMessages(msgs);
      setLoading(false);
    });

    return unsub;
  }, [conversationId]);

  return { messages, loading };
}

export function useSendMessage(conversationId: string | undefined) {
  const [sending, setSending] = useState(false);

  const send = useCallback(async (
    senderId: string,
    content: string,
    type: 'text' | 'file' | 'image' = 'text',
    fileData?: { fileURL: string; fileName: string }
  ) => {
    if (!conversationId || !content.trim()) return;
    setSending(true);
    try {
      await sendChatMessage(conversationId, senderId, content, type, fileData);
    } finally {
      setSending(false);
    }
  }, [conversationId]);

  return { send, sending };
}

export function useInitConversation() {
  const [loading, setLoading] = useState(false);

  const initConversation = useCallback(async (participants: string[], jobId: string) => {
    setLoading(true);
    try {
      const convId = await getOrCreateConversation(participants, jobId);
      return convId;
    } finally {
      setLoading(false);
    }
  }, []);

  return { initConversation, loading };
}
