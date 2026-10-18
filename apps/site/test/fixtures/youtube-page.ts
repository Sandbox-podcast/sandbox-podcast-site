export const youtubeVideoId = 'GgSiPkADCz4';

export function youtubePlayerFixture() {
  return {
    playabilityStatus: { status: 'OK' },
    videoDetails: {
      videoId: youtubeVideoId,
      title: 'Épisode public',
      author: 'Sandbox TalkShow',
      shortDescription:
        'Les outils de la semaine.\n\n00:00 Introduction\n05:12 Démonstration\n\nCode : https://github.com/sandbox/demo',
      lengthSeconds: '4702',
      thumbnail: {
        thumbnails: [
          {
            url: `https://i.ytimg.com/vi/${youtubeVideoId}/hqdefault.jpg`,
            width: 480,
            height: 360,
          },
          {
            url: `https://i.ytimg.com/vi/${youtubeVideoId}/maxresdefault.jpg`,
            width: 1280,
            height: 720,
          },
        ],
      },
    },
    microformat: {
      playerMicroformatRenderer: {
        publishDate: '2026-10-12T12:52:24-07:00',
        uploadDate: '2026-10-10',
      },
    },
  };
}

export function youtubeWatchHtml(player: unknown = youtubePlayerFixture()) {
  return `<html><script>var ytInitialPlayerResponse = ${JSON.stringify(player)}; window.other = {};</script></html>`;
}
