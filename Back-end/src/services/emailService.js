import nodemailer from "nodemailer";

// IMPORTANT: Do NOT create transporter at module load time.
// In ES Modules, imports run before dotenv.config(), so process.env vars are undefined.
// Instead, create transporter lazily inside each function.

const createTransporter = () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    throw new Error(`EMAIL_USER hoặc EMAIL_PASS chưa được cấu hình trong .env (user=${user})`);
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass }
  });
};

/**
 * Send an OTP code email
 * @param {string} email
 * @param {string} code
 * @param {string} action
 */
export const sendOtpEmail = async (email, code, action) => {
  let subject = "SafeLink OTP Code";
  let text = `Mã OTP của bạn là: ${code}. Mã có hiệu lực trong 15 phút.`;

  if (action === "REGISTER") {
    subject = "SafeLink - Mã xác thực đăng ký";
    text = `Chào mừng đến với SafeLink!\nMã OTP đăng ký của bạn là: ${code}\nMã có hiệu lực trong 15 phút.`;
  } else if (action === "NEW_DEVICE") {
    subject = "SafeLink - Phát hiện đăng nhập thiết bị mới";
    text = `Chúng tôi phát hiện đăng nhập từ thiết bị mới.\nMã OTP xác thực thiết bị: ${code}\nMã có hiệu lực trong 15 phút.\nNếu không phải bạn, hãy đổi mật khẩu ngay.`;
  } else if (action === "RESET_PASSWORD") {
    subject = "SafeLink - Đặt lại mật khẩu";
    text = `Bạn đã yêu cầu đặt lại mật khẩu.\nMã OTP của bạn là: ${code}\nMã có hiệu lực trong 15 phút.`;
  }

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"SafeLink Security" <${process.env.EMAIL_USER}>`,
      to: email,
      subject,
      text
    });
    console.log(`✅ OTP email sent to ${email} [${action}]`);
  } catch (error) {
    console.error("❌ Error sending OTP email: ", error.message);
    throw error;
  }
};

/**
 * Send a notification for account lock
 * @param {string} email
 */
export const sendLockNotification = async (email) => {
  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"SafeLink Security" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "SafeLink - Cảnh báo bảo mật: Tài khoản bị khóa",
      text: "Chúng tôi phát hiện 5 lần đăng nhập sai liên tiếp vào tài khoản của bạn.\nTài khoản đã bị khóa 10 phút để bảo vệ bạn.\nNếu không phải bạn thực hiện, hãy đặt lại mật khẩu ngay lập tức."
    });
    console.log(`✅ Lock notification sent to ${email}`);
  } catch (error) {
    console.error("❌ Error sending lock notification: ", error.message);
    throw error;
  }
};
