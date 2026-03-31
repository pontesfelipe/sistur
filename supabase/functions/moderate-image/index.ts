import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const { imageUrl } = await req.json();
    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "imageUrl is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
            content: `You are an image content moderator. Analyze the image and determine if it's appropriate for a professional tourism community forum.

REJECT images that contain:
- Nudity or sexual content
- Graphic violence or gore
- Hate speech symbols or extremist content
- Drug use or illegal activities
- Spam or irrelevant memes
- Personal/private information (IDs, credit cards, etc.)

APPROVE images that are:
- Tourism-related (landscapes, hotels, destinations, events)
- Professional or educational content
- Maps, charts, diagrams
- Normal photos of people in appropriate settings
- Documents or presentations

Respond ONLY with a JSON object: {"approved": true/false, "reason": "brief reason in Portuguese"}`
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: imageUrl }
              },
              {
                type: "text",
                text: "Analise esta imagem para moderação de conteúdo."
              }
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
      // On error, allow the image (fail open for availability)
      return new Response(
        JSON.stringify({ approved: true, reason: "Moderação indisponível" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    
    // Extract tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const result = JSON.parse(toolCall.function.arguments);
        return new Response(
          JSON.stringify({ approved: result.approved, reason: result.reason }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch {
        // Parse error, allow
      }
    }

    // Fallback: try parsing content directly
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

    // Default: allow
    return new Response(
      JSON.stringify({ approved: true, reason: "Aprovado" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    console.error("moderate-image error:", e);
    // Fail open
    return new Response(
      JSON.stringify({ approved: true, reason: "Erro na moderação" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
