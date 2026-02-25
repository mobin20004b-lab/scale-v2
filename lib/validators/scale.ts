import { z } from "zod";

export const scaleCreateSchema = z.object({
  name: z.string().min(2),
  serialNumber: z.string().min(3),
  model: z.string().optional(),
  warehouseId: z.string().cuid().optional(),
  unit: z.enum(["kg", "g", "lb"]).default("kg"),
  precision: z.number().int().min(0).max(4).default(2),
  heartbeatSec: z.number().int().min(5).max(300).default(15),
  printerType: z.enum(["TSPL", "ESC_POS"]).default("TSPL")
});

export const telemetrySchema = z.object({
  weight: z.number(),
  isStable: z.boolean(),
  uptimeSec: z.number().int().nonnegative(),
  model: z.string().optional(),
  firmwareVersion: z.string().optional(),
  ipAddress: z.string().optional()
});
