let youtubeApiPromise = null;

export function getYouTubeVideoId(input) {
  if (!input?.trim()) {
    return '';
  }

  try {
    const url = new URL(input.trim());
    const host = url.hostname.replace('www.', '');
    let videoId = '';

    if (host === 'youtu.be') {
      videoId = url.pathname.split('/').filter(Boolean)[0] || '';
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (url.pathname.startsWith('/watch')) {
        videoId = url.searchParams.get('v') || '';
      } else if (url.pathname.startsWith('/embed/') || url.pathname.startsWith('/shorts/')) {
        videoId = url.pathname.split('/').filter(Boolean)[1] || '';
      }
    }

    if (!/^[a-zA-Z0-9_-]{6,}$/.test(videoId)) {
      return '';
    }

    return videoId;
  } catch {
    return '';
  }
}

export function getYouTubeEmbedUrl(input) {
  const videoId = getYouTubeVideoId(input);
  return videoId ? `https://www.youtube.com/embed/${videoId}` : '';
}

export function getSyncedPlaybackTime(currentTime, isPlaying, updatedAt) {
  if (!isPlaying || !updatedAt) {
    return currentTime;
  }

  const elapsed = (Date.now() - updatedAt) / 1000;
  return currentTime + elapsed;
}

export function loadYouTubeApi() {
  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (!youtubeApiPromise) {
    youtubeApiPromise = new Promise((resolve, reject) => {
      if (window.YT?.Player) {
        resolve(window.YT);
        return;
      }

      const previousReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previousReady?.();
        resolve(window.YT);
      };

      const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
      if (!existingScript) {
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.onerror = () => reject(new Error('Failed to load YouTube player'));
        document.head.appendChild(script);
      }
    });
  }

  return youtubeApiPromise;
}
