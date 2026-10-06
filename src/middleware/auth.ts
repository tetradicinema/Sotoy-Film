import type { Request, Response, NextFunction } from 'express';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK
let adminInitialized = false;

function initializeFirebaseAdmin() {
  if (adminInitialized) return;
  
  try {
    // Check if already initialized
    if (getApps().length > 0) {
      adminInitialized = true;
      return;
    }

    // Initialize with application default credentials or service account
    // In production, set GOOGLE_APPLICATION_CREDENTIALS env var
    // For development, this will use Firebase emulator or throw error
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    
    if (serviceAccount) {
      const serviceAccountJson = require(serviceAccount);
      initializeApp({
        credential: cert(serviceAccountJson),
      });
    } else {
      // Try application default credentials
      initializeApp();
    }
    
    adminInitialized = true;
    console.log('[Auth] Firebase Admin SDK initialized');
  } catch (error: any) {
    console.warn('[Auth] Firebase Admin initialization warning:', error.message);
    console.warn('[Auth] API authentication will be disabled. Set FIREBASE_SERVICE_ACCOUNT_PATH or GOOGLE_APPLICATION_CREDENTIALS.');
  }
}

/**
 * Middleware untuk verify Firebase ID token dari client
 * Proteksi API endpoints dari unauthorized access
 */
export async function verifyFirebaseToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Initialize admin if not yet initialized
    initializeFirebaseAdmin();

    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Unauthorized. Token authentication required.',
        code: 'MISSING_AUTH_TOKEN',
      });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];
    if (!idToken) {
      res.status(401).json({
        error: 'Unauthorized. Invalid token format.',
        code: 'INVALID_TOKEN_FORMAT',
      });
      return;
    }

    // Skip verification if admin not initialized (development fallback)
    if (!adminInitialized || getApps().length === 0) {
      console.warn('[Auth] Skipping token verification - Admin SDK not initialized');
      next();
      return;
    }

    // Verify the ID token
    const decodedToken = await getAuth().verifyIdToken(idToken);
    
    // Attach user info to request for downstream handlers
    (req as any).user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
    };

    next();
  } catch (error: any) {
    console.error('[Auth] Token verification failed:', error.message);
    
    if (error.code === 'auth/id-token-expired') {
      res.status(401).json({
        error: 'Token expired. Please sign in again.',
        code: 'TOKEN_EXPIRED',
      });
      return;
    }
    
    if (error.code === 'auth/argument-error') {
      res.status(401).json({
        error: 'Invalid token format.',
        code: 'INVALID_TOKEN',
      });
      return;
    }

    res.status(401).json({
      error: 'Unauthorized. Token verification failed.',
      code: 'TOKEN_VERIFICATION_FAILED',
    });
  }
}

/**
 * Optional auth middleware - tidak throw error jika token missing
 * Tapi verify jika token provided
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No token provided, continue without authentication
    next();
    return;
  }

  // Token provided, verify it
  return verifyFirebaseToken(req, res, next);
}
