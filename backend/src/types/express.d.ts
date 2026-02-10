// Type definitions for Express with Passport
import 'express';

declare global {
  namespace Express {
    interface User {
      id: string;
      userId: string;
      email: string;
      username: string;
      displayName: string | null;
      avatarUrl: string | null;
      googleId: string | null;
      twoFactorEnabled: boolean;
      twoFactorSecret: string | null;
      backupCodes: string | null;
      channel: {
        id: string;
        name: string;
        handle: string;
        avatarUrl: string | null;
        bannerUrl: string | null;
        description: string | null;
        subscriberCount: number;
        videoCount: number;
        totalViews: bigint;
        verified: boolean;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
      } | null;
      createdAt: Date;
      updatedAt: Date;
    }
  }
}
