import React, { useState, useRef, useEffect } from 'react';
import { 
  Bell, 
  CheckCheck, 
  MessageSquare, 
  Heart, 
  AtSign, 
  PenTool, 
  UserPlus, 
  Award, 
  Trash2, 
  X,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NotificationItem, NotificationType, User } from '../../types';

interface NotificationBellProps {
  mode?: 'global' | 'writer' | 'critic';
  className?: string;
}

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80';

// Helper function to resolve live notification sender info with fallbacks
const resolveSenderInfo = (item: NotificationItem, allUsers: User[]) => {
  // 1. Try to find the live user profile from real-time allUsers
  const liveUser = item.sender?.id ? allUsers.find(u => u.id === item.sender.id) : undefined;

  // 2. Resolve live data first, then fall back to stored item.sender, and finally to safe defaults
  const name = liveUser?.name || item.sender?.name || 'Pengguna';
  const avatar = liveUser?.avatar || item.sender?.avatar || DEFAULT_AVATAR;
  const handle = liveUser?.handle || item.sender?.handle || '';

  return { name, avatar, handle };
};

// Helper function to format notification message with live sender name
const formatNotificationMessage = (item: NotificationItem, liveSenderName: string): string => {
  // System or administrative announcements should display directly
  if (item.type === 'account_status' || item.sender?.id === 'system-admin' || item.sender?.id === 'system') {
    return item.message || '';
  }

  let body = (item.message || '').trim();

  // Backward-compatibility: If this is an existing/old notification in Firestore that had
  // the sender's name (and optional handle in parentheses) baked into the string, strip that prefix.
  const storedName = item.sender?.name?.trim();
  const liveName = liveSenderName?.trim();

  if (storedName) {
    const escapedStored = storedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const legacyRegex = new RegExp(`^${escapedStored}(\\s*\\(@?[^)]+\\))?\\s*`, 'i');
    if (legacyRegex.test(body)) {
      body = body.replace(legacyRegex, '');
    }
  } else if (liveName) {
    const escapedLive = liveName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const legacyRegex = new RegExp(`^${escapedLive}(\\s*\\(@?[^)]+\\))?\\s*`, 'i');
    if (legacyRegex.test(body)) {
      body = body.replace(legacyRegex, '');
    }
  }

  // Prepend the live-resolved sender name before displaying item.message
  return `${liveSenderName} ${body}`.trim();
};

