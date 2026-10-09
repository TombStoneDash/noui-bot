import { NextResponse } from "next/server";
import { filterCatalogRows, countRealProviders } from "@/lib/catalog-hygiene";
import { getSupabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category");
  const limitParam = url.searchParams.get("limit");
  const offsetParam = url.searchParams.get("offset");
  const requestedLimit = limitParam === null ? 50 : Number(limitParam);
  const offset = offsetParam === null ? 0 : Number(offsetParam);

  if (
    (limitParam !== null && !/^[0-9]+$/.test(limitParam)) ||
    !Number.isSafeInteger(requestedLimit) || requestedLimit <= 0
  ) {
    return NextResponse.json(
      { error: true, message: "limit must be a positive safe integer written using digits only" },
      { status: 400 }
    );
  }

  if (
    (offsetParam !== null && !/^[0-9]+$/.test(offsetParam)) ||
    !Number.isSafeInteger(offset) || offset < 0
  ) {
    return NextResponse.json(
      { error: true, message: "offset must be a nonnegative safe integer written using digits only" },
      { status: 400 }
    );
  }

  const limit = Math.min(requestedLimit, 100);
  if (offset > Number.MAX_SAFE_INTEGER - (limit - 1)) {
    return NextResponse.json(
      { error: true, message: "pagination range end exceeds the maximum safe integer" },
      { status: 400 }
    );
  }
  const sb = getSupabase();

  let query = sb
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
      call_count,
      avg_latency_ms,
      uptime_pct,
      created_at,
      bazaar_providers:provider_id (
        id,
        name,
        email,
        endpoint_url,
        api_key_hash,
        api_key_prefix,
        description,
        pricing_model,
        default_price_cents,
        verified
      )
    `)
    .eq("active", true)
    .order("call_count", { ascending: false });

  if (category) {
    query = query.eq("category", category);
  }

  const { data: tools, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: true, message: error.message },
      { status: 500 }
    );
  }

  const filtered = filterCatalogRows(tools || []);

  return NextResponse.json({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: filtered.slice(offset, offset + limit).map((t: any) => {
      const provider = t.bazaar_providers;
      const priceCents = t.price_cents_override ?? provider?.default_price_cents ?? 0;
      const pricingModel = t.pricing_model_override ?? provider?.pricing_model ?? "per_call";

      return {
        id: t.id,
        tool_name: t.tool_name,
        display_name: t.display_name || t.tool_name,
        description: t.description,
        category: t.category,
        provider: {
          id: provider?.id,
          name: provider?.name,
          verified: provider?.verified,
        },
        pricing: {
          model: pricingModel,
          price_cents: priceCents,
          price: priceCents === 0 ? "Free" : `$${(priceCents / 100).toFixed(4)}/call`,
          free_tier_calls: t.free_tier_calls || 0,
        },
        stats: {
          total_calls: t.call_count,
          avg_latency_ms: t.avg_latency_ms,
          uptime_pct: t.uptime_pct,
        },
      };
    }),
    total: filtered.length,
    providers: countRealProviders(filtered),
    limit,
    offset,
    categories: ["weather", "search", "code", "data", "comms", "other"],
  });
}
