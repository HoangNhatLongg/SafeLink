import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { useNotificationStore } from '../stores/notificationStore';

const SOCKET_URL = 'http://localhost:5000';

export function useGlobalSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Chỉ kết nối khi có token
    const token = localStorage.getItem('safelink_token');
    if (!token) return;

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('AdminWeb connected to Socket.IO');
    });

    newSocket.on('newSOS', (data: any) => {
      // Data chứa thông tin người kêu cứu, location, category...
      const authorName = data.author?.name || 'Ai đó';
      const catText = getSOSCategoryText(data.category);
      
      toast.error(`🚨 TÍN HIỆU SOS MỚI!`, {
        description: `${authorName} vừa gửi yêu cầu khẩn cấp: ${catText}. Cần kiểm tra ngay!`,
        duration: 10000,
        position: 'top-center',
        style: {
          backgroundColor: '#ef4444',
          color: 'white',
          border: 'none',
          fontSize: '16px',
        },
      });
      
      // Thêm vào notification store
      useNotificationStore.getState().addNotification({
        authorName,
        category: data.category,
        postId: data.id,
      });
      
      // Có thể dùng Web Audio API để phát âm thanh cảnh báo ngắn ở đây nếu muốn
      try {
        const audio = new Audio('/sos-alert.mp3'); // Nếu có file âm thanh trong public/
        audio.play().catch(e => console.log('Cannot play sound', e));
      } catch (e) {}
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  return socket;
}

function getSOSCategoryText(cat: string) {
  const map: Record<string, string> = {
    fire: 'Cháy nổ',
    landslide: 'Sạt lở',
    traffic: 'Tai nạn giao thông',
    robbery: 'Trộm cướp',
    medical: 'Cấp cứu y tế',
    flood: 'Lụt lội',
    sos_support: 'Đội SOS',
    vehicle_repair: 'Sửa xe',
    other: 'Khác',
  };
  return map[cat] || 'Khác';
}
