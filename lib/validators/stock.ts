import { z } from "zod";

export const stockInSchema = z.object({
  productId: z.string().cuid(),
  warehouseId: z.string().cuid(),
  scaleId: z.string().cuid().optional(),
  qty: z.number().positive(),
  weight: z.number().nonnegative(),
  source: z.enum(["SCALE", "MANUAL"]).default("MANUAL")
});

export const stockOutSchema = z.object({
  productId: z.string().cuid(),
  warehouseId: z.string().cuid(),
  qty: z.number().positive(),
  barcode: z.string().min(5)
});
