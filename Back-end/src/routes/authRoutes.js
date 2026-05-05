import express from "express";
import passport from "passport";
import {
  registerRequest,
  verifyRegister,
  loginUser,
  verifyDeviceLogin,
  forgotPassword,
  resetPassword,
  logoutUser,
  createAppeal,
} from "../controllers/authController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { issueAuthToken } from "../services/authService.js";

const router = express.Router();

/* Local Authentication */
router.post("/register-request", registerRequest);
router.post("/register-verify", verifyRegister);
router.post("/login", loginUser);
router.post("/verify-device", verifyDeviceLogin);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/logout", verifyToken, logoutUser);
router.post("/appeal", createAppeal);

/* Google login */
router.get(
  "/google",
  (req, res, next) => {
    const successUrl = req.query.success_url;
    const state = successUrl ? Buffer.from(JSON.stringify({ successUrl })).toString("base64") : undefined;
    passport.authenticate("google", { scope: ["profile", "email"], state })(req, res, next);
  }
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/login" }),
  async (req, res) => {
    try {
      const { token } = await issueAuthToken(req.user._id, "google");
      
      let redirect = process.env.OAUTH_SUCCESS_REDIRECT;
      if (req.query.state) {
        try {
          const stateData = JSON.parse(Buffer.from(req.query.state, "base64").toString("utf8"));
          if (stateData.successUrl) redirect = stateData.successUrl;
        } catch {}
      }

      if (redirect) {
        try {
          const u = new URL(redirect);
          u.searchParams.set("token", token);
          return res.redirect(u.toString());
        } catch {
          /* URL không hợp lệ — trả JSON */
        }
      }
      return res.json({ token, user: req.user });
    } catch (err) {
      console.error("google/callback:", err);
      return res.status(500).json({ message: "Không thể cấp token đăng nhập." });
    }
  }
);

/* Facebook login */
router.get(
  "/facebook",
  (req, res, next) => {
    const successUrl = req.query.success_url;
    const state = successUrl ? Buffer.from(JSON.stringify({ successUrl })).toString("base64") : undefined;
    passport.authenticate("facebook", { scope: ["email"], state })(req, res, next);
  }
);

router.get(
  "/facebook/callback",
  passport.authenticate("facebook", { session: false, failureRedirect: "/login" }),
  async (req, res) => {
    try {
      const { token } = await issueAuthToken(req.user._id, "facebook");
      
      let redirect = process.env.OAUTH_SUCCESS_REDIRECT;
      if (req.query.state) {
        try {
          const stateData = JSON.parse(Buffer.from(req.query.state, "base64").toString("utf8"));
          if (stateData.successUrl) redirect = stateData.successUrl;
        } catch {}
      }

      if (redirect) {
        try {
          const u = new URL(redirect);
          u.searchParams.set("token", token);
          return res.redirect(u.toString());
        } catch {
          /* URL không hợp lệ */
        }
      }
      return res.json({ token, user: req.user });
    } catch (err) {
      console.error("facebook/callback:", err);
      return res.status(500).json({ message: "Không thể cấp token đăng nhập." });
    }
  }
);

export default router;