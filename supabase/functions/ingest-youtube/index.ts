import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SISTUR pillar classification keywords
const PILLAR_KEYWORDS = {
  RA: [
    'meio ambiente', 'socioambiental', 'patrimônio', 'cultura', 'identidade',
    'clima', 'saúde', 'segurança', 'demografia', 'território', 'sustentabilidade',
    'ambiental', 'natural', 'ecologia', 'biodiversidade', 'preservação', 'cultural',
    'tradição', 'comunidade', 'paisagem', 'recursos naturais'
  ],
  AO: [
    'políticas públicas', 'governança', 'planejamento', 'gestão', 'orçamento',
    'indicadores', 'conta satélite', 'crise', 'smart cities', 'inovação pública',
    'sistema', 'sistur', 'organização', 'administração', 'regulamentação',
    'política', 'governo', 'institucional', 'desenvolvimento', 'estratégia',
    'avaliação', 'monitoramento', 'competitividade'
  ],
  OE: [
    'mercado', 'marketing', 'hotel', 'hospitalidade', 'experiência',
    'eventos', 'mice', 'cadeia produtiva', 'empreendedorismo', 'qualidade',
    'turista', 'visitante', 'oferta', 'produto', 'serviço', 'agência',
    'operadora', 'receptivo', 'promoção', 'comercialização', 'vendas'
  ]
};

interface VideoEntry {
  title: string;
  videoId: string;
  link: string;
  published: string;
  thumbnail?: string;
  description?: string;
}

interface ClassificationResult {
  pillar: 'RA' | 'AO' | 'OE';
  confidence: number;
  matchedKeywords: string[];
}

function classifyContent(title: string, description?: string): ClassificationResult {
  const text = `${title} ${description || ''}`.toLowerCase();
  
  const scores: Record<string, { count: number; keywords: string[] }> = {
    RA: { count: 0, keywords: [] },
    AO: { count: 0, keywords: [] },
    OE: { count: 0, keywords: [] },
  };
  
  for (const [pillar, keywords] of Object.entries(PILLAR_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        scores[pillar].count++;
        scores[pillar].keywords.push(keyword);
      }
    }
  }
  
  // Determine pillar with highest score, with priority AO > RA > OE for ties
  const priority = ['AO', 'RA', 'OE'];
  let bestPillar = 'AO'; // Default
  let maxScore = 0;
  
  for (const pillar of priority) {
    if (scores[pillar].count > maxScore) {
      maxScore = scores[pillar].count;
      bestPillar = pillar;
    }
  }
  
  // Calculate confidence (0.3 base + 0.1 per keyword match, max 0.95)
  const confidence = Math.min(0.95, 0.3 + maxScore * 0.1);
  
  return {
    pillar: bestPillar as 'RA' | 'AO' | 'OE',
    confidence: Math.round(confidence * 100) / 100,
    matchedKeywords: scores[bestPillar].keywords,
  };
}

function determineType(title: string, isLive?: boolean): 'course' | 'live' {
  const titleLower = title.toLowerCase();
  if (isLive || titleLower.includes('live') || titleLower.includes('ao vivo')) {
    return 'live';
  }
  return 'course';
}

async function fetchYouTubeRSS(channelId: string): Promise<VideoEntry[]> {
  const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  
  console.log(`Fetching RSS from: ${rssUrl}`);
  
  const response = await fetch(rssUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch RSS: ${response.status}`);
  }
  
  const xmlText = await response.text();
  console.log(`Got RSS response, length: ${xmlText.length}`);
  
  const videos: VideoEntry[] = [];
  
  // Parse XML entries manually (Deno doesn't have DOMParser in edge functions)
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;
  
  while ((match = entryRegex.exec(xmlText)) !== null) {
    const entry = match[1];
    
    const titleMatch = entry.match(/<title>([^<]+)<\/title>/);
    const linkMatch = entry.match(/<link[^>]*href="([^"]+)"/);
    const publishedMatch = entry.match(/<published>([^<]+)<\/published>/);
    const videoIdMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const thumbnailMatch = entry.match(/<media:thumbnail[^>]*url="([^"]+)"/);
    const descriptionMatch = entry.match(/<media:description>([^<]*)<\/media:description>/);
    
    if (titleMatch && videoIdMatch) {
      videos.push({
        title: titleMatch[1].trim(),
        videoId: videoIdMatch[1],
        link: linkMatch?.[1] || `https://www.youtube.com/watch?v=${videoIdMatch[1]}`,
        published: publishedMatch?.[1] || new Date().toISOString(),
        thumbnail: thumbnailMatch?.[1],
        description: descriptionMatch?.[1]?.trim(),
      });
    }
  }
  
  console.log(`Parsed ${videos.length} videos from RSS`);
  return videos;
}

