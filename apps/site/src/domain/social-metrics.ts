import { z } from 'zod';

const youtubeChannelSchema = z.object({
  items: z
    .array(
      z.object({
        statistics: z.object({
          viewCount: z.string(),
          subscriberCount: z.string().optional(),
          videoCount: z.string(),
        }),
      }),
    )
    .max(1),
});
const instagramProfileSchema = z.object({
  username: z.string().optional(),
  followers_count: z.number().int().nonnegative().optional(),
  media_count: z.number().int().nonnegative().optional(),
});
const instagramMediaSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      media_type: z.string().optional(),
      like_count: z.number().int().nonnegative().optional(),
      comments_count: z.number().int().nonnegative().optional(),
    }),
  ),
});
const instagramInsightsSchema = z.object({
  data: z.array(
    z.object({
      name: z.string(),
      total_value: z.object({ value: z.number().nonnegative() }).optional(),
      values: z.array(z.object({ value: z.number().nonnegative() })).optional(),
    }),
  ),
});
const tiktokUserSchema = z.object({
  data: z.object({
    user: z.object({
      follower_count: z.number().int().nonnegative().optional(),
      video_count: z.number().int().nonnegative().optional(),
      likes_count: z.number().int().nonnegative().optional(),
    }),
  }),
  error: z.object({ code: z.string() }).optional(),
});
const tiktokVideosSchema = z.object({
  data: z.object({
    videos: z.array(
      z.object({
        view_count: z.number().int().nonnegative().optional(),
        like_count: z.number().int().nonnegative().optional(),
        comment_count: z.number().int().nonnegative().optional(),
        share_count: z.number().int().nonnegative().optional(),
      }),
    ),
  }),
  error: z.object({ code: z.string() }).optional(),
});

export const socialPlatformSchema = z.enum(['youtube', 'instagram', 'tiktok', 'x']);
export const socialSourceSchema = z.object({
  platform: socialPlatformSchema,
  state: z.enum(['connected', 'partial', 'not_configured', 'unavailable', 'error']),
  message: z.string(),
  followers: z.number().int().nonnegative().nullable(),
  views: z.number().int().nonnegative().nullable(),
  interactions: z.number().int().nonnegative().nullable(),
  publications: z.number().int().nonnegative().nullable(),
});
export const socialMetricsResponseSchema = z.object({
  refreshedAt: z.iso.datetime(),
  sources: z.array(socialSourceSchema).length(4),
});
export type SocialSource = z.infer<typeof socialSourceSchema>;

function emptySource(
  platform: SocialSource['platform'],
  state: SocialSource['state'],
  message: string,
): SocialSource {
  return {
    platform,
    state,
    message,
    followers: null,
    views: null,
    interactions: null,
    publications: null,
  };
}

async function jsonFrom<T>(
  url: URL | string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('Accept', 'application/json');
  const response = await fetch(url, {
    ...init,
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
    headers,
  });
  if (!response.ok) throw new Error(`API indisponible (${String(response.status)}).`);
  return schema.parse(await response.json());
}

async function youtubeMetrics(): Promise<SocialSource> {
  const key = process.env['YOUTUBE_API_KEY']?.trim();
  if (!key)
    return emptySource(
      'youtube',
      'not_configured',
      'Ajoutez YOUTUBE_API_KEY pour lire les statistiques publiques de la chaîne.',
    );
  try {
    const url = new URL('https://www.googleapis.com/youtube/v3/channels');
    url.searchParams.set('part', 'statistics');
    url.searchParams.set('id', 'UCuATIBXo5uvNLVm-gCgMenA');
    url.searchParams.set('key', key);
    const result = await jsonFrom(url, youtubeChannelSchema);
    const stats = result.items[0]?.statistics;
    if (!stats)
      return emptySource('youtube', 'error', 'Chaîne Sandbox introuvable dans YouTube Data API.');
    return {
      platform: 'youtube',
      state: 'connected',
      message: 'Statistiques publiques de la chaîne.',
      followers: stats.subscriberCount ? Number(stats.subscriberCount) : null,
      views: Number(stats.viewCount),
      interactions: null,
      publications: Number(stats.videoCount),
    };
  } catch {
    return emptySource(
      'youtube',
      'error',
      'La collecte YouTube a échoué. Vérifiez la clé API et ses quotas.',
    );
  }
}

