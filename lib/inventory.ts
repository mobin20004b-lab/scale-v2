import { prisma } from "@/lib/prisma";

export async function getWarehouseProductBalance(productId: string, warehouseId: string) {
  const entries = await prisma.inventoryLedger.findMany({
    where: { productId, warehouseId },
    select: { type: true, qty: true }
  });

  return entries.reduce((acc, entry) => {
    switch (entry.type) {
      case "STOCK_IN":
      case "STOCK_OUT_UNDO":
        return acc + entry.qty;
      case "STOCK_OUT":
      case "STOCK_IN_UNDO":
        return acc - entry.qty;
      default:
        return acc;
    }
  }, 0);
}
