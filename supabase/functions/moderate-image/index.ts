import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STRICTNESS_PROMPTS: Record<number, string> = {
  1: `REJECT only: explicit nudity, graphic sexual content, or extreme gore. Allow everything else.`,
  2: `REJECT: nudity, sexual content, graphic violence, hate speech symbols. Allow most other content.`,
  3: `REJECT: nudity, sexual content, violence, hate speech, drug use, spam/memes, personal information (IDs, credit cards). APPROVE: tourism-related content, professional photos, educational content, maps, charts, normal photos.`,
  4: `REJECT: anything not clearly professional or educational. Only APPROVE: tourism destinations, hotels, landscapes, professional events, maps, charts, diagrams, documents, presentations. Reject selfies, personal photos, memes, unrelated content.`,
  5: `REJECT: anything not DIRECTLY related to tourism. Only APPROVE: tourism destinations, hotels, landscapes, infrastructure, heritage sites, tourism events, tourism maps/charts, tourism documents. Reject everything else including generic professional content.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { imageUrl, orgId } = await req.json();
    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "imageUrl is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get strictness level from org settings
    let strictnessLevel = 3; // default moderate
    if (orgId) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        const { data } = await supabase
          .from("content_moderation_settings")
          .select("strictness_level, auto_reject_enabled")
          .eq("org_id", orgId)
          .maybeSingle();
        
        if (data) {
          strictnessLevel = data.strictness_level;
          // If auto-reject is disabled, just approve everything
          if (!data.auto_reject_enabled) {
            return new Response(
              JSON.stringify({ approved: true, reason: "Rejeição automática desabilitada" }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      } catch (e) {
        console.error("Error fetching moderation settings:", e);
      }
    }

    const strictnessPrompt = STRICTNESS_PROMPTS[strictnessLevel] || STRICTNESS_PROMPTS[3];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are an image content moderator for a professional tourism community forum.

MODERATION POLICY (Strictness Level ${strictnessLevel}/5):
${strictnessPrompt}

Respond ONLY with a JSON object: {"approved": true/false, "reason": "brief reason in Portuguese"}`
          },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: imageUrl } },
              { type: "text", text: "Analise esta imagem para moderação de conteúdo." }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "moderation_result",
              description: "Return the moderation result for the image",
              parameters: {
                type: "object",
                properties: {
                  approved: { type: "boolean", description: "Whether the image is approved" },
                  reason: { type: "string", description: "Brief reason in Portuguese" }
                },
                required: ["approved", "reason"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "moderation_result" } }
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status);
      return new Response(
        JSON.stringify({ approved: true, reason: "Moderação indisponível" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const result = JSON.parse(toolCall.function.arguments);
        return new Response(
          JSON.stringify({ approved: result.approved, reason: result.reason }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch { /* fallthrough */ }
    }

    // Fallback
    const content = data.choices?.[0]?.message?.content || "";
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return new Response(
          JSON.stringify({ approved: !!result.approved, reason: result.reason || "Sem detalhes" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch { /* ignore */ }

    return new Response(
      JSON.stringify({ approved: true, reason: "Aprovado" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    console.error("moderate-image error:", e);
    return new Response(
      JSON.stringify({ approved: true, reason: "Erro na moderação" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
