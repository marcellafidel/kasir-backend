import jwt from "jsonwebtoken";
import { env } from "../config/env";

export type JwtPayload = {
  userId: number;
};

export function signToken(userId: number): string {
  return jwt.sign(
    { userId },
    env.JWT_SECRET,
    {
      algorithm: "HS256",
      expiresIn: "7d",
    }
  );
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET, {
    algorithms: ["HS256"],
  });

  if (
    typeof decoded !== "object" ||
    decoded === null ||
    typeof decoded.userId !== "number"
  ) {
    throw new Error("Invalid token payload");
  }

  return {
    userId: decoded.userId,
  };
}