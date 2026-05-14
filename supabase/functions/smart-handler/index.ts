// PATCH F-01: Fix schema-qualified table access
// All supabase.from("schema.table") calls replaced with supabase.schema("schema").from("table")
// No other changes.

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface QuoteRequestBody {
  facility_id: string;
  business_profile_id: string;
  service_id?: string;
  title: string;
  description?: string;
}

interface ErrorResponse {
  error: string;
  code?: string;
}

function jsonResponse(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status: number, code?: string): Response {
  const body: ErrorResponse = { error: message };
  if (code) body.code = code;
  return jsonResponse(body, status);
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return errorResponse("Missing Authorization header", 401, "MISSING_AUTH");
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return errorResponse("Unauthorized", 401, "INVALID_TOKEN");
  }

  let body: QuoteRequestBody;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, "INVALID_BODY");
  }

  const { facility_id, business_profile_id, service_id, title, description } = body;

  if (!facility_id || !business_profile_id || !title) {
    return errorResponse(
      "facility_id, business_profile_id, and title are required",
      400,
      "MISSING_FIELDS"
    );
  }

  // PATCH F-01: was supabase.from("facility.members")
  const { data: membership } = await supabase
    .schema("facility")
    .from("members")
    .select("id, role")
    .eq("facility_id", facility_id)
    .eq("user_id", user.id)
    .is("left_at", null)
    .single();

  if (!membership) {
    return errorResponse(
      "User is not an active member of this facility",
      403,
      "NOT_FACILITY_MEMBER"
    );
  }

  // PATCH F-01: was supabase.from("marketplace.facility_vendors")
  const { data: vendorRelation } = await supabase
    .schema("marketplace")
    .from("facility_vendors")
    .select("status, trust_level")
    .eq("facility_id", facility_id)
    .eq("business_profile_id", business_profile_id)
    .eq("status", "approved")
    .single();

  if (!vendorRelation) {
    return errorResponse(
      "Business is not an approved vendor for this facility",
      403,
      "VENDOR_NOT_APPROVED"
    );
  }

  // PATCH F-01: was supabase.from("marketplace.business_profiles")
  const { data: businessProfile } = await supabase
    .schema("marketplace")
    .from("business_profiles")
    .select("id, name, is_active, is_approved")
    .eq("id", business_profile_id)
    .single();

  if (!businessProfile || !businessProfile.is_active || !businessProfile.is_approved) {
    return errorResponse(
      "Business profile is not available",
      403,
      "BUSINESS_UNAVAILABLE"
    );
  }

  if (service_id) {
    // PATCH F-01: was supabase.from("marketplace.business_services")
    const { data: service } = await supabase
      .schema("marketplace")
      .from("business_services")
      .select("id")
      .eq("id", service_id)
      .eq("business_profile_id", business_profile_id)
      .eq("is_active", true)
      .single();

    if (!service) {
      return errorResponse(
        "Service not found or not available for this business",
        400,
        "SERVICE_NOT_FOUND"
      );
    }
  }

  // PATCH F-01: was supabase.from("marketplace.quotes")
  const { data: quote, error: quoteError } = await supabase
    .schema("marketplace")
    .from("quotes")
    .insert({
      facility_id,
      business_profile_id,
      requested_by: user.id,
      service_id: service_id ?? null,
      title,
      description: description ?? null,
      status: "pending",
    })
    .select()
    .single();

  if (quoteError || !quote) {
    console.error("Quote insert error:", quoteError);
    return errorResponse("Failed to create quote", 500, "INSERT_FAILED");
  }

  return jsonResponse({ quote }, 201);
});
