import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/jwt";

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const token = authorization.slice("Bearer ".length).trim();

    if (!token) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const payload = verifyToken(token);

    (req as Request & { userId: number }).userId = payload.userId;

    next();
  } catch {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
}