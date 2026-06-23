import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const FIRECRAWL_V2 = 'https://api.firecrawl.dev/v2';

const PLATFORMS = [
  { key: 'instagram', regex: /instagram\.com\/([\w\.\-]+)/i, weight: 30 },
  { key: 'facebook', regex: /facebook\.com\/([\w\.\-]+)/i, weight: 20 },
  { key: 'tiktok', regex: /tiktok\.com\/@([\w\.\-]+)/i, weight: 20 },
  { key: 'youtube', regex: /youtube\.com\/(@[\w\.\-]+|channel\/[\w\.\-]+|c\/[\w\.\-]+)/i, weight: 15 },
  { key: 'linkedin', regex: /linkedin\.com\/(company|in)\/([\w\.\-]+)/i, weight: 10 },
  { key: 'twitter', regex: /(twitter|x)\.com\/([\w\.\-]+)/i, weight: 5 },
];

function extractFollowers(text: string): number | null {
  const t = text.toLowerCase();
  const m = t.match(/(\d+[\.,]?\d*)\s*(mil|k|m|milhões|milhao|seguidores|followers)/);
  if (!m) return null;
  let n = parseFloat(m[1].replace(',', '.'));
  const unit = m[2];
  if (/mil|k/.test(unit)) n *= 1000;
  if (/m|milh/.test(unit)) n *= 1_000_000;
  return Math.round(n);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) throw new Error('FIRECRAWL_API_KEY ausente');
    const { businessName, location } = await req.json();
    if (!businessName) throw new Error('businessName obrigatório');

    const query = `"${businessName}" ${location ?? ''} instagram facebook tiktok seguidores`.trim();
    const res = await fetch(`${FIRECRAWL_V2}/search`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit: 30, lang: 'pt', country: 'br' }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || `Falha ao consultar fonte externa (HTTP ${res.status})`);
    const items: any[] = json?.data?.web || json?.data || [];

    const platforms: Record<string, { handle: string | null; url: string; followers: number | null; sample: string }> = {};
    for (const p of PLATFORMS) {
      const found = items.find((i) => p.regex.test(i.url || ''));
      if (!found) continue;
      const handleMatch = (found.url || '').match(p.regex);
      const handle = handleMatch ? (handleMatch[2] || handleMatch[1]) : null;
      const followers = extractFollowers(`${found.title || ''} ${found.description || ''}`);
      platforms[p.key] = { handle, url: found.url, followers, sample: found.description || '' };
    }

    const activeKeys = Object.keys(platforms);
    const totalFollowers = activeKeys.reduce((acc, k) => acc + (platforms[k].followers || 0), 0);

    // Score: peso por plataforma ativa + bônus por base de seguidores
    let weightScore = 0;
    for (const p of PLATFORMS) if (platforms[p.key]) weightScore += p.weight;
    let followersBonus = 0;
    if (totalFollowers > 100_000) followersBonus = 20;
    else if (totalFollowers > 25_000) followersBonus = 15;
    else if (totalFollowers > 5_000) followersBonus = 10;
    else if (totalFollowers > 1_000) followersBonus = 5;

    const presence_score = Math.min(100, weightScore + followersBonus);
    let tier: 'forte' | 'consolidada' | 'emergente' | 'baixa' = 'baixa';
    if (presence_score >= 75) tier = 'forte';
    else if (presence_score >= 50) tier = 'consolidada';
    else if (presence_score >= 25) tier = 'emergente';

    const recommendations: string[] = [];
    if (!platforms.instagram) recommendations.push('Criar/ativar perfil no Instagram — canal central de inspiração turística.');
    if (!platforms.tiktok && presence_score < 50) recommendations.push('Avaliar entrada no TikTok para alcance orgânico e público jovem.');
    if (!platforms.google && !platforms.facebook) recommendations.push('Garantir Google Business Profile e Facebook ativos para SEO local.');
    if (activeKeys.length && totalFollowers < 1000) recommendations.push('Base de seguidores baixa — investir em conteúdo regular e parcerias com influenciadores locais.');
    if (presence_score >= 75) recommendations.push('Presença forte: estruturar funil de venda direta via redes para reduzir comissão de OTAs.');

    const analysis = {
      presence_score,
      presence_tier: tier,
      active_platforms: activeKeys,
      platforms,
      total_followers_estimated: totalFollowers,
      recommendations,
      summary: `Presença digital ${tier} (${presence_score}/100) com ${activeKeys.length} plataforma(s) ativa(s)${totalFollowers ? ` e ~${totalFollowers.toLocaleString('pt-BR')} seguidores estimados` : ''}.`,
    };

    return new Response(JSON.stringify({ analysis }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});