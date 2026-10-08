export const orderSelect = {
  id: true,
  transactionNumber: true,
  customerName: true,
  totalAmount: true,
  paymentMethod: true,
  paymentAmount: true,
  changeAmount: true,
  status: true,
  note: true,
  createdAt: true,
  items: {
    select: {
      id: true,
      productId: true,
      productName: true,
      unit: true,
      quantity: true,
      unitPrice: true,
      subtotal: true,
      note: true,
    },
    orderBy: { id: "asc" },
  },
} as const;

type DecimalLike = { toFixed(decimalPlaces: number): string };

type OrderItemRow = {
  id: number;
  productId: number;
  productName: string;
  unit: string;
  quantity: DecimalLike;
  unitPrice: DecimalLike;
  subtotal: DecimalLike;
  note: string | null;
};

type OrderRow = {
  id: number;
  transactionNumber: string;
  customerName: string | null;
  totalAmount: DecimalLike;
  paymentMethod: string;
  paymentAmount: DecimalLike;
  changeAmount: DecimalLike;
  status: string;
  note: string | null;
  createdAt: Date;
  items: OrderItemRow[];
};

// Uang dikirim sebagai string 2 desimal ("37500.00"), quantity 3 desimal ("2.500")
export function toOrderResponse(order: OrderRow) {
  return {
    id: order.id,
    transactionNumber: order.transactionNumber,
    customerName: order.customerName,
    totalAmount: order.totalAmount.toFixed(2),
    paymentMethod: order.paymentMethod,
    paymentAmount: order.paymentAmount.toFixed(2),
    changeAmount: order.changeAmount.toFixed(2),
    status: order.status,
    note: order.note,
    createdAt: order.createdAt,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      unit: item.unit,
      quantity: item.quantity.toFixed(3),
      unitPrice: item.unitPrice.toFixed(2),
      subtotal: item.subtotal.toFixed(2),
      note: item.note,
    })),
  };
}