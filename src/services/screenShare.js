const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

export function createScreenShareManager({
  socket,
  roomId,
  onRemoteStream,
  onRemoteStreamEnd,
}) {
  let localStream = null;
  const peerConnections = new Map();
  let viewerPeerConnection = null;
  const pendingCandidates = new Map();

  function queueCandidate(participantId, candidate) {
    if (!pendingCandidates.has(participantId)) {
      pendingCandidates.set(participantId, []);
    }

    pendingCandidates.get(participantId).push(candidate);
  }

  async function flushPendingCandidates(participantId, pc) {
    const queued = pendingCandidates.get(participantId) || [];
    pendingCandidates.delete(participantId);

    for (const candidate of queued) {
      await pc.addIceCandidate(candidate);
    }
  }

  function createPeerConnection(remoteParticipantId, isInitiator) {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc:ice-candidate', {
          roomId,
          toParticipantId: remoteParticipantId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      if (!isInitiator) {
        onRemoteStream?.(event.streams[0]);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        if (!isInitiator) {
          onRemoteStreamEnd?.();
        }
      }
    };

    return pc;
  }

  async function connectToViewer(viewerParticipantId) {
    if (!localStream || peerConnections.has(viewerParticipantId)) {
      return;
    }

    const pc = createPeerConnection(viewerParticipantId, true);

    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    peerConnections.set(viewerParticipantId, pc);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.emit('webrtc:offer', {
      roomId,
      toParticipantId: viewerParticipantId,
      sdp: offer,
    });
  }

  async function startSharing(stream, viewerParticipantIds) {
    localStream = stream;

    for (const viewerId of viewerParticipantIds) {
      await connectToViewer(viewerId);
    }
  }

  async function handleOffer(fromParticipantId, sdp) {
    if (viewerPeerConnection) {
      viewerPeerConnection.close();
    }

    viewerPeerConnection = createPeerConnection(fromParticipantId, false);
    await viewerPeerConnection.setRemoteDescription(sdp);
    await flushPendingCandidates(fromParticipantId, viewerPeerConnection);

    const answer = await viewerPeerConnection.createAnswer();
    await viewerPeerConnection.setLocalDescription(answer);

    socket.emit('webrtc:answer', {
      roomId,
      toParticipantId: fromParticipantId,
      sdp: answer,
    });
  }

  async function handleAnswer(fromParticipantId, sdp) {
    const pc = peerConnections.get(fromParticipantId);
    if (!pc) {
      return;
    }

    await pc.setRemoteDescription(sdp);
    await flushPendingCandidates(fromParticipantId, pc);
  }

  async function handleIceCandidate(fromParticipantId, candidate) {
    const pc = peerConnections.get(fromParticipantId) || viewerPeerConnection;
    if (!pc || !candidate) {
      return;
    }

    if (!pc.remoteDescription) {
      queueCandidate(fromParticipantId, candidate);
      return;
    }

    await pc.addIceCandidate(candidate);
  }

  function stopSharing() {
    localStream = null;
    peerConnections.forEach((pc) => pc.close());
    peerConnections.clear();
    pendingCandidates.clear();

    if (viewerPeerConnection) {
      viewerPeerConnection.close();
      viewerPeerConnection = null;
    }

    onRemoteStreamEnd?.();
  }

  function onParticipantJoined(participantId) {
    if (localStream) {
      connectToViewer(participantId).catch(() => {});
    }
  }

  return {
    startSharing,
    stopSharing,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    onParticipantJoined,
  };
}
