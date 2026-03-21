import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

/**
 * GET /api/v1/bazaar/pricing — List all tool pricing
 * Public, no auth required.
 */
export async function GET() {
  const sb = getSupabase();

  try {
    const { data: tools, error } = await sb
      .from("bazaar_tools")
      .select(`
        id,
        tool_name,
        display_name,
        description,
        category,
        price_cents_override,
        pricing_model_override,
        free_tier_calls,
        bazaar_providers:provider_id (
          id,
          name,
          pricing_model,
          default_price_cents
        )
      `)
      .eq("active", true)
      .order("tool_name");

    if (error) {
      return NextResponse.json({ error: true, message: error.message }, { status: 500 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pricing = (tools || []).map((t: any) => {
      const provider = t.bazaar_providers;
      const priceCents = t.price_cents_override ?? provider?.default_price_cents ?? 0;
      const priceMicrocents = priceCents * 100;
      const pricingModel = t.pricing_model_override ?? provider?.pricing_model ?? "per_call";

      return {
        tool_id: t.id,
        tool_name: t.tool_name,
        display_name: t.display_name || t.tool_name,
        description: t.description,
        category: t.category,
        provider: provider?.name || "Unknown",
        pricing: {
          model: pricingModel,
          price_per_call_microcents: priceMicrocents,
          price_per_call_cents: priceCents,
          price_per_call: priceCents === 0 ? "Free" : `$${(priceCents / 100).toFixed(4)}`,
          free_tier_calls: t.free_tier_calls || 100,
        },
      };
    });

    return NextResponse.json({
      pricing,
      total: pricing.length,
      platform_fee: "10%",
      note: "Prices are set by providers. Platform fee is deducted from provider earnings.",
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: true, message }, { status: 500 });
  }
}
