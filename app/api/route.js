import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ message: "Quotation Maker API is running." });
}
