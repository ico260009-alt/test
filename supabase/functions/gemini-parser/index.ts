import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Verify User is Authenticated and is an Admin
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: profile } = await supabaseClient.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: Admins only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 2. Parse the request body (expecting base64 PDF)
    const { pdfBase64 } = await req.json()
    if (!pdfBase64) {
      return new Response(JSON.stringify({ error: 'No PDF provided' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 3. Call Gemini API securely from the server
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set on the server")
    }

    const prompt = `You are a strict data parser. I am providing a test/exam in PDF format.
Extract all the multiple-choice questions from this PDF.
Return EXACTLY a JSON array. Do not return markdown, do not return any other text.
Format of each object in the array:
{
  "text": "The text of the question",
  "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
  "correct_option_index": 0, // Integer representing the correct answer index (0 for A, 1 for B, 2 for C, 3 for D). Guess to the best of your ability if answers are not marked.
  "explanation_uz": "A brief explanation of the correct answer in Uzbek",
  "explanation_ru": "A brief explanation of the correct answer in Russian"
}
If you cannot parse it, return an empty array [].`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: "application/pdf",
                    data: pdfBase64
                  }
                }
              ]
            }
          ]
        })
      }
    );

    const geminiData = await response.json();
    
    if (!response.ok) {
      throw new Error(`Gemini API Error: ${JSON.stringify(geminiData)}`);
    }

    // 4. Extract and clean the JSON from Gemini's response
    let extractedText = geminiData.candidates[0].content.parts[0].text;
    
    // Strip markdown formatting if Gemini included it (e.g. ```json ... ```)
    extractedText = extractedText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const parsedQuestions = JSON.parse(extractedText);

    return new Response(JSON.stringify({ questions: parsedQuestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
