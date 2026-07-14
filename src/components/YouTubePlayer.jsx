import { useCallback, useEffect, useRef, useState } from 'react';
import { getSyncedPlaybackTime, loadYouTubeApi } from '../utils/youtube.js';

const PlayerState = {
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
};

const DRIFT_SEEK_SECONDS = 1.25;
const REMOTE_GUARD_MS = 800;

function YouTubePlayer({ videoId, socket, roomId, participantId, playback }) {
  const hostRef = useRef(null);
  const playerRef = useRef(null);
  const isApplyingRemoteRef = useRef(false);
  const remoteGuardUntilRef = useRef(0);
  const lastBroadcastAtRef = useRef(0);
  const playbackRef = useRef(playback);
  const [needsInteraction, setNeedsInteraction] = useState(false);
  const [playerError, setPlayerError] = useState('');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    playbackRef.current = playback;
  }, [playback]);

  const beginRemoteApply = useCallback(() => {
    isApplyingRemoteRef.current = true;
    remoteGuardUntilRef.current = Date.now() + REMOTE_GUARD_MS;
  }, []);

  const endRemoteApply = useCallback(() => {
    window.setTimeout(() => {
      isApplyingRemoteRef.current = false;
      remoteGuardUntilRef.current = Date.now() + 200;
    }, 350);
  }, []);

  const shouldIgnoreLocalEvents = useCallback(
    () => isApplyingRemoteRef.current || Date.now() < remoteGuardUntilRef.current,
    [],
  );

  const broadcastPlayback = useCallback(
    (action, currentTime) => {
      if (shouldIgnoreLocalEvents()) {
        return;
      }

      const now = Date.now();
      // Throttle sync pulses only; play/pause/seek should go out immediately.
      if (action === 'sync' && now - lastBroadcastAtRef.current < 3500) {
        return;
      }

      if (action === 'sync') {
        lastBroadcastAtRef.current = now;
      }

      socket?.emit('youtube:playback', {
        roomId,
        action,
        currentTime,
        videoId,
      });
    },
    [socket, roomId, videoId, shouldIgnoreLocalEvents],
  );

  const applyPlayback = useCallback(
    (payload) => {
      const player = playerRef.current;
      if (!player?.seekTo) {
        return;
      }

      beginRemoteApply();

      const { action, currentTime, updatedAt, isPlaying } = payload;
      const shouldPlay =
        action === 'play' || ((action === 'sync' || action === 'seek') && isPlaying);

      if (action === 'load') {
        player.seekTo(0, true);
        player.pauseVideo();
        setNeedsInteraction(true);
        endRemoteApply();
        return;
      }

      const localTime = player.getCurrentTime?.() ?? 0;
      const targetTime =
        shouldPlay || action === 'sync'
          ? getSyncedPlaybackTime(currentTime, shouldPlay || isPlaying, updatedAt)
          : currentTime;

      const drift = Math.abs(localTime - targetTime);
      if (action === 'sync' && drift < DRIFT_SEEK_SECONDS) {
        if (shouldPlay && player.getPlayerState?.() !== PlayerState.PLAYING) {
          player.playVideo();
        } else if (!shouldPlay && player.getPlayerState?.() === PlayerState.PLAYING) {
          player.pauseVideo();
        }
        endRemoteApply();
        return;
      }

      if (drift >= 0.35 || action === 'seek' || action === 'play' || action === 'pause') {
        player.seekTo(targetTime, true);
      }

      if (shouldPlay) {
        player.playVideo();
        window.setTimeout(() => {
          const state = player.getPlayerState?.();
          if (state !== PlayerState.PLAYING && state !== PlayerState.BUFFERING) {
            setNeedsInteraction(true);
          }
        }, 700);
      } else if (action === 'pause' || !isPlaying) {
        player.pauseVideo();
        setNeedsInteraction(false);
      }

      endRemoteApply();
    },
    [beginRemoteApply, endRemoteApply],
  );

  useEffect(() => {
    if (!videoId || !hostRef.current) {
      return undefined;
    }

    let cancelled = false;
    let resizeObserver = null;

    const styleIframe = () => {
      const iframe = hostRef.current?.querySelector('iframe');
      if (!iframe) {
        return;
      }

      iframe.style.position = 'absolute';
      iframe.style.inset = '0';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = '0';
      iframe.removeAttribute('width');
      iframe.removeAttribute('height');
    };

    const createPlayer = async () => {
      const host = hostRef.current;
      if (!host || cancelled || playerRef.current) {
        return;
      }

      try {
        const YT = await loadYouTubeApi();
        if (cancelled || !hostRef.current) {
          return;
        }

        setPlayerError('');
        setIsReady(false);
        host.replaceChildren();

        const mount = document.createElement('div');
        mount.style.width = '100%';
        mount.style.height = '100%';
        host.appendChild(mount);

        playerRef.current = new YT.Player(mount, {
          videoId,
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 0,
            controls: 1,
            rel: 0,
            modestbranding: 1,
            enablejsapi: 1,
            origin: window.location.origin,
            playsinline: 1,
            fs: 1,
            iv_load_policy: 3,
          },
          events: {
            onReady: (event) => {
              if (cancelled) {
                return;
              }

              const player = event.target;
              styleIframe();
              setIsReady(true);

              // Start muted so browsers allow playback; user can unmute via overlay.
              player.mute();
              player.setVolume(100);

              const initialPlayback = playbackRef.current;
              if (initialPlayback?.youtubeVideoId === videoId) {
                const shouldPlay = Boolean(initialPlayback.youtubeIsPlaying);
                applyPlayback({
                  action: shouldPlay ? 'play' : 'load',
                  currentTime: initialPlayback.youtubeCurrentTime ?? 0,
                  updatedAt: initialPlayback.youtubeUpdatedAt,
                  isPlaying: shouldPlay,
                });

                if (shouldPlay) {
                  setNeedsInteraction(true);
                }
              } else {
                setNeedsInteraction(true);
              }
            },
            onStateChange: (event) => {
              if (shouldIgnoreLocalEvents()) {
                return;
              }

              const player = event.target;
              const state = event.data;
              const currentTime = player.getCurrentTime() || 0;

              if (state === PlayerState.PLAYING) {
                setNeedsInteraction(false);
                broadcastPlayback('play', currentTime);
              } else if (state === PlayerState.PAUSED) {
                broadcastPlayback('pause', currentTime);
              }
            },
            onError: () => {
              setPlayerError(
                'This video cannot be embedded. Try another YouTube link, or open the room in Chrome without screen sharing the tab.',
              );
            },
          },
        });

        // YouTube replaces the mount node asynchronously.
        window.setTimeout(styleIframe, 100);
        window.setTimeout(styleIframe, 500);
      } catch {
        if (!cancelled) {
          setPlayerError('Failed to load the YouTube player.');
        }
      }
    };

    resizeObserver = new ResizeObserver(() => {
      styleIframe();
    });
    resizeObserver.observe(hostRef.current);
    createPlayer();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      try {
        playerRef.current?.destroy?.();
      } catch {
        // Player may already be gone.
      }
      playerRef.current = null;
      hostRef.current?.replaceChildren();
      setIsReady(false);
    };
  }, [videoId, applyPlayback, broadcastPlayback, shouldIgnoreLocalEvents]);

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    const handlePlayback = (payload) => {
      if (payload.fromParticipantId === participantId) {
        return;
      }

      if (payload.videoId && payload.videoId !== videoId) {
        return;
      }

      applyPlayback(payload);
    };

    socket.on('youtube:playback', handlePlayback);
    return () => socket.off('youtube:playback', handlePlayback);
  }, [socket, participantId, videoId, applyPlayback]);

  useEffect(() => {
    if (!videoId || !isReady) {
      return undefined;
    }

    let lastTime = playerRef.current?.getCurrentTime?.() || 0;

    const intervalId = window.setInterval(() => {
      const player = playerRef.current;
      if (!player?.getCurrentTime || shouldIgnoreLocalEvents()) {
        return;
      }

      const state = player.getPlayerState?.();
      const currentTime = player.getCurrentTime() || 0;
      const delta = currentTime - lastTime;

      // User scrubbed the timeline (paused or large jump while playing).
      if (
        (state === PlayerState.PAUSED && Math.abs(delta) > 0.8) ||
        (state === PlayerState.PLAYING && Math.abs(delta) > 2.5)
      ) {
        broadcastPlayback('seek', currentTime);
        lastTime = currentTime;
        return;
      }

      if (state === PlayerState.PLAYING) {
        broadcastPlayback('sync', currentTime);
      }

      lastTime = currentTime;
    }, 500);

    return () => clearInterval(intervalId);
  }, [videoId, isReady, broadcastPlayback, shouldIgnoreLocalEvents]);

  const handleEnablePlayback = () => {
    const player = playerRef.current;
    if (!player) {
      return;
    }

    player.unMute();
    player.setVolume(100);
    player.playVideo();
    setNeedsInteraction(false);

    const currentTime = player.getCurrentTime?.() || 0;
    // Force a local play broadcast after user gesture.
    remoteGuardUntilRef.current = 0;
    isApplyingRemoteRef.current = false;
    socket?.emit('youtube:playback', {
      roomId,
      action: 'play',
      currentTime,
      videoId,
    });
  };

  return (
    <div className="absolute inset-0 bg-black">
      <div className="absolute inset-0 overflow-hidden" ref={hostRef} />
      {playerError ? (
        <div className="absolute inset-0 z-20 grid place-items-center bg-[#090d16] px-6 text-center text-sm text-slate-300">
          {playerError}
        </div>
      ) : null}
      {needsInteraction && !playerError ? (
        <button
          className="absolute inset-0 z-10 grid place-items-center bg-black/60 px-6 text-center"
          onClick={handleEnablePlayback}
          type="button"
        >
          <span className="rounded-lg border border-white/20 bg-panel/95 px-6 py-4 text-sm font-semibold text-white shadow-xl">
            Click to play & sync
          </span>
        </button>
      ) : null}
    </div>
  );
}

export default YouTubePlayer;
