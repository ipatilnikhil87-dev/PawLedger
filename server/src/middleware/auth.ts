import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'pawledger_dev_jwt_secret_99482';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'pawledger_dev_refresh_secret_84920';

export interface AuthenticatedUser {
  id: string;
  phone?: string;
  email?: string;
  role: string;
  name?: string;
  city?: string;
  photoUrl?: string;
  firebaseUid?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  sessionId?: string;
}

export function generateTokens(user: AuthenticatedUser, sessionId: string) {
  const accessToken = jwt.sign(
    {
      userId: user.id,
      phone: user.phone || '',
      email: user.email || '',
      role: user.role,
      sessionId,
    },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { userId: user.id, sessionId },
    JWT_REFRESH_SECRET,
    { expiresIn: '30d' }
  );

  return { accessToken, refreshToken };
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing or malformed authorization token.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const session = db.get('sessions').find(s => s.id === decoded.sessionId && s.isValid);

    if (!session) {
      res.status(401).json({ error: 'Unauthorized: Session has expired or been revoked.' });
      return;
    }

    const user = db.get('users').find(u => u.id === decoded.userId);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized: User account not found.' });
      return;
    }

    req.user = {
      id: user.id,
      phone: user.phone || '',
      email: user.email || '',
      role: user.role,
      name: user.name,
      city: user.city,
      photoUrl: user.photoUrl || '',
      firebaseUid: user.firebaseUid || '',
    };
    req.sessionId = session.id;

    next();
  } catch (err: any) {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token.' });
    return;
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden: Insufficient privileges.' });
      return;
    }
    next();
  };
}
