import { z } from "zod";

export const productCreateSchema = z.object({
  sku: z.string().min(2),
  nameFa: z.string().min(2),
  nameEn: z.string().optional(),
  descriptionFa: z.string().optional(),
  descriptionEn: z.string().optional(),
  category: z.string().min(2),
  unit: z.string().min(1),
  barcode: z.string().min(5),
  qrCode: z.string().min(5)
});

export const productPatchSchema = productCreateSchema.partial().refine((v) => Object.keys(v).length > 0, "حداقل یک فیلد لازم است");

export const productBatchSchema = z.object({
  items: z.array(productCreateSchema).min(1).max(200)
});