async function resolveChannelId(handle: string): Promise<string | null> {
  // Try to get channel ID from handle
  // For @ProfessorMarioBeni, known channel ID
  const knownChannels: Record<string, string> = {
    '@ProfessorMarioBeni': 'UC4zMhGxcj5jqNLZz9XZLK0A',
    '@professormariobeni': 'UC4zMhGxcj5jqNLZz9XZLK0A',
  };
  
  if (knownChannels[handle]) {
    return knownChannels[handle];
  }
  
  // Try fetching channel page to extract ID
  try {
    const url = `https://www.youtube.com/${handle}`;
    const response = await fetch(url);
    const html = await response.text();
    
    // Look for channel ID in the page
    const channelIdMatch = html.match(/"channelId":"([^"]+)"/);
    if (channelIdMatch) {
      return channelIdMatch[1];
    }
    
    // Alternative pattern
    const altMatch = html.match(/channel_id=([A-Za-z0-9_-]{24})/);
    if (altMatch) {
      return altMatch[1];
    }
  } catch (error) {
    console.error('Error resolving channel ID:', error);
  }
  
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const body = await req.json();
    const { 
      channelHandle = '@ProfessorMarioBeni',
      channelId,
      action = 'ingest', // 'ingest' | 'preview'
      limit = 50,
    } = body;
    
    console.log(`Ingestion request: action=${action}, handle=${channelHandle}, limit=${limit}`);
    
    // Resolve channel ID if not provided
    let resolvedChannelId = channelId;
    if (!resolvedChannelId && channelHandle) {
      resolvedChannelId = await resolveChannelId(channelHandle);
    }
    
    if (!resolvedChannelId) {
      throw new Error(`Could not resolve channel ID for ${channelHandle}. Please provide channelId directly.`);
    }
    
    console.log(`Using channel ID: ${resolvedChannelId}`);
    
    // Fetch videos from RSS
    const videos = await fetchYouTubeRSS(resolvedChannelId);
    
    if (videos.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No videos found in RSS feed',
          imported: 0,
          skipped: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Limit videos
    const videosToProcess = videos.slice(0, limit);
    
    // Check for existing videos by video URL
    const existingUrls = new Set<string>();
    const { data: existingVideos } = await supabase
      .from('edu_trainings')
      .select('video_url')
      .eq('video_provider', 'youtube');
    
    if (existingVideos) {
      for (const v of existingVideos) {
        if (v.video_url) existingUrls.add(v.video_url);
      }
    }
    
    // Also check by youtube ID in ingestion_metadata
    const { data: existingByMeta } = await supabase
      .from('edu_trainings')
      .select('ingestion_metadata')
      .not('ingestion_metadata', 'is', null);
    
    const existingYoutubeIds = new Set<string>();
    if (existingByMeta) {
      for (const v of existingByMeta) {
        const meta = v.ingestion_metadata as { youtube_id?: string };
        if (meta?.youtube_id) existingYoutubeIds.add(meta.youtube_id);
      }
    }
    
    // Process and classify videos
    const results = {
      imported: 0,
      skipped: 0,
      preview: [] as Array<{
        title: string;
        videoId: string;
        pillar: string;
        confidence: number;
        type: string;
        exists: boolean;
      }>,
    };
    
    for (const video of videosToProcess) {
      const exists = existingUrls.has(video.link) || existingYoutubeIds.has(video.videoId);
      
      const classification = classifyContent(video.title, video.description);
      const type = determineType(video.title);
      
      if (action === 'preview') {
        results.preview.push({
          title: video.title,
          videoId: video.videoId,
          pillar: classification.pillar,
          confidence: classification.confidence,
          type,
          exists,
        });
        continue;
      }
      
      if (exists) {
        results.skipped++;
        console.log(`Skipping existing video: ${video.title}`);
        continue;
      }
      
      // Create training record
      const trainingId = `YT-${video.videoId}`;
      const slug = video.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 50) + '-' + video.videoId.slice(0, 6);
      
      const insertData = {
        training_id: trainingId,
        title: video.title,
        slug,
        type,
        pillar: classification.pillar,
        status: 'draft',
        active: false,
        video_provider: 'youtube',
        video_url: video.link,
        thumbnail_url: video.thumbnail,
        description: video.description?.slice(0, 500),
        source: 'youtube_import',
        modules: [],
        aliases: [],
        ingestion_source: 'youtube_rss',
        ingestion_confidence: classification.confidence,
        ingestion_metadata: {
          youtube_id: video.videoId,
          channel_handle: channelHandle,
          channel_id: resolvedChannelId,
          published_at: video.published,
          matched_keywords: classification.matchedKeywords,
          imported_at: new Date().toISOString(),
        },
        tags: classification.matchedKeywords.slice(0, 5),
      };
      
      const { error } = await supabase
        .from('edu_trainings')
        .insert(insertData);
      
      if (error) {
        console.error(`Error inserting video ${video.title}:`, error);
        results.skipped++;
      } else {
        results.imported++;
        console.log(`Imported: ${video.title} -> ${classification.pillar} (${classification.confidence})`);
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: action === 'preview' 
          ? `Found ${videosToProcess.length} videos to preview`
          : `Imported ${results.imported} videos, skipped ${results.skipped}`,
        channelId: resolvedChannelId,
        totalInFeed: videos.length,
        processed: videosToProcess.length,
        ...results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Ingestion error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});