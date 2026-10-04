const WORKER_URL="https://www.aquavoiq.com/api/cron/customer-messaging";

export default {
  async fetch(request: Request): Promise<Response> {
    const invocationId=request.headers.get("x-neon-trigger-invocation-id");
    if (!invocationId) {
      return Response.json({ ok:false,error:"TRIGGER_AUTH_REQUIRED" },{ status:403 });
    }

    const token=process.env.AQUAVO_CUSTOMER_MESSAGING_SCHEDULER_TOKEN?.trim();
    if (!token) {
      return Response.json({ ok:false,error:"SCHEDULER_TOKEN_NOT_CONFIGURED" },{ status:503 });
    }

    try {
      const response=await fetch(WORKER_URL,{
        method:"GET",
        headers:{
          authorization:`Bearer ${token}`,
          "user-agent":"aquavo-neon-customer-messaging-scheduler/1.0",
        },
        signal:AbortSignal.timeout(50_000),
      });

      const body=await response.text();
      if (!response.ok) {
        console.error(`AQUAVO worker rejected scheduled invocation: HTTP ${response.status}`);
        return Response.json(
          { ok:false,error:"WORKER_REJECTED",status:response.status },
          { status:502 },
        );
      }

      console.log(`AQUAVO customer-messaging worker accepted scheduled invocation ${invocationId}`);
      return new Response(body,{
        status:200,
        headers:{ "content-type":response.headers.get("content-type") || "application/json" },
      });
    } catch (error) {
      console.error(`AQUAVO worker invocation failed: ${error instanceof Error ? error.name : "unknown"}`);
      return Response.json({ ok:false,error:"WORKER_UNREACHABLE" },{ status:502 });
    }
  },
};
