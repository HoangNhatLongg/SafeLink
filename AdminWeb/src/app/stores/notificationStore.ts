import { create } from 'zustand';

export interface SOSNotification {
  id: string;
  authorName: string;
  category: string;
  timestamp: string;
  isRead: boolean;
  postId?: string;
}

interface NotificationState {
  notifications: SOSNotification[];
  addNotification: (notif: Omit<SOSNotification, 'id' | 'isRead' | 'timestamp'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  addNotification: (notif) =>
    set((state) => {
      const newNotif: SOSNotification = {
        ...notif,
        id: Math.random().toString(36).substring(2, 9),
        isRead: false,
        timestamp: new Date().toISOString(),
      };
      return { notifications: [newNotif, ...state.notifications] };
    }),
  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
    })),
  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
    })),
  clearAll: () => set({ notifications: [] }),
}));
