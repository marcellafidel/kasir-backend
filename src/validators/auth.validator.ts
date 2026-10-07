export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  storeName: string;
  businessType: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export function validateRegister(body: unknown): RegisterInput {
  if (!body || typeof body !== "object") {
    throw new Error("Request body is required");
  }

  const data = body as Record<string, unknown>;

  const name = typeof data.name === "string" ? data.name.trim() : "";
  const email =
    typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
  const password = typeof data.password === "string" ? data.password : "";
  const storeName =
    typeof data.storeName === "string" ? data.storeName.trim() : "";
  const businessType =
    typeof data.businessType === "string" ? data.businessType.trim() : "";

  if (!name) throw new Error("Name is required");
  if (!email || !email.includes("@")) {
    throw new Error("Valid email is required");
  }
  if (password.length < 8 || password.length > 72) {
    throw new Error("Password must be 8-72 characters");
  }
  if (!storeName) throw new Error("Store name is required");
  if (!businessType) throw new Error("Business type is required");

  return {
    name,
    email,
    password,
    storeName,
    businessType,
  };
}

export function validateLogin(body: unknown): LoginInput {
  if (!body || typeof body !== "object") {
    throw new Error("Request body is required");
  }

  const data = body as Record<string, unknown>;

  const email =
    typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
  const password = typeof data.password === "string" ? data.password : "";

  if (!email || !email.includes("@")) {
    throw new Error("Valid email is required");
  }

  if (!password) {
    throw new Error("Password is required");
  }

  return {
    email,
    password,
  };
}