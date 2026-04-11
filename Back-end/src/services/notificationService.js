/**
 * Expo Push Notification Service
 * Gửi push notification đến thiết bị qua Expo Push API (miễn phí)
 * Docs: https://docs.expo.dev/push-notifications/sending-notifications/
 */

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/**
 * Gửi thông báo đến 1 hoặc nhiều tokens
 * @param {string|string[]} tokens - Expo Push Token(s)
 * @param {object} payload - { title, body, data, sound, badge }
 */
export async function sendPushNotification(tokens, payload) {
  const tokenList = Array.isArray(tokens) ? tokens : [tokens];

  // Lọc token hợp lệ (bắt đầu bằng ExponentPushToken hoặc ExpoPushToken)
  const validTokens = tokenList.filter(
    (t) => t && (t.startsWith("ExponentPushToken") || t.startsWith("ExpoPushToken"))
  );

  if (validTokens.length === 0) return { sent: 0, errors: [] };

  // Batch tối đa 100 notifications/request (Expo limit)
  const batches = [];
  for (let i = 0; i < validTokens.length; i += 100) {
    batches.push(validTokens.slice(i, i + 100));
  }

  const results = { sent: 0, errors: [] };

  for (const batch of batches) {
    const messages = batch.map((token) => ({
      to: token,
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
      sound: payload.sound || "default",
      badge: payload.badge || 1,
      priority: payload.priority || "high",
      channelId: payload.channelId || "default",
    }));

    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(messages),
      });

      const json = await response.json();

      if (json.data) {
        json.data.forEach((ticket, idx) => {
          if (ticket.status === "ok") {
            results.sent++;
          } else {
            results.errors.push({ token: batch[idx], error: ticket.message });
            console.warn("❌ Push failed:", batch[idx], ticket.message);
          }
        });
      }
    } catch (err) {
      console.error("❌ Push notification batch error:", err.message);
      results.errors.push({ batch: batch.length, error: err.message });
    }
  }

  console.log(`📲 Push sent: ${results.sent}/${validTokens.length}`);
  return results;
}

/**
 * Gửi thông báo SOS khẩn cấp
 */
export async function sendSOSNotification(tokens, sosData) {
  const { category, location, authorName, postId } = sosData;

  const categoryLabel = {
    fire:      "🔥 Hỏa hoạn",
    landslide: "⛰️ Sạt lở",
    traffic:   "🚗 Tai nạn giao thông",
    robbery:   "🚨 Cướp giật",
    medical:   "🏥 Cấp cứu y tế",
    flood:     "🌊 Lũ lụt",
    other:     "⚠️ Khẩn cấp",
  }[category] || "⚠️ Tín hiệu SOS";

  return sendPushNotification(tokens, {
    title: `🆘 ${categoryLabel} GẦN BẠN!`,
    body: `${authorName} báo cáo sự cố tại ${location?.address || "vị trí gần bạn"}. Hãy cẩn thận!`,
    data: {
      type: "sos_alert",
      postId,
      category,
      latitude:  location?.latitude,
      longitude: location?.longitude,
    },
    sound: "default",
    priority: "high",
    channelId: "sos",      // Android notification channel
  });
}

/**
 * Gửi thông báo cho admin/moderator
 */
export async function sendSOSAdminNotification(adminTokens, sosData) {
  const { category, authorName, postId } = sosData;

  const categoryLabel = {
    fire:      "🔥 Hỏa hoạn",
    landslide: "⛰️ Sạt lở",
    traffic:   "🚗 Tai nạn giao thông",
    robbery:   "🚨 Cướp giật",
    medical:   "🏥 Cấp cứu y tế",
    flood:     "🌊 Lũ lụt",
    other:     "⚠️ Khẩn cấp",
  }[category] || "⚠️ SOS";

  return sendPushNotification(adminTokens, {
    title: `[ADMIN] SOS mới: ${categoryLabel}`,
    body: `${authorName} vừa gửi tín hiệu SOS. Cần kiểm duyệt.`,
    data: {
      type: "sos_admin",
      postId,
      category,
    },
    sound: "default",
    priority: "high",
    channelId: "sos",
  });
}
