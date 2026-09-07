import { authorize, corsHeaders, json } from "@/lib/central-api";
import { readLibrary, subscribeLibrary } from "@/lib/central-db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export function GET(request: Request) {
  if (!authorize(request)) {
    return json(request, { error: "รหัสคลังกลางไม่ถูกต้อง" }, 401);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };
      send(readLibrary());
      const unsubscribe = subscribeLibrary(send);
      const ping = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(ping);
        }
      }, 20_000);
      const close = () => {
        unsubscribe();
        clearInterval(ping);
        try {
          controller.close();
        } catch {
          // already closed
        }
      };
      request.signal.addEventListener("abort", close);
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders(request),
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
