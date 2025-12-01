// common/notificationHelper.ts
import * as Notifications from 'expo-notifications';

export const scheduleCartNotification = async (cartId: number, cartName: string, notifyAt: string | Date) => {
  const triggerDate = new Date(notifyAt);
  const now = Date.now();

  // Kiểm tra: Nếu thời gian đã qua thì không hẹn nữa
  if (triggerDate.getTime() <= now) return;

  // Tính số giây từ bây giờ đến lúc đó
  // Math.max để đảm bảo không bị số âm
  const secondsFromNow = Math.max(1, (triggerDate.getTime() - now) / 1000);

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "🛒 Nhắc nhở đi chợ!",
        body: `Đã đến giờ đi mua sắm cho danh sách: "${cartName}"`,
        sound: true,
        data: { cartId: cartId },
      },
      // --- SỬA LẠI CHỖ NÀY ---
      // Thêm 'type: timeInterval' để TypeScript hiểu
      trigger: {
        type: 'timeInterval', 
        seconds: secondsFromNow,
        repeats: false,
      } as any, // Dùng 'as any' để tránh mọi lỗi đỏ về type checker
    });
    
    console.log(`Đã hẹn giờ sau ${Math.round(secondsFromNow)} giây`);
    return id;
  } catch (error) {
    console.error("Lỗi hẹn giờ:", error);
  }
};