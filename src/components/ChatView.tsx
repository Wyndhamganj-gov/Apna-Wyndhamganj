import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { Ban, Hash, MessageSquarePlus, Send, Users, X } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  formatRelativeTime,
  VALIDATION,
  type ChatMessage,
  type ChatRoom,
  type UserProfile,
} from '../types/wdm';

interface ChatViewProps {
  profile: UserProfile;
  rooms: ChatRoom[];
  onBlockUser: (userId: string) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({ profile, rooms, onBlockUser }) => {
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [showNewRoom, setShowNewRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedRoomId && rooms.length > 0) {
      setSelectedRoomId(rooms[0].id);
    }
  }, [rooms, selectedRoomId]);

  const activeRoom = useMemo(
    () => rooms.find((r) => r.id === selectedRoomId) || rooms[0] || null,
    [rooms, selectedRoomId]
  );

  useEffect(() => {
    if (!activeRoom) {
      setMessages([]);
      return;
    }

    const msgRef = collection(db, 'chats', activeRoom.id, 'messages');
    const q =
      activeRoom.visibility === 'public'
        ? query(
            msgRef,
            where('roomId', '==', activeRoom.id),
            where('roomVisibility', '==', 'public')
          )
        : query(
            msgRef,
            where('roomId', '==', activeRoom.id),
            where('roomParticipants', 'array-contains', profile.uid)
          );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => d.data() as ChatMessage)
          .sort((a, b) => (a.createdAt?.toMillis?.() ?? Date.now()) - (b.createdAt?.toMillis?.() ?? Date.now()));
        setMessages(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `chats/${activeRoom.id}/messages`);
      }
    );

    return () => unsub();
  }, [activeRoom, profile.uid]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const blockedSet = useMemo(() => new Set(profile.blockedUserIds || []), [profile.blockedUserIds]);

  const visibleMessages = useMemo(
    () => messages.filter((m) => !blockedSet.has(m.senderId)),
    [messages, blockedSet]
  );

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoom) return;
    const text = draft.trim().slice(0, VALIDATION.CHAT_TEXT_MAX);
    if (!text || sending) return;

    setSending(true);
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'chats', activeRoom.id, 'messages', msgId), {
        id: msgId,
        roomId: activeRoom.id,
        senderId: profile.uid,
        senderName: profile.name.slice(0, VALIDATION.NAME_MAX),
        senderArea: profile.area.slice(0, VALIDATION.AREA_MAX),
        text,
        roomVisibility: activeRoom.visibility,
        roomParticipants: activeRoom.participantIds || [],
        createdAt: serverTimestamp(),
      });
      batch.update(doc(db, 'chats', activeRoom.id), {
        lastMessage: text.slice(0, 220),
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
      setDraft('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `chats/${activeRoom.id}/messages/${msgId}`);
    } finally {
      setSending(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newRoomName.trim().slice(0, 80);
    if (cleanName.length < 2) return;
    const roomId = `room_${Date.now()}`;
    try {
      await setDoc(doc(db, 'chats', roomId), {
        id: roomId,
        name: cleanName,
        description: newRoomDesc.trim().slice(0, 200) || 'Wyndhamganj community room',
        type: 'public',
        participantIds: [],
        visibility: 'public',
        lastMessage: `${profile.name} created this room`,
        createdBy: profile.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setNewRoomName('');
      setNewRoomDesc('');
      setShowNewRoom(false);
      setSelectedRoomId(roomId);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `chats/${roomId}`);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Wyndhamganj Chat
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Live local community rooms across Wyndhamganj, Sonbhadra
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNewRoom(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold min-h-[40px] whitespace-nowrap cursor-pointer"
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span>New Room</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Room Selector Sidebar / Horizontal Strip on Mobile */}
        <aside className="lg:col-span-4 bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-3 space-y-2">
          <p className="px-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            Community Channels ({rooms.length})
          </p>
          <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible no-scrollbar">
            {rooms.map((room) => {
              const isSelected = activeRoom?.id === room.id;
              return (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => setSelectedRoomId(room.id)}
                  className={`text-left p-3 rounded-xl border transition-colors min-w-[210px] lg:min-w-0 cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--accent-soft)] border-[var(--accent)]/40'
                      : 'bg-slate-50/70 dark:bg-slate-900/40 border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-[var(--accent)] shrink-0" />
                    <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {room.name}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                    {room.lastMessage || room.description}
                  </p>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Active Chat Message Feed */}
        <section className="lg:col-span-8 bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-700/80 rounded-2xl flex flex-col h-[520px] sm:h-[580px] overflow-hidden">
          {activeRoom ? (
            <>
              {/* Room Header */}
              <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700/80 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                    {activeRoom.name}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {activeRoom.description || 'Verified Wyndhamganj citizens chat'}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 shrink-0">
                  <Users className="w-3.5 h-3.5" />
                  <span>Public</span>
                </span>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-slate-50/50 dark:bg-slate-900/40">
                {visibleMessages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500 dark:text-slate-400">
                    No messages yet. Say namaste to Wyndhamganj!
                  </div>
                ) : (
                  visibleMessages.map((msg) => {
                    const isMine = msg.senderId === profile.uid;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mb-1 px-1">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {isMine ? 'You' : msg.senderName}
                          </span>
                          {msg.senderArea && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{msg.senderArea}</span>
                            </>
                          )}
                          <span aria-hidden="true">·</span>
                          <span>{formatRelativeTime(msg.createdAt)}</span>
                          {!isMine && (
                            <button
                              type="button"
                              onClick={() => onBlockUser(msg.senderId)}
                              title="Mute / Block this user"
                              className="ml-1 text-slate-400 hover:text-red-500 cursor-pointer"
                            >
                              <Ban className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <div
                          className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                            isMine
                              ? 'bg-[var(--accent)] text-white rounded-br-md'
                              : 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700 rounded-bl-md'
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {/* Message Composer */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-700/80 flex items-center gap-2 bg-white dark:bg-[#1E293B]"
              >
                <input
                  type="text"
                  maxLength={VALIDATION.CHAT_TEXT_MAX}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={`Message #${activeRoom.name}...`}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] min-h-[44px]"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || sending}
                  aria-label="Send message"
                  className="w-11 h-11 rounded-xl bg-[var(--accent)] text-white flex items-center justify-center shrink-0 hover:opacity-95 disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-slate-500">
              Select a Wyndhamganj chat room to start messaging.
            </div>
          )}
        </section>
      </div>

      {/* Create Room Modal */}
      {showNewRoom && (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowNewRoom(false)}
        >
          <div
            className="w-full sm:max-w-md bg-white dark:bg-[#1E293B] rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-700 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Create Community Room
              </h2>
              <button
                type="button"
                onClick={() => setShowNewRoom(false)}
                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateRoom} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Room Name *
                </label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="e.g., Wyndhamganj Cricket Fans"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Topic Description
                </label>
                <input
                  type="text"
                  maxLength={200}
                  value={newRoomDesc}
                  onChange={(e) => setNewRoomDesc(e.target.value)}
                  placeholder="Local match scores, schedules, and discussion"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                />
              </div>
              <button
                type="submit"
                className="w-full min-h-[46px] rounded-xl bg-[var(--accent)] text-white text-sm font-semibold cursor-pointer"
              >
                Create Public Room
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
