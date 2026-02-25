import { NextResponse } from "next/server";
import { readSettings } from "@/lib/settings";

export async function GET() {
  return NextResponse.json(await readSettings());
}
