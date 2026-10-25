
import express from "express";
import type { Request, Response } from "express";
import routes from "./routes";
import { errorHandler } from "./middlewares/error.middleware";

const app = express();

app.use(express.json());
app.use("/api/v1", routes);

// Menangani route yang tidak ditemukan
app.use((_req: Request, res: Response): void => {
  res.status(404).json({ message: "Route not found" });
});

// Global error handler
app.use(errorHandler);

export default app;
