import * as authService from "../services/authService.js";

export const registerRequest = async (req, res) => {
  try {
    const { email } = req.body;
    const result = await authService.registerRequest(email);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const verifyRegister = async (req, res) => {
  try {
    const { email, password, otpCode, name } = req.body;
    const user = await authService.verifyRegister(email, password, otpCode, name);
    res.status(201).json({
      message: "User registered successfully",
      userId: user._id
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const deviceId = req.headers["x-device-id"] || req.body.deviceId;
    
    const data = await authService.login(email, password, deviceId);
    if (data.requireOtp) {
      return res.status(403).json(data); // 403 Forbidden until OTP is provided
    }
    
    res.json({
      token: data.token,
      user: {
        id: data.user._id,
        email: data.user.email,
        authType: data.user.authType,
        name: data.user.name,
        role: data.user.role
      }
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const verifyDeviceLogin = async (req, res) => {
  try {
    const { email, otpCode } = req.body;
    const deviceId = req.headers["x-device-id"] || req.body.deviceId;

    const data = await authService.verifyDeviceLogin(email, otpCode, deviceId);
    
    res.json({
      token: data.token,
      user: {
        id: data.user._id,
        email: data.user.email,
        authType: data.user.authType,
        name: data.user.name,
        role: data.user.role
      }
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const result = await authService.forgotPassword(email);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, otpCode, newPassword } = req.body;
    const result = await authService.resetPassword(email, otpCode, newPassword);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const logoutUser = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
    if (!token) {
      return res.status(400).json({ message: "Không tìm thấy token." });
    }
    await authService.logout(token);
    return res.json({ message: "Đã đăng xuất." });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};