export const NotificationBell: React.FC<NotificationBellProps> = ({ mode = 'global', className = '' }) => {
  const { 
    notifications, 
    unreadNotificationsCount, 
    markNotificationAsRead, 
    markAllNotificationsAsRead, 
    deleteNotification,
    navigateTo,
    allUsers
  } = useApp();

  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter notifications based on mode and active tab
  const filteredNotifications = notifications.filter(n => {
    if (mode === 'writer') {
      const writerTypes: NotificationType[] = ['comment', 'like', 'reaction', 'editor_request'];
      if (!writerTypes.includes(n.type)) return false;
    }
    if (mode === 'critic') {
      const criticTypes: NotificationType[] = ['comment', 'like', 'reaction'];
      if (!criticTypes.includes(n.type)) return false;
    }
    if (activeFilter === 'unread') {
      return !n.isRead;
    }
    return true;
  });

  const unreadCountForMode = notifications.filter(n => {
    if (mode === 'writer') {
      const writerTypes: NotificationType[] = ['comment', 'like', 'reaction', 'editor_request'];
      return !n.isRead && writerTypes.includes(n.type);
    }
    if (mode === 'critic') {
      const criticTypes: NotificationType[] = ['comment', 'like', 'reaction'];
      return !n.isRead && criticTypes.includes(n.type);
    }
    return !n.isRead;
  }).length;

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const getIconForType = (type: NotificationType) => {
    switch (type) {
      case 'comment':
      case 'reply':
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'like':
        return <Heart className="w-4 h-4 text-rose-500 fill-rose-500/20" />;
      case 'reaction':
        return <Sparkles className="w-4 h-4 text-amber-400" />;
      case 'mention':
        return <AtSign className="w-4 h-4 text-purple-500" />;
      case 'editor_request':
        return <PenTool className="w-4 h-4 text-amber-500" />;
      case 'follow':
        return <UserPlus className="w-4 h-4 text-emerald-500" />;
      default:
        return <Award className="w-4 h-4 text-red-500" />;
    }
  };

  const handleNotificationClick = (item: NotificationItem) => {
    if (!item.isRead) {
      markNotificationAsRead(item.id);
    }
    setIsOpen(false);

    if (item.targetView) {
      if (item.targetView === 'article-detail' && item.targetId) {
        navigateTo('article-detail', { articleId: item.targetId });
      } else if (item.targetView === 'writer-dashboard') {
        navigateTo('writer-dashboard');
      } else if (item.targetView === 'user-profile' && item.targetId) {
        navigateTo('user-profile', { userId: item.targetId });
      } else if (item.targetView === 'buzz-detail' && item.targetId) {
        navigateTo('buzz-detail', { buzzId: item.targetId });
      } else {
        navigateTo(item.targetView as any, { articleId: item.targetId, filmId: item.targetId });
      }
    }
  };

  const formatNotificationTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr || 'Baru saja';
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Baru saja';
      if (diffMins < 60) return `${diffMins}m yang lalu`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}j yang lalu`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}h yang lalu`;
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition-all focus:outline-none focus:ring-2 focus:ring-red-500/50"
        title={mode === 'writer' ? 'Notifikasi Penulis' : mode === 'critic' ? 'Notifikasi Kritik' : 'Notifikasi'}
        aria-label="Toggle notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCountForMode > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-lg animate-pulse">
            {unreadCountForMode > 99 ? '99+' : unreadCountForMode}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-md">
          {/* Dropdown Header */}
          <div className="p-3 sm:p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                <Bell className="w-4 h-4 text-red-500" />
                {mode === 'writer' ? 'Alerts Penulis' : mode === 'critic' ? 'Alerts Kritik' : 'Notifikasi'}
              </h3>
              {unreadCountForMode > 0 && (
                <span className="text-xs bg-red-500/10 text-red-400 font-semibold px-2 py-0.5 rounded-full border border-red-500/20">
                  {unreadCountForMode} baru
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCountForMode > 0 && (
                <button
                  onClick={() => markAllNotificationsAsRead()}
                  className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 px-2 py-1 rounded hover:bg-zinc-800 transition"
                  title="Tandai semua dibaca"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Tandai Dibaca</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex border-b border-zinc-800 bg-zinc-950/50 px-3 pt-2 text-xs font-medium">
            <button
              onClick={() => setActiveFilter('all')}
              className={`pb-2 px-3 border-b-2 transition ${
                activeFilter === 'all'
                  ? 'border-red-500 text-white font-semibold'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Semua ({mode === 'writer' ? filteredNotifications.length : notifications.length})
            </button>
            <button
              onClick={() => setActiveFilter('unread')}
              className={`pb-2 px-3 border-b-2 transition ${
                activeFilter === 'unread'
                  ? 'border-red-500 text-white font-semibold'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Belum Dibaca ({unreadCountForMode})
            </button>
          </div>

          {/* Notification List */}
          <div className="max-h-80 sm:max-h-96 overflow-y-auto divide-y divide-zinc-800/60 custom-scrollbar">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs sm:text-sm flex flex-col items-center gap-2">
                <Bell className="w-8 h-8 text-zinc-700 stroke-[1.5]" />
                <p>Belum ada notifikasi {activeFilter === 'unread' ? 'belum dibaca' : ''}.</p>
              </div>
            ) : (
              filteredNotifications.map((item) => {
              const { name: senderName, avatar: senderAvatar, handle: senderHandle } = resolveSenderInfo(item, allUsers);
              const formattedMessage = formatNotificationMessage(item, senderName);

              return (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-3 sm:p-4 flex items-start gap-3 cursor-pointer transition relative group ${
                    item.isRead ? 'bg-transparent hover:bg-zinc-800/40' : 'bg-red-950/10 hover:bg-red-950/20'
                  }`}
                >
                  {/* Sender Avatar or Icon */}
                  <div 
                    className="relative shrink-0"
                    title={senderHandle ? `${senderName} (${senderHandle.startsWith('@') ? senderHandle : `@${senderHandle}`})` : senderName}
                  >
                    <img
                      src={senderAvatar}
                      alt={senderName}
                      className="w-9 h-9 rounded-full object-cover border border-zinc-700"
                    />
                    <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-zinc-900 border border-zinc-800">
                      {getIconForType(item.type)}
                    </div>
                  </div>

                  {/* Notification Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <h4 className="text-xs sm:text-sm font-semibold text-zinc-100 truncate">
                        {item.title}
                      </h4>
                      <span className="text-[10px] text-zinc-500 shrink-0">
                        {formatNotificationTime(item.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed">
                      {formattedMessage}
                    </p>
                  </div>

                  {/* Unread indicator dot & actions */}
                  <div className="flex flex-col items-center justify-between self-stretch shrink-0 gap-1">
                    {!item.isRead && (
                      <span className="w-2 h-2 rounded-full bg-red-500 shadow-sm shadow-red-500/50" />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(item.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-red-400 rounded transition"
                      title="Hapus Notifikasi"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
            )}
          </div>

          {/* Footer */}
          {filteredNotifications.length > 0 && (
            <div className="p-2.5 text-center border-t border-zinc-800 bg-zinc-950/80">
              <button
                onClick={() => {
                  setIsOpen(false);
                  if (mode === 'writer') {
                    navigateTo('writer-dashboard');
                  } else if (mode === 'critic') {
                    navigateTo('critic-dashboard');
                  } else {
                    navigateTo('home');
                  }
                }}
                className="text-xs text-zinc-400 hover:text-white transition flex items-center justify-center gap-1 mx-auto"
              >
                <span>Lihat Dasbor & Aktivitas</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
