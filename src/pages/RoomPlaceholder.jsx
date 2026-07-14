import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo.jsx';
import YouTubePlayer from '../components/YouTubePlayer.jsx';
import {
  getRoom,
  joinRoom,
  sendRoomMessage,
  updateRoomMedia,
} from '../services/api.js';
import { createSocketConnection } from '../services/socket.js';
import { createScreenShareManager } from '../services/screenShare.js';
import { useRoomStore } from '../store/roomStore.js';
import { getYouTubeVideoId } from '../utils/youtube.js';

function RoomPlaceholder() {
  const { roomId } = useParams();
  const guestName = useRoomStore((state) => state.guestName);
  const currentRoom = useRoomStore((state) => state.currentRoom);
  const currentParticipant = useRoomStore((state) => state.currentParticipant);
  const setGuestName = useRoomStore((state) => state.setGuestName);
  const setSession = useRoomStore((state) => state.setSession);
  const updateRoom = useRoomStore((state) => state.updateRoom);
  const [joinName, setJoinName] = useState(guestName);
  const [chatText, setChatText] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isLoadingYoutube, setIsLoadingYoutube] = useState(false);
  const [localScreenStream, setLocalScreenStream] = useState(null);
  const [remoteScreenStream, setRemoteScreenStream] = useState(null);
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [socket, setSocket] = useState(null);
  const videoRef = useRef(null);
  const socketRef = useRef(null);
  const screenShareRef = useRef(null);
  const chatEndRef = useRef(null);
  const inviteLink = useMemo(() => window.location.href, []);
  const isHost = currentParticipant?.id === currentRoom?.hostId;
  const youtubeVideoId =
    currentRoom?.media?.youtubeVideoId ||
    getYouTubeVideoId(currentRoom?.media?.youtubeEmbedUrl ?? '');

  useEffect(() => {
    let isMounted = true;

    getRoom(roomId)
      .then(({ room }) => {
        if (isMounted) {
          updateRoom(room);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [roomId, updateRoom]);

  useEffect(() => {
    if (!currentParticipant) {
      return undefined;
    }

    const socket = createSocketConnection();
    socketRef.current = socket;
    setSocket(socket);
    const manager = createScreenShareManager({
      socket,
      roomId,
      onRemoteStream: setRemoteScreenStream,
      onRemoteStreamEnd: () => setRemoteScreenStream(null),
    });
    screenShareRef.current = manager;

    socket.connect();
    socket.emit('room:join', {
      roomId,
      participant: currentParticipant,
    });
    socket.on('room:updated', ({ room }) => updateRoom(room));
    socket.on('room:error', ({ message }) => setError(message));
    socket.on('webrtc:offer', ({ fromParticipantId, sdp }) => {
      manager.handleOffer(fromParticipantId, sdp).catch((err) => setError(err.message));
    });
    socket.on('webrtc:answer', ({ fromParticipantId, sdp }) => {
      manager.handleAnswer(fromParticipantId, sdp).catch((err) => setError(err.message));
    });
    socket.on('webrtc:ice-candidate', ({ fromParticipantId, candidate }) => {
      manager.handleIceCandidate(fromParticipantId, candidate).catch((err) =>
        setError(err.message),
      );
    });

    return () => {
      manager.stopSharing();
      socket.disconnect();
      socketRef.current = null;
      screenShareRef.current = null;
      setSocket(null);
    };
  }, [roomId, currentParticipant, updateRoom]);

  useEffect(() => {
    if (videoRef.current) {
      const stream = localScreenStream || remoteScreenStream;
      videoRef.current.srcObject = stream;
      videoRef.current.muted = Boolean(localScreenStream);
    }
  }, [localScreenStream, remoteScreenStream]);

  useEffect(() => {
    if (currentRoom?.media?.mode !== 'screen' && !localScreenStream) {
      screenShareRef.current?.stopSharing();
      setRemoteScreenStream(null);
    }
  }, [currentRoom?.media?.mode, localScreenStream]);

  useEffect(() => {
    if (!localScreenStream || !currentRoom || !screenShareRef.current || !currentParticipant) {
      return;
    }

    currentRoom.participants
      .filter((participant) => participant.id !== currentParticipant.id)
      .forEach((participant) => {
        screenShareRef.current.onParticipantJoined(participant.id);
      });
  }, [currentRoom?.participants, localScreenStream, currentParticipant]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentRoom?.messages]);

  const handleJoin = async (event) => {
    event.preventDefault();
    setError('');
    setIsJoining(true);

    try {
      const session = await joinRoom(roomId, joinName);
      setGuestName(joinName);
      setSession(session);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsJoining(false);
    }
  };

  const saveMediaUpdate = async (media) => {
    const response = await updateRoomMedia(roomId, currentParticipant.id, media);
    updateRoom(response.room);
    return response.room;
  };

  const handleLoadYoutube = async (event) => {
    event.preventDefault();
    setError('');

    if (!isHost) {
      setError('Only the host can set the YouTube video.');
      return;
    }

    const videoId = getYouTubeVideoId(youtubeUrl);
    if (!videoId) {
      setError('Paste a valid YouTube link (youtube.com/watch or youtu.be).');
      return;
    }

    setIsLoadingYoutube(true);

    try {
      if (localScreenStream) {
        localScreenStream.getTracks().forEach((track) => track.stop());
        screenShareRef.current?.stopSharing();
        setLocalScreenStream(null);
        setRemoteScreenStream(null);
      }

      const room = await saveMediaUpdate({
        mode: 'youtube',
        youtubeVideoId: videoId,
        youtubeIsPlaying: false,
        youtubeCurrentTime: 0,
        youtubeUpdatedAt: Date.now(),
      });

      socketRef.current?.emit('youtube:playback', {
        roomId,
        action: 'load',
        currentTime: 0,
        videoId: room.media.youtubeVideoId,
      });

      setYoutubeUrl('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoadingYoutube(false);
    }
  };

  const handleClearYoutube = async () => {
    setError('');

    try {
      await saveMediaUpdate({ mode: 'idle' });
    } catch (err) {
      setError(err.message);
    }
  };

  const startScreenShare = async () => {
    setError('');

    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError('Screen sharing is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      const [videoTrack] = stream.getVideoTracks();

      videoTrack.addEventListener('ended', () => {
        screenShareRef.current?.stopSharing();
        setLocalScreenStream(null);
        saveMediaUpdate({ mode: 'idle' }).catch((err) => setError(err.message));
      });

      setLocalScreenStream(stream);
      await saveMediaUpdate({ mode: 'screen' });

      const viewerIds = (currentRoom?.participants ?? [])
        .filter((participant) => participant.id !== currentParticipant.id)
        .map((participant) => participant.id);

      await screenShareRef.current?.startSharing(stream, viewerIds);
    } catch (err) {
      setError(err.name === 'NotAllowedError' ? 'Screen sharing was cancelled.' : err.message);
    }
  };

  const stopScreenShare = async () => {
    localScreenStream?.getTracks().forEach((track) => track.stop());
    screenShareRef.current?.stopSharing();
    setLocalScreenStream(null);
    setRemoteScreenStream(null);
    await saveMediaUpdate({ mode: 'idle' });
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();

    if (!chatText.trim() || !currentParticipant) {
      return;
    }

    try {
      const response = await sendRoomMessage(roomId, currentParticipant.id, chatText);
      updateRoom(response.room);
      setChatText('');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <main className="min-h-screen bg-midnight px-4 py-4 text-slate-100 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-7xl flex-col">
        <header className="flex items-center justify-between py-3">
          <BrandLogo />
          <Link
            className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-white/25 hover:bg-white/10"
            to="/"
          >
            Back
          </Link>
        </header>

        {error ? (
          <div className="my-3 rounded-lg border border-coral/40 bg-coral/10 px-4 py-3 text-sm text-coral">
            {error}
          </div>
        ) : null}

        {!currentParticipant ? (
          <section className="grid flex-1 place-items-center py-12">
            <form
              className="w-full max-w-md rounded-lg border border-white/10 bg-panel/80 p-6 shadow-2xl shadow-black/30"
              onSubmit={handleJoin}
            >
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
                Room {roomId}
              </p>
              <h1 className="mt-4 text-3xl font-bold text-white">Join this watch room</h1>
              <label className="mt-6 block text-sm font-medium text-slate-300" htmlFor="join-name">
                Display name
              </label>
              <input
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.07] px-4 py-3 text-sm font-semibold text-white placeholder:text-slate-500"
                id="join-name"
                maxLength={24}
                onChange={(event) => setJoinName(event.target.value)}
                placeholder="Your name"
                value={joinName}
              />
              <button
                className="mt-4 w-full rounded-lg bg-accent px-5 py-3 text-sm font-bold text-midnight transition hover:bg-[#8dffe2] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isJoining}
                type="submit"
              >
                {isJoining ? 'Joining...' : 'Join Room'}
              </button>
            </form>
          </section>
        ) : (
          <section className="grid flex-1 gap-4 py-4 lg:grid-cols-[1fr_340px]">
            <div className="flex min-w-0 flex-col gap-4">
              <div className="overflow-hidden rounded-lg border border-white/10 bg-black shadow-2xl shadow-black/30">
                <div className="relative aspect-video bg-[#090d16]">
                  {(localScreenStream || remoteScreenStream) ? (
                    <video
                      autoPlay
                      className="h-full w-full bg-black object-contain"
                      muted={Boolean(localScreenStream)}
                      playsInline
                      ref={videoRef}
                    />
                  ) : currentRoom?.media?.mode === 'youtube' && youtubeVideoId ? (
                    <YouTubePlayer
                      participantId={currentParticipant.id}
                      playback={currentRoom.media}
                      roomId={roomId}
                      socket={socket}
                      videoId={youtubeVideoId}
                    />
                  ) : currentRoom?.media?.mode === 'screen' ? (
                    <div className="grid h-full place-items-center px-6 text-center text-slate-300">
                      <div>
                        <p className="text-xl font-semibold text-white">Connecting to screen share</p>
                        <p className="mt-2 text-sm">
                          {currentRoom.media.sharedBy
                            ? `Waiting for ${currentRoom.media.sharedBy}'s stream...`
                            : 'Waiting for the shared screen...'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid h-full place-items-center px-6 text-center text-slate-400">
                      <div>
                        <p className="text-xl font-semibold text-white">Nothing is playing yet</p>
                        <p className="mt-2 text-sm">
                          {isHost
                            ? 'Paste a YouTube link below, or share your screen.'
                            : 'Waiting for the host to start a video or share a screen.'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-panel/80 p-4">
                {isHost ? (
                  <form className="mb-4 flex flex-col gap-3 sm:flex-row" onSubmit={handleLoadYoutube}>
                    <label className="sr-only" htmlFor="youtube-url">
                      YouTube link
                    </label>
                    <input
                      className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.07] px-4 py-3 text-sm text-white placeholder:text-slate-500"
                      id="youtube-url"
                      onChange={(event) => setYoutubeUrl(event.target.value)}
                      placeholder="Paste a YouTube link to watch together"
                      type="url"
                      value={youtubeUrl}
                    />
                    <button
                      className="rounded-lg bg-accent px-5 py-3 text-sm font-bold text-midnight transition hover:bg-[#8dffe2] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isLoadingYoutube || !youtubeUrl.trim()}
                      type="submit"
                    >
                      {isLoadingYoutube ? 'Loading...' : 'Play YouTube'}
                    </button>
                    {currentRoom?.media?.mode === 'youtube' ? (
                      <button
                        className="rounded-lg border border-white/10 px-5 py-3 text-sm font-bold text-white transition hover:border-white/25 hover:bg-white/10"
                        onClick={handleClearYoutube}
                        type="button"
                      >
                        Clear
                      </button>
                    ) : null}
                  </form>
                ) : currentRoom?.media?.mode === 'youtube' ? (
                  <p className="mb-4 text-sm text-slate-400">
                    Anyone can pause, play, or scrub the timeline — playback stays synced over
                    WebSockets.
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-3">
                  <button
                    className="rounded-lg bg-accent px-5 py-3 text-sm font-bold text-midnight transition hover:bg-[#8dffe2]"
                    onClick={localScreenStream ? stopScreenShare : startScreenShare}
                    type="button"
                  >
                    {localScreenStream ? 'Stop Sharing' : 'Share Screen'}
                  </button>
                  <button
                    className="rounded-lg border border-white/10 px-5 py-3 text-sm font-bold text-white transition hover:border-white/25 hover:bg-white/10"
                    onClick={() => navigator.clipboard.writeText(inviteLink)}
                    type="button"
                  >
                    Copy Invite Link
                  </button>
                </div>
              </div>
            </div>

            <aside className="grid min-h-[560px] gap-4 lg:grid-rows-[auto_1fr]">
              <div className="rounded-lg border border-white/10 bg-panel/80 p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-white">Participants</h2>
                  {isHost ? (
                    <span className="rounded-full bg-accent/15 px-2 py-1 text-xs font-semibold text-accent">
                      Host
                    </span>
                  ) : null}
                </div>
                <div className="mt-4 space-y-3">
                  {currentRoom?.participants?.map((participant) => (
                    <div
                      className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-3"
                      key={participant.id}
                    >
                      <span className="truncate text-sm font-medium text-white">
                        {participant.name}
                      </span>
                      <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-slate-300">
                        {participant.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex min-h-0 flex-col rounded-lg border border-white/10 bg-panel/80 p-5">
                <h2 className="text-lg font-semibold text-white">Chat</h2>
                <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                  {currentRoom?.messages?.length ? (
                    currentRoom.messages.map((message) => (
                      <div className="rounded-lg bg-white/[0.06] px-3 py-2" key={message.id}>
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-semibold text-white">
                            {message.username}
                          </p>
                          <time className="shrink-0 text-xs text-slate-500">
                            {new Date(message.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </time>
                        </div>
                        <p className="mt-1 break-words text-sm leading-6 text-slate-300">
                          {message.text}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No messages yet.</p>
                  )}
                  <div ref={chatEndRef} />
                </div>
                <form className="mt-4 flex gap-2" onSubmit={handleSendMessage}>
                  <label className="sr-only" htmlFor="chat-message">
                    Message
                  </label>
                  <input
                    className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.07] px-3 py-3 text-sm text-white placeholder:text-slate-500"
                    id="chat-message"
                    maxLength={500}
                    onChange={(event) => setChatText(event.target.value)}
                    placeholder="Message room"
                    value={chatText}
                  />
                  <button
                    className="rounded-lg bg-accent px-4 py-3 text-sm font-bold text-midnight transition hover:bg-[#8dffe2]"
                    type="submit"
                  >
                    Send
                  </button>
                </form>
              </div>
            </aside>
          </section>
        )}
      </div>
    </main>
  );
}

export default RoomPlaceholder;
