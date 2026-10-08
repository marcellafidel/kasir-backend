import type { Request, Response } from "express";
import { AppError } from "../lib/errors";
import { placeOrder } from "../lib/checkout";
import { findOrder, listOrders } from "../lib/order-queries";
import { toOrderResponse } from "../lib/order";
import { parseOrderRef, validateOrderListQuery } from "../validators/order-query.validator";
import { validateOrderCreate } from "../validators/order.validator";

export async function createOrder(req: Request, res: Response): Promise<void> {
  try {
    // storeId berasal dari JWT -> user -> store (diisi oleh loadStore), bukan dari body
    const storeId = (req as Request & { storeId: number }).storeId;

    if (typeof storeId !== "number") {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const result = validateOrderCreate(req.body);
    if (!result.ok) {
      res.status(400).json({ message: "Validation failed", errors: result.errors });
      return;
    }

    const order = await placeOrder(storeId, result.data);
    res.status(201).json({ message: "Transaction created", order: toOrderResponse(order) });
  } catch (error) {
    // Error bisnis yang sengaja dilempar (stok kurang, produk tidak ditemukan, dll.)
    if (error instanceof AppError) {
      res.status(error.status).json(error.body);
      return;
    }

    // Error tak terduga: detail hanya ke log server, client dapat pesan umum
    console.error("Failed to create order:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// BARU (Fase 2): riwayat transaksi, terbaru dulu
export async function getOrderHistory(req: Request, res: Response): Promise<void> {
  try {
    const storeId = (req as Request & { storeId: number }).storeId;

    if (typeof storeId !== "number") {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const result = validateOrderListQuery(req.query);
    if (!result.ok) {
      res.status(400).json({ message: "Validation failed", errors: result.errors });
      return;
    }

    const { page, limit } = result.data;
    const { orders, total } = await listOrders(storeId, page, limit);

    res.json({
      orders: orders.map(toOrderResponse),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Failed to list orders:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// BARU (Fase 2): detail satu transaksi berdasarkan id atau transactionNumber
export async function getOrderDetail(req: Request, res: Response): Promise<void> {
  try {
    const storeId = (req as Request & { storeId: number }).storeId;

    if (typeof storeId !== "number") {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const ref = parseOrderRef(req.params.idOrNumber);
    if (!ref) {
      res.status(400).json({
        message: "Validation failed",
        errors: {
          idOrNumber: "Must be an order id or a transaction number (TRX-YYYYMMDD-XXXXXXXX)",
        },
      });
      return;
    }

    const order = await findOrder(storeId, ref);
    if (!order) {
      res.status(404).json({ message: "Order not found" });
      return;
    }

    res.json({ order: toOrderResponse(order) });
  } catch (error) {
    console.error("Failed to get order:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}