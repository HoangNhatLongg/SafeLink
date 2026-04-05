import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import User from "../models/userModel.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || "dummy-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "dummy-client-secret",
      callbackURL: "/api/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
        
        // Find existing user by googleId
        let user = await User.findOne({ googleId: profile.id });
        if (user) {
          return done(null, user);
        }

        // If not found, check if a user with this email exists for local
        if (email) {
          user = await User.findOne({ email });
          if (user) {
            // Link google Id to existing account
            user.googleId = profile.id;
            // Depending on policy, we might not change authType to google if it was local
            await user.save();
            return done(null, user);
          }
        }

        const displayName =
          profile.displayName ||
          [profile.name?.givenName, profile.name?.familyName].filter(Boolean).join(" ") ||
          undefined;

        user = await User.create({
          email: email || `${profile.id}@google.com`,
          name: displayName,
          googleId: profile.id,
          authType: "google",
          devices: [
            {
              deviceId: "google-oauth-" + profile.id,
              isTrusted: true,
              lastLogin: new Date(),
            },
          ],
        });

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_CLIENT_ID || "dummy-client-id",
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET || "dummy-client-secret",
      callbackURL: "/api/auth/facebook/callback",
      profileFields: ["id", "emails", "name"]
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;

        let user = await User.findOne({ facebookId: profile.id });
        if (user) return done(null, user);

        if (email) {
          user = await User.findOne({ email });
          if (user) {
            user.facebookId = profile.id;
            await user.save();
            return done(null, user);
          }
        }

        const fbName = profile.displayName || [profile.name?.givenName, profile.name?.familyName].filter(Boolean).join(" ") || undefined;

        user = await User.create({
          email: email || `${profile.id}@facebook.com`,
          name: fbName,
          facebookId: profile.id,
          authType: "facebook",
          devices: [
            {
              deviceId: "facebook-oauth-" + profile.id,
              isTrusted: true,
              lastLogin: new Date(),
            },
          ],
        });

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

export default passport;