async function instagramMetrics(): Promise<SocialSource> {
  const token = process.env['INSTAGRAM_ACCESS_TOKEN']?.trim();
  const userId = process.env['INSTAGRAM_USER_ID']?.trim();
  if (!token || !userId)
    return emptySource(
      'instagram',
      'not_configured',
      'Ajoutez le jeton de lecture et l’ID du compte professionnel Instagram.',
    );
  try {
    const configuredVersion = process.env['META_GRAPH_API_VERSION']?.trim();
    const version = configuredVersion && configuredVersion.length > 0 ? configuredVersion : 'v25.0';
    const profileUrl = new URL(
      `https://graph.facebook.com/${version}/${encodeURIComponent(userId)}`,
    );
    profileUrl.searchParams.set('fields', 'username,followers_count,media_count');
    const headers = { Authorization: `Bearer ${token}` };
    const profile = await jsonFrom(profileUrl, instagramProfileSchema, { headers });
    const mediaUrl = new URL(
      `https://graph.facebook.com/${version}/${encodeURIComponent(userId)}/media`,
    );
    mediaUrl.searchParams.set('fields', 'id,media_type,like_count,comments_count');
    mediaUrl.searchParams.set('limit', '25');
    const media = await jsonFrom(mediaUrl, instagramMediaSchema, { headers });
    const interactions = media.data.reduce(
      (total, item) => total + (item.like_count ?? 0) + (item.comments_count ?? 0),
      0,
    );
    const videos = media.data.filter((item) => item.media_type === 'VIDEO').slice(0, 10);
    const viewResults = await Promise.all(
      videos.map(async (item) => {
        const insightUrl = new URL(
          `https://graph.facebook.com/${version}/${encodeURIComponent(item.id)}/insights`,
        );
        insightUrl.searchParams.set('metric', 'views');
        try {
          const result = await jsonFrom(insightUrl, instagramInsightsSchema, { headers });
          const metric = result.data.find((entry) => entry.name === 'views');
          return (
            metric?.total_value?.value ??
            metric?.values?.reduce((sum, row) => sum + row.value, 0) ??
            null
          );
        } catch {
          return null;
        }
      }),
    );
    const views =
      videos.length > 0 && viewResults.every((value) => value !== null)
        ? viewResults.reduce<number>((total, value) => total + value, 0)
        : null;
    const state = views === null ? 'partial' : 'connected';
    const message =
      views === null
        ? `@${profile.username ?? 'compte'} · vues indisponibles pour tout ou partie des médias récents.`
        : `@${profile.username ?? 'compte'} · vues des ${String(videos.length)} dernières vidéos.`;
    return {
      platform: 'instagram',
      state,
      message,
      followers: profile.followers_count ?? null,
      views,
      interactions,
      publications: profile.media_count ?? media.data.length,
    };
  } catch {
    return emptySource(
      'instagram',
      'error',
      'La collecte Instagram a échoué. Vérifiez le jeton, les droits et l’ID du compte.',
    );
  }
}

async function tiktokMetrics(): Promise<SocialSource> {
  const token = process.env['TIKTOK_ACCESS_TOKEN']?.trim();
  if (!token)
    return emptySource(
      'tiktok',
      'not_configured',
      'Ajoutez un jeton TikTok autorisé avec les droits de lecture du profil et des vidéos.',
    );
  try {
    const userUrl = new URL('https://open.tiktokapis.com/v2/user/info/');
    userUrl.searchParams.set('fields', 'follower_count,video_count,likes_count');
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    const [user, videos] = await Promise.all([
      jsonFrom(userUrl, tiktokUserSchema, { headers }),
      jsonFrom(
        'https://open.tiktokapis.com/v2/video/list/?fields=view_count,like_count,comment_count,share_count',
        tiktokVideosSchema,
        { method: 'POST', headers, body: JSON.stringify({ max_count: 20 }) },
      ),
    ]);
    if (user.error?.code && user.error.code !== 'ok')
      throw new Error('TikTok profile request failed');
    if (videos.error?.code && videos.error.code !== 'ok')
      throw new Error('TikTok video request failed');
    const views = videos.data.videos.every((video) => video.view_count !== undefined)
      ? videos.data.videos.reduce((total, video) => total + (video.view_count ?? 0), 0)
      : null;
    const interactions = videos.data.videos.reduce(
      (total, video) =>
        total + (video.like_count ?? 0) + (video.comment_count ?? 0) + (video.share_count ?? 0),
      0,
    );
    const profile = user.data.user;
    return {
      platform: 'tiktok',
      state: views === null ? 'partial' : 'connected',
      message:
        views === null
          ? 'Vues indisponibles pour une partie des vidéos.'
          : 'Profil et dernières vidéos.',
      followers: profile.follower_count ?? null,
      views,
      interactions,
      publications: profile.video_count ?? null,
    };
  } catch {
    return emptySource(
      'tiktok',
      'error',
      'La collecte TikTok a échoué. Vérifiez l’accès API et les autorisations.',
    );
  }
}

export async function refreshSocialMetrics(): Promise<z.infer<typeof socialMetricsResponseSchema>> {
  const [youtube, instagram, tiktok] = await Promise.all([
    youtubeMetrics(),
    instagramMetrics(),
    tiktokMetrics(),
  ]);
  return socialMetricsResponseSchema.parse({
    refreshedAt: new Date().toISOString(),
    sources: [
      youtube,
      instagram,
      tiktok,
      emptySource(
        'x',
        'unavailable',
        'L’API X facture les lectures à l’usage ; aucune requête n’est lancée pour éviter des frais.',
      ),
    ],
  });
}
