import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { GHARSIP_SYSTEM_PROMPT } from "@/lib/gharsipSystemPrompt";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SAVE_BOOKING_TOOL: Anthropic.Tool = {
  name: "save_booking",
  description:
    "Save a confirmed saree/blouse service booking. Call ONLY when the customer has confirmed all details and you have: customerName, customerPhone, address, service, pickupDate, and amount.",
  input_schema: {
    type: "object" as const,
    properties: {
      customerName: { type: "string", description: "Customer full name" },
      customerPhone: { type: "string", description: "10-digit phone number" },
      address: { type: "string", description: "Home pickup address" },
      service: { type: "string", description: "Service(s) requested" },
      pickupDate: { type: "string", description: "Preferred pickup date" },
      amount: { type: "number", description: "Total amount in INR" },
    },
    required: ["customerName", "customerPhone", "address", "service", "pickupDate", "amount"],
  },
};

type Message = { role: "user" | "assistant"; content: string };

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  const { messages } = (await req.json()) as { messages: Message[] };
  if (!messages?.length) {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
  }

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: GHARSIP_SYSTEM_PROMPT,
    tools: [SAVE_BOOKING_TOOL],
    messages,
  });

  const toolUseBlock = response.content.find((b) => b.type === "tool_use");

  if (toolUseBlock && toolUseBlock.type === "tool_use" && toolUseBlock.name === "save_booking") {
    const input = toolUseBlock.input as Record<string, unknown>;

    let bookingId: string | null = null;
    const base = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "");
    if (base) {
      try {
        const br = await fetch(`${base}/api/bookings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        if (br.ok) {
          const bj = (await br.json()) as { id: string };
          bookingId = bj.id;
        }
      } catch {
        // backend unreachable — booking will not persist but conversation continues
      }
    }

    const follow = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: GHARSIP_SYSTEM_PROMPT,
      tools: [SAVE_BOOKING_TOOL],
      messages: [
        ...messages,
        { role: "assistant" as const, content: response.content },
        {
          role: "user" as const,
          content: [
            {
              type: "tool_result" as const,
              tool_use_id: toolUseBlock.id,
              content: JSON.stringify({ success: true, bookingId }),
            },
          ],
        },
      ],
    });

    const reply =
      follow.content.find((b) => b.type === "text")?.text ??
      "Booking confirmed! Our team will WhatsApp you before pickup.";

    return NextResponse.json({ reply, bookingSaved: true, bookingId });
  }

  const reply = response.content.find((b) => b.type === "text")?.text ?? "";
  return NextResponse.json({ reply });
}
