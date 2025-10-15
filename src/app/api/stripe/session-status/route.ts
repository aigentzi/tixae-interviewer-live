import { db } from "@root/server/typedFirestore";
import { NextResponse } from "next/server";
import { stripeService } from "@root/lib/stripe.lib";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
  }

  const order = await db.orders.query($ => $.field("id").eq(sessionId));
  if (order.length === 0) {
    return NextResponse.json({ status: "incomplete", message: "Order not found" }, { status: 400 });
  }

  const orderData = order[0].data;
  if (!orderData) {
    return NextResponse.json({ status: "incomplete", message: "Order not found" }, { status: 400 });
  }

  const stripeSession = await stripeService.retrieveCheckoutSession(orderData.stripe.sessionId as string);
  if (!stripeSession) {
    return NextResponse.json({ error: "Stripe session not found" }, { status: 400 });
  }

  return NextResponse.json({
    status: stripeSession.status,
    message: "Payment successful",
    customerEmail: stripeSession.customer_details?.email as string,
    limits: orderData.limits,
    invoiceId: stripeSession.invoice as string,
  }, { status: 200 });
}
