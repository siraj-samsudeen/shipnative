import { serve } from "https://deno.land/std@0.223.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// Decode JWT payload without verification (verification happens via Supabase)
function decodeJwtPayload(token: string): { sub?: string } | null {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1]))
    return payload
  } catch {
    return null
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Extract and validate authorization header
    const authHeader = req.headers.get("authorization") ?? ""
    if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
      return new Response(
        JSON.stringify({ code: 401, message: "Missing or invalid Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    // Extract user ID from JWT payload
    const token = authHeader.replace(/^bearer\s+/i, "")
    const payload = decodeJwtPayload(token)

    if (!payload?.sub) {
      return new Response(
        JSON.stringify({ code: 401, message: "Invalid JWT: missing subject" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    const userId = payload.sub
    console.log("Account deletion requested for user:", userId)

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

    // Create admin client with service role key for deletion
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Cryptographically verify the JWT by calling Supabase auth with the token
    // This ensures the token was actually issued by Supabase and hasn't been tampered with
    const { data: authData, error: authError } = await adminClient.auth.getUser(token)

    if (authError || !authData?.user || authData.user.id !== userId) {
      console.error("JWT verification failed:", authError?.message || "User ID mismatch")
      return new Response(
        JSON.stringify({ code: 401, message: "Invalid or expired JWT" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    // Double-check user exists via admin API
    const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(userId)

    if (userError || !userData?.user) {
      console.error("User verification failed:", userError)
      return new Response(
        JSON.stringify({ code: 401, message: "Invalid JWT: user not found" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    // Delete the user's profile data first (if exists)
    const { error: profileError } = await adminClient
      .from("profiles")
      .delete()
      .eq("id", userId)

    if (profileError) {
      console.error("Failed to delete profile:", profileError)
      // Continue anyway - profile might not exist
    }

    // =========================================================================
    // OPTIONAL: Third-party service data deletion (GDPR compliance)
    // These are optional - if env vars are not set, deletion is skipped
    // =========================================================================

    // RevenueCat: Delete subscriber data (does NOT cancel active subscriptions)
    const revenueCatApiKey = Deno.env.get("REVENUECAT_API_KEY")
    if (revenueCatApiKey) {
      try {
        const rcResponse = await fetch(
          `https://api.revenuecat.com/v1/subscribers/${userId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${revenueCatApiKey}`,
              "Content-Type": "application/json",
            },
          },
        )
        if (rcResponse.ok) {
          console.log("RevenueCat subscriber data deleted")
        } else {
          console.warn("RevenueCat deletion skipped:", rcResponse.status)
        }
      } catch (rcError) {
        console.warn("RevenueCat deletion skipped:", rcError)
      }
    } else {
      console.log("RevenueCat deletion skipped: REVENUECAT_API_KEY not configured")
    }

    // PostHog: Delete user and their events
    const posthogApiKey = Deno.env.get("POSTHOG_API_KEY")
    const posthogHost = Deno.env.get("POSTHOG_HOST") || "https://us.posthog.com"
    const posthogProjectId = Deno.env.get("POSTHOG_PROJECT_ID")
    if (posthogApiKey && posthogProjectId) {
      try {
        const searchResponse = await fetch(
          `${posthogHost}/api/projects/${posthogProjectId}/persons/?distinct_id=${userId}`,
          { headers: { Authorization: `Bearer ${posthogApiKey}` } },
        )
        if (searchResponse.ok) {
          const searchData = await searchResponse.json()
          for (const person of searchData?.results || []) {
            const deleteResponse = await fetch(
              `${posthogHost}/api/projects/${posthogProjectId}/persons/${person.id}/?delete_events=true`,
              { method: "DELETE", headers: { Authorization: `Bearer ${posthogApiKey}` } },
            )
            console.log(deleteResponse.ok ? "PostHog person deleted" : "PostHog deletion failed")
          }
        }
      } catch (phError) {
        console.warn("PostHog deletion skipped:", phError)
      }
    } else {
      console.log("PostHog deletion skipped: API key or project ID not configured")
    }

    // Note: Sentry does not have a user deletion API
    // Configure data retention in Sentry dashboard for GDPR compliance

    // Delete the user from auth using admin API
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)

    if (deleteError) {
      console.error("Failed to delete user:", deleteError)
      return new Response(
        JSON.stringify({ code: 400, message: deleteError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    console.log("User deleted successfully:", userId)
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (error) {
    console.error("Delete user error:", error)
    return new Response(
      JSON.stringify({ code: 500, message: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})
