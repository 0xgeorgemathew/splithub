import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "~~/lib/supabase";
import { completePaymentRequest, verifyPendingRequest } from "~~/services/paymentRequestService";

// GET /api/payment-requests/[id] - Fetch a payment request by ID
async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const { data, error } = await supabase
      .from("payment_requests")
      .select(
        `
        *,
        payer_user:users!payment_requests_payer_fkey(
          name,
          twitter_handle,
          twitter_profile_url
        ),
        recipient_user:users!payment_requests_recipient_fkey(
          name,
          twitter_handle,
          twitter_profile_url
        )
      `,
      )
      .eq("id", id)
      .single();

    if (error || !data) {
      return Response.json({ error: "Request not found" }, { status: 404 });
    }

    // Check if expired
    if (data.status === "pending" && new Date(data.expires_at) < new Date()) {
      await supabase.from("payment_requests").update({ status: "expired" }).eq("id", id);

      data.status = "expired";
    }

    return Response.json({ data });
  } catch (_err) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/payment-requests/[id] - Update a payment request (mark as completed)
async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { status, tx_hash } = body;

    if (!id) {
      return Response.json({ error: "Missing request ID" }, { status: 400 });
    }

    if (status !== "completed") {
      return Response.json({ error: "Invalid status update" }, { status: 400 });
    }

    if (!tx_hash) {
      return Response.json({ error: "Transaction hash required for completion" }, { status: 400 });
    }

    // Verify request is pending
    const verification = await verifyPendingRequest(id);
    if (!verification.exists) {
      return Response.json({ error: verification.error }, { status: 404 });
    }
    if (verification.status !== "pending") {
      return Response.json({ error: verification.error }, { status: 400 });
    }

    // Complete the request
    const data = await completePaymentRequest(id, tx_hash);
    return Response.json(data);
  } catch (err) {
    console.error("Payment request update error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/payment-requests/[id] - Alternative completion endpoint
async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const { txHash } = await request.json();

    if (!txHash) {
      return Response.json({ error: "Transaction hash required" }, { status: 400 });
    }

    const data = await completePaymentRequest(id, txHash);
    return Response.json({ success: true, data });
  } catch (_err) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/payment-requests/$id/")({
  server: {
    handlers: {
      GET: ({ request, params }) => GET(request, { params }),
      PATCH: ({ request, params }) => PATCH(request, { params }),
      POST: ({ request, params }) => POST(request, { params }),
    },
  },
});
