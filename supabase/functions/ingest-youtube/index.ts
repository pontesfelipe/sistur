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
  // YouTube Data API enriched fields
  duration?: number; // in seconds
  durationFormatted?: string;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  isLive?: boolean;
  isUpcoming?: boolean;
  liveBroadcastContent?: string;
  channelTitle?: string;
  tags?: string[];
}

interface ClassificationResult {
  pillar: 'RA' | 'AO' | 'OE';
  confidence: number;
  matchedKeywords: string[];
}

function classifyContent(title: string, description?: string, tags?: string[]): ClassificationResult {
  const text = `${title} ${description || ''} ${(tags || []).join(' ')}`.toLowerCase();
  
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

function determineType(title: string, video: VideoEntry): 'course' | 'live' {
  // Use YouTube API live broadcast detection
  if (video.isLive || video.isUpcoming || video.liveBroadcastContent === 'live' || video.liveBroadcastContent === 'upcoming') {
    return 'live';
  }
  
  const titleLower = title.toLowerCase();
  const liveKeywords = ['live', 'ao vivo', 'transmissão', 'webinar', 'encontro', 'bate-papo'];
  
  for (const keyword of liveKeywords) {
    if (titleLower.includes(keyword)) {
      return 'live';
    }
  }
  
  return 'course';
}

// Parse ISO 8601 duration (PT1H2M3S) to seconds
function parseDuration(isoDuration: string): { seconds: number; formatted: string } {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return { seconds: 0, formatted: '0:00' };
  
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  
  const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  
  // Format as H:MM:SS or MM:SS
  let formatted: string;
  if (hours > 0) {
    formatted = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    formatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  
  return { seconds: totalSeconds, formatted };
}

// Fetch videos using YouTube Data API v3
async function fetchYouTubeDataAPI(channelId: string, apiKey: string, maxResults: number = 50): Promise<VideoEntry[]> {
  console.log(`Fetching videos via YouTube Data API for channel: ${channelId}`);
  
  // First, get playlist ID for uploads (it's the channel ID with UC replaced by UU)
  const uploadsPlaylistId = channelId.replace(/^UC/, 'UU');
  
  // Fetch playlist items (video IDs)
  const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=${Math.min(maxResults, 50)}&key=${apiKey}`;
  
  console.log(`Fetching playlist items...`);
  const playlistResponse = await fetch(playlistUrl);
  
  if (!playlistResponse.ok) {
    const errorText = await playlistResponse.text();
    console.error(`YouTube API error: ${playlistResponse.status}`, errorText);
    throw new Error(`YouTube API error: ${playlistResponse.status} - ${errorText}`);
  }
  
  const playlistData = await playlistResponse.json();
  const videoIds = playlistData.items?.map((item: { contentDetails: { videoId: string } }) => item.contentDetails.videoId) || [];
  
  if (videoIds.length === 0) {
    console.log('No videos found in playlist');
    return [];
  }
  
  console.log(`Found ${videoIds.length} video IDs, fetching details...`);
  
  // Fetch video details (includes duration, statistics, live status)
  const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics,liveStreamingDetails&id=${videoIds.join(',')}&key=${apiKey}`;
  
  const videosResponse = await fetch(videosUrl);
  
  if (!videosResponse.ok) {
    const errorText = await videosResponse.text();
    console.error(`YouTube API videos error: ${videosResponse.status}`, errorText);
    throw new Error(`YouTube API videos error: ${videosResponse.status}`);
  }
  
  const videosData = await videosResponse.json();
  
  const videos: VideoEntry[] = [];
  
  for (const item of videosData.items || []) {
    const snippet = item.snippet;
    const contentDetails = item.contentDetails;
    const statistics = item.statistics;
    const liveDetails = item.liveStreamingDetails;
    
    const duration = parseDuration(contentDetails.duration || 'PT0S');
    
    videos.push({
      title: snippet.title,
      videoId: item.id,
      link: `https://www.youtube.com/watch?v=${item.id}`,
      published: snippet.publishedAt,
      thumbnail: snippet.thumbnails?.maxres?.url || snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
      description: snippet.description,
      duration: duration.seconds,
      durationFormatted: duration.formatted,
      viewCount: parseInt(statistics?.viewCount || '0', 10),
      likeCount: parseInt(statistics?.likeCount || '0', 10),
      commentCount: parseInt(statistics?.commentCount || '0', 10),
      isLive: snippet.liveBroadcastContent === 'live',
      isUpcoming: snippet.liveBroadcastContent === 'upcoming',
      liveBroadcastContent: snippet.liveBroadcastContent,
      channelTitle: snippet.channelTitle,
      tags: snippet.tags || [],
    });
  }
  
  console.log(`Fetched ${videos.length} videos with full metadata`);
  return videos;
}

// Fallback: Fetch videos using RSS (no API key required)
async function fetchYouTubeRSS(channelId: string): Promise<VideoEntry[]> {
  const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  
  console.log(`Fetching RSS from: ${rssUrl} (fallback mode)`);
  
  const response = await fetch(rssUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch RSS: ${response.status}`);
  }
  
  const xmlText = await response.text();
  console.log(`Got RSS response, length: ${xmlText.length}`);
  
  const videos: VideoEntry[] = [];
  
  // Parse XML entries manually
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

async function resolveChannelId(handle: string, apiKey?: string): Promise<string | null> {
  // Known channels mapping
  const knownChannels: Record<string, string> = {
    '@ProfessorMarioBeni': 'UC4zMhGxcj5jqNLZz9XZLK0A',
    '@professormariobeni': 'UC4zMhGxcj5jqNLZz9XZLK0A',
  };
  
  if (knownChannels[handle]) {
    return knownChannels[handle];
  }
  
  // Try using YouTube Data API to resolve handle
  if (apiKey) {
    try {
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(handle)}&maxResults=1&key=${apiKey}`;
      const response = await fetch(searchUrl);
      if (response.ok) {
        const data = await response.json();
        if (data.items?.[0]?.id?.channelId) {
          console.log(`Resolved ${handle} to ${data.items[0].id.channelId} via API`);
          return data.items[0].id.channelId;
        }
      }
    } catch (error) {
      console.error('Error resolving channel via API:', error);
    }
  }
  
  // Fallback: Try fetching channel page to extract ID
  try {
    const url = `https://www.youtube.com/${handle}`;
    const response = await fetch(url);
    const html = await response.text();
    
    const channelIdMatch = html.match(/"channelId":"([^"]+)"/);
    if (channelIdMatch) {
      return channelIdMatch[1];
    }
    
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
    
    const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY');
    const useDataAPI = !!youtubeApiKey;
    
    console.log(`YouTube Data API available: ${useDataAPI}`);
    
    const body = await req.json();
    const { 
      channelHandle = '@ProfessorMarioBeni',
      channelId,
      action = 'ingest', // 'ingest' | 'preview'
      limit = 50,
      useRssOnly = false, // Force RSS even if API key available
    } = body;
    
    console.log(`Ingestion request: action=${action}, handle=${channelHandle}, limit=${limit}, useDataAPI=${useDataAPI && !useRssOnly}`);
    
    // Resolve channel ID if not provided
    let resolvedChannelId = channelId;
    if (!resolvedChannelId && channelHandle) {
      resolvedChannelId = await resolveChannelId(channelHandle, youtubeApiKey);
    }
    
    if (!resolvedChannelId) {
      throw new Error(`Could not resolve channel ID for ${channelHandle}. Please provide channelId directly.`);
    }
    
    console.log(`Using channel ID: ${resolvedChannelId}`);
    
    // Fetch videos (prefer Data API if key available)
    let videos: VideoEntry[];
    let ingestionSource: string;
    
    if (useDataAPI && !useRssOnly) {
      try {
        videos = await fetchYouTubeDataAPI(resolvedChannelId, youtubeApiKey!, limit);
        ingestionSource = 'youtube_data_api';
      } catch (apiError) {
        console.warn('Data API failed, falling back to RSS:', apiError);
        videos = await fetchYouTubeRSS(resolvedChannelId);
        ingestionSource = 'youtube_rss';
      }
    } else {
      videos = await fetchYouTubeRSS(resolvedChannelId);
      ingestionSource = 'youtube_rss';
    }
    
    if (videos.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No videos found',
          imported: 0,
          skipped: 0,
          source: ingestionSource,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Limit videos
    const videosToProcess = videos.slice(0, limit);
    
    // Check for existing videos
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
        duration?: number;
        durationFormatted?: string;
        viewCount?: number;
        isLive?: boolean;
      }>,
    };
    
    for (const video of videosToProcess) {
      const exists = existingUrls.has(video.link) || existingYoutubeIds.has(video.videoId);
      
      const classification = classifyContent(video.title, video.description, video.tags);
      const type = determineType(video.title, video);
      
      if (action === 'preview') {
        results.preview.push({
          title: video.title,
          videoId: video.videoId,
          pillar: classification.pillar,
          confidence: classification.confidence,
          type,
          exists,
          duration: video.duration,
          durationFormatted: video.durationFormatted,
          viewCount: video.viewCount,
          isLive: video.isLive || video.isUpcoming,
        });
        continue;
      }
      
      if (exists) {
        results.skipped++;
        console.log(`Skipping existing video: ${video.title}`);
        continue;
      }
      
      // Create training record
      const trainingId = `edu_${type}_${video.title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 80)}`;
      
      const slug = video.title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 50) + '-' + video.videoId.slice(0, 6);
      
      // Convert duration to minutes
      const durationMinutes = video.duration ? Math.round(video.duration / 60) : null;
      
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
        description: video.description?.slice(0, 1000),
        source: 'youtube_import',
        duration_minutes: durationMinutes,
        modules: [],
        aliases: [],
        ingestion_source: ingestionSource,
        ingestion_confidence: classification.confidence,
        ingestion_metadata: {
          youtube_id: video.videoId,
          channel_handle: channelHandle,
          channel_id: resolvedChannelId,
          channel_title: video.channelTitle,
          published_at: video.published,
          matched_keywords: classification.matchedKeywords,
          imported_at: new Date().toISOString(),
          // Enriched metadata from Data API
          duration_seconds: video.duration,
          duration_formatted: video.durationFormatted,
          view_count: video.viewCount,
          like_count: video.likeCount,
          comment_count: video.commentCount,
          is_live: video.isLive,
          is_upcoming: video.isUpcoming,
          live_broadcast_content: video.liveBroadcastContent,
          youtube_tags: video.tags,
        },
        tags: [...(classification.matchedKeywords.slice(0, 3)), ...(video.tags?.slice(0, 2) || [])],
      };
      
      const { error } = await supabase
        .from('edu_trainings')
        .insert(insertData);
      
      if (error) {
        console.error(`Error inserting video ${video.title}:`, error);
        results.skipped++;
      } else {
        results.imported++;
        console.log(`Imported: ${video.title} -> ${classification.pillar} (${classification.confidence}) [${video.durationFormatted || 'N/A'}]`);
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
        source: ingestionSource,
        hasEnrichedMetadata: ingestionSource === 'youtube_data_api',
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
