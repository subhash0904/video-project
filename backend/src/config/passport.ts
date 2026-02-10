import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { prisma } from './db.js';
import config from './env.js';

// ============================================
// Google OAuth Strategy
// ============================================

passport.use(
  new GoogleStrategy(
    {
      clientID: config.googleClientId,
      clientSecret: config.googleClientSecret,
      callbackURL: config.googleCallbackUrl,
      scope: ['profile', 'email'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        
        if (!email) {
          return done(new Error('No email found in Google profile'), undefined);
        }

        // Check if user already exists
        let user = await prisma.user.findUnique({
          where: { email },
          include: { channel: true },
        });

        if (user) {
          // Update Google ID if not set
          if (!user.googleId) {
            user = await prisma.user.update({
              where: { id: user.id },
              data: { googleId: profile.id },
              include: { channel: true },
            });
          }
          return done(null, user as any as Express.User);
        }

        // Create new user
        const displayName = profile.displayName || email.split('@')[0];
        const username = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_') + Math.floor(Math.random() * 1000);
        const placeholderPassword = 'OAUTH_USER_NO_PASSWORD_' + Math.random().toString(36);

        user = await prisma.$transaction(async (tx: any) => {
          const newUser = await tx.user.create({
            data: {
              email,
              username,
              displayName,
              googleId: profile.id,
              emailVerified: true, // Email verified by Google
              avatarUrl: profile.photos?.[0]?.value || 
                `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&size=200&background=random`,
              passwordHash: placeholderPassword, // Placeholder for OAuth users
            },
            include: { channel: true },
          });

          // Create channel if it doesn't exist
          if (!newUser.channel) {
            await tx.channel.create({
              data: {
                userId: newUser.id,
                handle: `@${username}`,
                name: displayName,
                avatarUrl: newUser.avatarUrl,
              },
            });
          }

          return newUser;
        });

        return done(null, user as any as Express.User);
      } catch (error) {
        return done(error as Error, undefined);
      }
    }
  )
);

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { channel: true },
    });
    done(null, user as any as Express.User);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
