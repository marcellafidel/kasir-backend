import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma";
import { signToken } from "../lib/jwt";
import {
  validateLogin,
  validateRegister,
} from "../validators/auth.validator";

export async function register(req: any, res: any) {
  try {
    const input = validateRegister(req.body);

    const existingUser = await prisma.user.findUnique({
      where: {
        email: input.email,
      },
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(input.password, 12);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: input.name,
          email: input.email,
          password: hashedPassword,
        },
      });

      const store = await tx.store.create({
        data: {
          userId: user.id,
          name: input.storeName,
          businessType: input.businessType,
        },
      });

      return { user, store };
    });

    const token = signToken(result.user.id);

    return res.status(201).json({
      message: "Registration successful",
      token,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
      },
      store: {
        id: result.store.id,
        name: result.store.name,
        businessType: result.store.businessType,
      },
    });
  } catch (error) {
    return res.status(400).json({
      message: error instanceof Error ? error.message : "Registration failed",
    });
  }
}

export async function login(req: any, res: any) {
  try {
    const input = validateLogin(req.body);

    const user = await prisma.user.findUnique({
      where: {
        email: input.email,
      },
      include: {
        store: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const passwordMatch = await bcrypt.compare(
      input.password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    if (!user.store || user.store.isArchived) {
      return res.status(403).json({
        message: "Business is not available",
      });
    }

    const token = signToken(user.id);

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      store: {
        id: user.store.id,
        name: user.store.name,
        businessType: user.store.businessType,
      },
    });
  } catch (error) {
    return res.status(400).json({
      message: error instanceof Error ? error.message : "Login failed",
    });
  }
}

export async function me(req: any, res: any) {
  try {
    const userId = req.userId as number;

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        store: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      store: user.store
        ? {
            id: user.store.id,
            name: user.store.name,
            businessType: user.store.businessType,
            address: user.store.address,
            phone: user.store.phone,
            logoUrl: user.store.logoUrl,
            isArchived: user.store.isArchived,
          }
        : null,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to get profile",
    });
  }
}