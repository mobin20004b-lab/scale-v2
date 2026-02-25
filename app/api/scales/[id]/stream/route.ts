import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = async () => {
        const scale = await prisma.scale.findUnique({ where: { id: params.id } });
        controller.enqueue(
          encoder.encode(`event: telemetry\ndata: ${JSON.stringify({
            weight: scale?.lastWeight,
            stable: scale?.isStable,
            lastSeenAt: scale?.lastSeenAt
          })}\n\n`)
        );
      };

      await send();
      const interval = setInterval(send, 3000);
      setTimeout(() => {
        clearInterval(interval);
        controller.close();
      }, 30000);
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
