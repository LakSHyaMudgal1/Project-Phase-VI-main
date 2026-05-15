import React, { useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Editor, { useMonaco } from "@monaco-editor/react";
import { BASE_URL } from "../utils/constants";
import { socket } from "../utils/socket";
import Button from "./ui/Button";
import Input from "./ui/Input";

/* ── helpers ─────────────────────────────────────────── */
const fmt = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const ICE_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

const USER_COLORS = [
  "#4f8ef7","#10b981","#f59e0b","#ef4444",
  "#8b5cf6","#ec4899","#14b8a6","#f97316",
];
const getColor = (name) =>
  USER_COLORS[(name?.charCodeAt(0) || 0) % USER_COLORS.length];

const LANGUAGES = [
  "javascript","typescript","python","java","cpp","c",
  "go","rust","html","css","json","markdown",
];

/* ── RemoteVideo tile ────────────────────────────────── */
// Uses a callback ref so srcObject is set the moment the <video> element
// mounts, regardless of whether the stream arrived before or after mount.
const RemoteVideo = ({ stream, name }) => {
  const videoRef = useRef(null);

  // Callback ref: called with the DOM node when it mounts/unmounts
  const setVideoRef = useCallback(
    (node) => {
      videoRef.current = node;
      if (node && stream) {
        node.srcObject = stream;
        node.play().catch(() => {});
      }
    },
    [stream]
  );

  // Also react if stream object itself changes after mount
  useEffect(() => {
    const node = videoRef.current;
    if (node && stream) {
      node.srcObject = stream;
      node.play().catch(() => {});
    }
  }, [stream]);

  return (
    <div className="relative rounded-xl overflow-hidden bg-black border border-white/10 aspect-video flex-shrink-0">
      {/* Remote video must NOT be muted — we want to hear the other person */}
      <video
        ref={setVideoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
      {/* Fallback avatar shown while video track loads */}
      {!stream && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0d1117]">
          <div
            className="h-10 w-10 rounded-xl grid place-items-center text-lg font-bold text-white"
            style={{ background: "#4f8ef7" }}
          >
            {name?.[0]?.toUpperCase() || "?"}
          </div>
        </div>
      )}
      <div className="absolute bottom-1.5 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-black/60 text-white">
        {name || "Peer"}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   MAIN ROOM COMPONENT
═══════════════════════════════════════════════════════ */
const Room = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const currentUser = useSelector((s) => s.user);
  const monaco = useMonaco();

  /* ── room meta ───────────────────────────────────── */
  const [room, setRoom] = useState(null);
  const [activity, setActivity] = useState([]);
  const [email, setEmail] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [roomDeleted, setRoomDeleted] = useState(false);

  /* ── chat ────────────────────────────────────────── */
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [typingUsers, setTypingUsers] = useState([]);
  const chatEndRef = useRef(null);
  const chatScrollRef = useRef(null); // ref on the scrollable container
  const typingTimerRef = useRef(null);

  /* ── code editor ─────────────────────────────────── */
  const [code, setCode] = useState("// Start coding together...\n");
  const [language, setLanguage] = useState("javascript");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isRemoteUpdate = useRef(false);
  const editorRef = useRef(null);
  const editorContainerRef = useRef(null);
  const decorationsRef = useRef({});
  const remoteCursors = useRef({});

  /* ── screen share ────────────────────────────────── */
  const [sharing, setSharing] = useState(false);
  const [viewingShare, setViewingShare] = useState(false);
  const [shareError, setShareError] = useState("");
  const localShareStreamRef = useRef(null);
  const sharePcRef = useRef(null);
  const viewerPcRef = useRef(null);
  const remoteShareVideoRef = useRef(null);

  /* ── video call ──────────────────────────────────── */
  const [inCall, setInCall] = useState(false);
  const [localVideoEnabled, setLocalVideoEnabled] = useState(true);
  const [localAudioEnabled, setLocalAudioEnabled] = useState(true);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const localCallStreamRef = useRef(null);
  const callPeersRef = useRef({});
  const localVideoElRef = useRef(null);

  /* ── sidebar panel (right) ───────────────────────── */
  const [rightPanel, setRightPanel] = useState("chat"); // "chat" | "members"

  /* ── panel collapse states ───────────────────────── */
  const [videoCollapsed, setVideoCollapsed] = useState(false);
  const [editorCollapsed, setEditorCollapsed] = useState(false);

  /* ── fetch room data ─────────────────────────────── */
  const fetchRoom = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE_URL}/room/get/${roomId}`, {
        withCredentials: true,
      });
      setRoom(res.data.data);
    } catch (err) {
      console.error(err);
    }
  }, [roomId]);

  const fetchActivity = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE_URL}/room/activity/${roomId}`, {
        withCredentials: true,
      });
      setActivity(res.data.data);
    } catch (err) {
      console.error(err);
    }
  }, [roomId]);

  /* ── load chat history on mount ──────────────────── */
  const fetchMessages = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE_URL}/room/messages/${roomId}`, {
        withCredentials: true,
      });
      const history = res.data.data.map((m) => ({
        sender: m.senderName,
        senderId: m.senderId,
        message: m.message,
        timestamp: m.createdAt,
      }));
      setMessages(history);
    } catch (err) {
      console.error(err);
    }
  }, [roomId]);

  /* ── load saved code on mount ────────────────────── */
  const fetchCode = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE_URL}/room/code/${roomId}`, {
        withCredentials: true,
      });
      const session = res.data.data;
      if (session) {
        setCode(session.currentCode || "// Start coding together...\n");
        setLanguage(session.language || "javascript");
      }
    } catch (err) {
      console.error(err);
    }
  }, [roomId]);

  /* ── invite ──────────────────────────────────────── */
  const handleInvite = async () => {
    if (!email) return;
    try {
      await axios.post(
        `${BASE_URL}/room/invite`,
        { roomId, emailId: email },
        { withCredentials: true }
      );
      setEmail("");
      setShowInvite(false);
    } catch (err) {
      console.error(err.response?.data);
    }
  };

  /* ── leave room ──────────────────────────────────── */
  const handleLeave = async () => {
    stopShare();
    if (inCall) leaveCall();
    try {
      await axios.post(
        `${BASE_URL}/room/leave`,
        { roomId },
        { withCredentials: true }
      );
      navigate("/");
    } catch (err) {
      console.error(err.response?.data);
    }
  };

  /* ── delete room (owner only) ────────────────────── */
  const handleDeleteRoom = async () => {
    if (!window.confirm("Delete this room permanently? All chats and code will be lost.")) return;
    try {
      await axios.delete(`${BASE_URL}/room/delete/${roomId}`, {
        withCredentials: true,
      });
      navigate("/");
    } catch (err) {
      console.error(err.response?.data);
    }
  };

  /* ── remove member (owner only) ──────────────────── */
  const handleRemoveMember = async (userId) => {
    try {
      await axios.post(
        `${BASE_URL}/room/remove-member`,
        { roomId, userId },
        { withCredentials: true }
      );
    } catch (err) {
      console.error(err.response?.data);
    }
  };

  /* ── chat ────────────────────────────────────────── */
  const sendMessage = () => {
    if (!chatInput.trim()) return;
    socket.emit("chatMessage", {
      roomId,
      message: chatInput.trim(),
      sender: currentUser?.firstName || "You",
      senderId: currentUser?._id,
    });
    setChatInput("");
    socket.emit("stopTyping", { roomId, sender: currentUser?.firstName });
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
  };

  const handleChatKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
      return;
    }
    // Typing indicator
    socket.emit("typing", { roomId, sender: currentUser?.firstName });
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socket.emit("stopTyping", { roomId, sender: currentUser?.firstName });
    }, 2000);
  };

  // Smart auto-scroll: only scroll to bottom if user is already near the bottom.
  // This prevents hijacking scroll position when user is reading old messages.
  useEffect(() => {
    const container = chatScrollRef.current;
    if (!container) return;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    // Only auto-scroll if within 80px of the bottom
    if (distanceFromBottom < 80) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, typingUsers]);

  /* ── code editor ─────────────────────────────────── */
  const handleCodeChange = (value) => {
    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }
    setCode(value);
    socket.emit("codeUpdate", { roomId, code: value, language });
  };

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    socket.emit("codeUpdate", { roomId, code, language: lang });
  };

  // Inject CSS for remote cursor labels
  useEffect(() => {
    if (!monaco) return;
    if (document.getElementById("remote-cursor-styles")) return;
    const style = document.createElement("style");
    style.id = "remote-cursor-styles";
    style.textContent = `
      .remote-cursor-label {
        font-size: 10px; font-weight: 600; padding: 1px 5px;
        border-radius: 3px; pointer-events: none; white-space: nowrap;
        position: absolute; top: -18px; z-index: 100;
      }
      .remote-cursor-line { border-left: 2px solid; margin-left: -1px; }
    `;
    document.head.appendChild(style);
  }, [monaco]);

  const applyRemoteCursor = useCallback(
    ({ socketId, sender, color, cursor }) => {
      const editor = editorRef.current;
      if (!editor || !monaco) return;
      const { lineNumber, column } = cursor;
      const oldDecorations = decorationsRef.current[socketId] || [];
      const newDecorations = editor.deltaDecorations(oldDecorations, [
        {
          range: new monaco.Range(lineNumber, column, lineNumber, column + 1),
          options: {
            className: "remote-cursor-line",
            stickiness:
              monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
            zIndex: 100,
            after: {
              content: sender,
              inlineClassName: "remote-cursor-label",
            },
          },
        },
      ]);
      decorationsRef.current[socketId] = newDecorations;
      const styleId = `cursor-color-${socketId.replace(/[^a-z0-9]/gi, "")}`;
      let el = document.getElementById(styleId);
      if (!el) {
        el = document.createElement("style");
        el.id = styleId;
        document.head.appendChild(el);
      }
      el.textContent = `
        .remote-cursor-line { border-color: ${color}; }
        .remote-cursor-label { background: ${color}; color: #fff; }
      `;
    },
    [monaco]
  );

  const onEditorMount = (editor) => {
    editorRef.current = editor;
    editor.onDidChangeCursorPosition((e) => {
      socket.emit("cursorUpdate", {
        roomId,
        cursor: {
          lineNumber: e.position.lineNumber,
          column: e.position.column,
        },
        sender: currentUser?.firstName || "Me",
        color: getColor(currentUser?.firstName),
      });
    });
  };

  /* ── fullscreen ──────────────────────────────────── */
  const toggleFullscreen = () => {
    const el = editorContainerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  /* ── screen share ────────────────────────────────── */
  const startShare = async () => {
    setShareError("");
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        setShareError("Screen sharing requires HTTPS or localhost.");
        return;
      }
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      localShareStreamRef.current = stream;
      setSharing(true);
      stream.getVideoTracks()[0].onended = stopShare;

      const pc = new RTCPeerConnection(ICE_CONFIG);
      sharePcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      pc.onicecandidate = ({ candidate }) => {
        if (candidate)
          socket.emit("iceCandidate", { roomId, candidate, to: null });
      };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("screenShareOffer", { roomId, offer });
    } catch (err) {
      if (err.name === "NotAllowedError") setShareError("Permission denied.");
      else setShareError(`Failed: ${err.message}`);
    }
  };

  const stopShare = () => {
    localShareStreamRef.current?.getTracks().forEach((t) => t.stop());
    localShareStreamRef.current = null;
    sharePcRef.current?.close();
    sharePcRef.current = null;
    setSharing(false);
    socket.emit("screenShareStopped", { roomId });
  };

  /* ── video call ──────────────────────────────────── */
  // IMPORTANT: createPeerConnection must NOT be inside useCallback with deps,
  // because it's called from inside socket handlers that are registered once.
  // We use a ref to hold the latest version so socket handlers always call
  // the current implementation without stale closures.
  const createPeerConnectionRef = useRef(null);
  createPeerConnectionRef.current = (remoteSocketId, remoteName) => {
    // Close any existing connection to this peer before creating a new one
    if (callPeersRef.current[remoteSocketId]?.pc) {
      callPeersRef.current[remoteSocketId].pc.close();
    }

    const pc = new RTCPeerConnection(ICE_CONFIG);

    // Add all local tracks to the peer connection
    const localStream = localCallStreamRef.current;
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
    }

    // ICE candidate relay
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        socket.emit("videoIceCandidate", { to: remoteSocketId, candidate });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] ICE state with ${remoteSocketId}: ${pc.iceConnectionState}`);
      if (pc.iceConnectionState === "failed") {
        pc.restartIce?.();
      }
    };

    // ontrack: fires when remote media arrives
    pc.ontrack = (event) => {
      console.log(`[WebRTC] ontrack from ${remoteSocketId}`, event.streams);
      // event.streams[0] is the remote MediaStream
      const stream = event.streams[0];
      if (!stream) return;

      // Update the ref immediately
      callPeersRef.current[remoteSocketId] = {
        ...callPeersRef.current[remoteSocketId],
        stream,
      };

      // Update React state so RemoteVideo re-renders with the stream
      setRemoteStreams((prev) => {
        const exists = prev.find((s) => s.socketId === remoteSocketId);
        if (exists) {
          return prev.map((s) =>
            s.socketId === remoteSocketId
              ? { ...s, stream }
              : s
          );
        }
        return [...prev, { socketId: remoteSocketId, stream, name: remoteName }];
      });
    };

    // Store the peer connection
    callPeersRef.current[remoteSocketId] = {
      ...(callPeersRef.current[remoteSocketId] || {}),
      pc,
      name: remoteName,
    };

    return pc;
  };

  // Stable wrapper that always calls the latest version
  const createPeerConnection = useCallback((remoteSocketId, remoteName) => {
    return createPeerConnectionRef.current(remoteSocketId, remoteName);
  }, []);

  const joinCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localCallStreamRef.current = stream;
      // Attach to local video element immediately
      if (localVideoElRef.current) {
        localVideoElRef.current.srcObject = stream;
        localVideoElRef.current.play().catch(() => {});
      }
      setInCall(true);
      socket.emit("videoCallJoin", {
        roomId,
        userName: currentUser?.firstName || "User",
        userId: currentUser?._id,
      });
    } catch (err) {
      console.error("Camera/mic error:", err);
      alert(`Could not access camera/mic: ${err.message}`);
    }
  };

  const leaveCall = useCallback(() => {
    localCallStreamRef.current?.getTracks().forEach((t) => t.stop());
    localCallStreamRef.current = null;
    Object.values(callPeersRef.current).forEach(({ pc }) => pc?.close());
    callPeersRef.current = {};
    setRemoteStreams([]);
    setInCall(false);
    socket.emit("videoCallLeave", { roomId });
  }, [roomId]);

  const toggleVideo = () => {
    const track = localCallStreamRef.current?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setLocalVideoEnabled(track.enabled);
    }
  };

  const toggleAudio = () => {
    const track = localCallStreamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setLocalAudioEnabled(track.enabled);
    }
  };

  // Callback ref for local video element — attaches stream the moment the
  // element mounts (e.g. when video panel is expanded after joining call)
  const setLocalVideoRef = useCallback((node) => {
    localVideoElRef.current = node;
    if (node && localCallStreamRef.current) {
      node.srcObject = localCallStreamRef.current;
      node.play().catch(() => {});
    }
  }, []);

  // Also re-attach if inCall changes (e.g. stream set before element mounted)
  useEffect(() => {
    if (inCall && localVideoElRef.current && localCallStreamRef.current) {
      localVideoElRef.current.srcObject = localCallStreamRef.current;
      localVideoElRef.current.play().catch(() => {});
    }
  }, [inCall, videoCollapsed]); // re-run when panel is expanded

  /* ── pending ICE candidate queue ────────────────────
     ICE candidates can arrive before setRemoteDescription is called.
     We queue them and drain once the remote description is set.
  ────────────────────────────────────────────────── */
  const pendingIceCandidates = useRef({}); // { socketId: RTCIceCandidateInit[] }

  const addIceCandidate = useCallback(async (socketId, candidate) => {
    const peer = callPeersRef.current[socketId];
    if (!peer?.pc) return;

    if (peer.pc.remoteDescription) {
      // Remote description already set — add immediately
      try {
        await peer.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn("[WebRTC] addIceCandidate error:", e.message);
      }
    } else {
      // Queue for later
      if (!pendingIceCandidates.current[socketId]) {
        pendingIceCandidates.current[socketId] = [];
      }
      pendingIceCandidates.current[socketId].push(candidate);
    }
  }, []);

  const drainIceCandidates = useCallback(async (socketId) => {
    const queued = pendingIceCandidates.current[socketId] || [];
    delete pendingIceCandidates.current[socketId];
    const peer = callPeersRef.current[socketId];
    if (!peer?.pc) return;
    for (const candidate of queued) {
      try {
        await peer.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn("[WebRTC] drainIceCandidate error:", e.message);
      }
    }
  }, []);
  useEffect(() => {
    // Join the socket room, passing user identity
    socket.emit("joinRoom", {
      roomId,
      userId: currentUser?._id,
      userName: currentUser?.firstName,
    });

    // Room activity updates
    socket.on("roomUpdate", (data) => {
      setActivity((prev) => [...prev, { message: data.message }]);
      fetchRoom();
    });

    // Room deleted by owner
    socket.on("roomDeleted", () => {
      setRoomDeleted(true);
    });

    // Member removed by owner
    socket.on("memberRemoved", ({ userId }) => {
      if (userId === currentUser?._id) {
        navigate("/");
      } else {
        fetchRoom();
      }
    });

    // Chat messages — deduplicate own messages (server echoes back)
    socket.on("chatMessage", (data) => {
      setMessages((prev) => {
        // Avoid duplicate if we already added it optimistically
        const last = prev[prev.length - 1];
        if (
          last &&
          last.sender === data.sender &&
          last.message === data.message &&
          Math.abs(new Date(last.timestamp) - new Date(data.timestamp)) < 500
        ) {
          return prev;
        }
        return [...prev, data];
      });
    });

    // Typing indicators
    socket.on("typing", ({ sender }) => {
      if (sender === currentUser?.firstName) return;
      setTypingUsers((prev) =>
        prev.includes(sender) ? prev : [...prev, sender]
      );
    });
    socket.on("stopTyping", ({ sender }) => {
      setTypingUsers((prev) => prev.filter((s) => s !== sender));
    });

    // Collaborative code
    socket.on("codeUpdate", ({ code: incoming, language: lang }) => {
      isRemoteUpdate.current = true;
      setCode(incoming);
      if (lang) setLanguage(lang);
    });

    // Remote cursors
    socket.on("cursorUpdate", ({ cursor, sender, color, socketId }) => {
      remoteCursors.current[socketId] = { cursor, sender, color };
      applyRemoteCursor({ socketId, sender, color, cursor });
    });

    // Screen share signaling
    socket.on("screenShareOffer", async ({ offer, from }) => {
      setViewingShare(true);
      const pc = new RTCPeerConnection(ICE_CONFIG);
      viewerPcRef.current = pc;
      pc.onicecandidate = ({ candidate }) => {
        if (candidate)
          socket.emit("iceCandidate", { roomId, candidate, to: from });
      };
      pc.ontrack = ({ streams }) => {
        if (remoteShareVideoRef.current && streams[0]) {
          remoteShareVideoRef.current.srcObject = streams[0];
          remoteShareVideoRef.current.play().catch(() => {});
        }
      };
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("screenShareAnswer", { to: from, answer });
    });

    socket.on("screenShareAnswer", async ({ answer }) => {
      if (sharePcRef.current)
        await sharePcRef.current.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
    });

    socket.on("iceCandidate", async ({ candidate }) => {
      const pc = sharePcRef.current || viewerPcRef.current;
      if (pc && candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch {}
      }
    });

    socket.on("screenShareStopped", () => {
      setViewingShare(false);
      viewerPcRef.current?.close();
      viewerPcRef.current = null;
      if (remoteShareVideoRef.current)
        remoteShareVideoRef.current.srcObject = null;
    });

    // Video call — existing participants list (sent when we join)
    socket.on("existingCallParticipants", async ({ participants }) => {
      if (!localCallStreamRef.current) return;
      for (const { socketId, userName } of participants) {
        const pc = createPeerConnection(socketId, userName);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("videoOffer", {
          to: socketId,
          offer,
          userName: currentUser?.firstName || "User",
          userId: currentUser?._id,
        });
      }
    });

    // New peer joined the call — we initiate offer
    socket.on("videoCallUserJoined", async ({ socketId, userName }) => {
      if (!localCallStreamRef.current) return;
      const pc = createPeerConnection(socketId, userName);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("videoOffer", {
        to: socketId,
        offer,
        userName: currentUser?.firstName || "User",
        userId: currentUser?._id,
      });
    });

    socket.on("videoCallUserLeft", ({ socketId }) => {
      callPeersRef.current[socketId]?.pc?.close();
      delete callPeersRef.current[socketId];
      delete pendingIceCandidates.current[socketId];
      setRemoteStreams((prev) => prev.filter((s) => s.socketId !== socketId));
    });

    socket.on("videoOffer", async ({ from, offer, userName }) => {
      if (!localCallStreamRef.current) return;
      const pc = createPeerConnection(from, userName);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      // Drain any ICE candidates that arrived before remote description was set
      await drainIceCandidates(from);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("videoAnswer", { to: from, answer });
    });

    socket.on("videoAnswer", async ({ from, answer }) => {
      const peer = callPeersRef.current[from];
      if (peer?.pc) {
        await peer.pc.setRemoteDescription(new RTCSessionDescription(answer));
        // Drain queued ICE candidates now that remote description is set
        await drainIceCandidates(from);
      }
    });

    socket.on("videoIceCandidate", async ({ from, candidate }) => {
      await addIceCandidate(from, candidate);
    });

    // Load initial data
    fetchRoom();
    fetchActivity();
    fetchMessages();
    fetchCode();

    return () => {
      [
        "roomUpdate","roomDeleted","memberRemoved",
        "chatMessage","typing","stopTyping",
        "codeUpdate","cursorUpdate",
        "screenShareOffer","screenShareAnswer","iceCandidate","screenShareStopped",
        "existingCallParticipants","videoCallUserJoined","videoCallUserLeft",
        "videoOffer","videoAnswer","videoIceCandidate",
      ].forEach((e) => socket.off(e));

      stopShare();
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  /* ── room deleted screen ─────────────────────────── */
  if (roomDeleted) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center">
        <div className="text-4xl">🗑️</div>
        <h2 className="text-xl font-semibold">Room Deleted</h2>
        <p className="text-sm text-mutedForeground">
          The room owner has deleted this room.
        </p>
        <Button onClick={() => navigate("/")}>Go Home</Button>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex items-center justify-center h-64 text-mutedForeground text-sm">
        Loading room...
      </div>
    );
  }

  const isOwner = room.owner?._id === currentUser?._id;

  /* ════════════════════════════════════════════════════
     RENDER — Unified Workspace Layout
     ┌──────────────────────────────────────────────────┐
     │  HEADER — room name + controls                   │
     ├──────────────┬───────────────────────┬───────────┤
     │  LEFT        │  CENTER               │  RIGHT    │
     │  Video Call  │  Code Editor          │  Chat     │
     │  (collapsible│  (main area)          │  Sidebar  │
     │  sidebar)    │                       │           │
     └──────────────┴───────────────────────┴───────────┘
  ════════════════════════════════════════════════════ */
  return (
    <div className="flex flex-col h-[calc(100vh-80px)] gap-0 overflow-hidden">

      {/* ── HEADER ─────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 grid place-items-center text-sm">
            🏠
          </div>
          <div>
            <h1 className="text-base font-semibold leading-tight">
              {room.name || "Room"}
            </h1>
            <p className="text-[11px] text-mutedForeground">
              {room.members.length} online
              {inCall && (
                <span className="ml-2 text-green-400">
                  · 📹 In call ({remoteStreams.length + 1})
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Screen share toggle */}
          {sharing ? (
            <Button variant="danger" size="sm" onClick={stopShare}>
              ⏹ Stop Share
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={startShare}>
              🖥️ Share Screen
            </Button>
          )}
          {shareError && (
            <span className="text-xs text-red-400">{shareError}</span>
          )}

          {/* Invite */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowInvite((v) => !v)}
          >
            ✉️ Invite
          </Button>

          {/* Activity log */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowActivity((v) => !v)}
          >
            📋 Log
          </Button>

          {/* Delete room (owner only) */}
          {isOwner && (
            <Button variant="danger" size="sm" onClick={handleDeleteRoom}>
              🗑️ Delete Room
            </Button>
          )}

          {/* Leave */}
          <Button variant="danger" size="sm" onClick={handleLeave}>
            ← Leave
          </Button>
        </div>
      </div>

      {/* ── INVITE POPOVER ─────────────────────────── */}
      {showInvite && (
        <div className="px-4 py-3 border-b border-white/10 bg-white/3 flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-mutedForeground">Invite by email:</span>
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@email.com"
            onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            className="max-w-xs"
          />
          <Button size="sm" onClick={handleInvite}>
            Send
          </Button>
          <button
            onClick={() => setShowInvite(false)}
            className="text-xs text-mutedForeground hover:text-foreground ml-auto"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── ACTIVITY LOG POPOVER ───────────────────── */}
      {showActivity && (
        <div className="px-4 py-3 border-b border-white/10 bg-white/3 flex-shrink-0 max-h-32 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold">Activity Log</span>
            <button
              onClick={() => setShowActivity(false)}
              className="text-xs text-mutedForeground hover:text-foreground"
            >
              ✕
            </button>
          </div>
          {activity.length === 0 ? (
            <p className="text-xs text-mutedForeground">No activity yet.</p>
          ) : (
            [...activity].reverse().map((a, i) => (
              <p key={i} className="text-xs text-mutedForeground">
                {a.message}
              </p>
            ))
          )}
        </div>
      )}

      {/* ── SCREEN SHARE VIEWER ────────────────────── */}
      {viewingShare && (
        <div className="px-4 py-2 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse inline-block" />
            <span className="text-xs font-semibold">Live Screen Share</span>
            <Button
              variant="secondary"
              size="sm"
              className="ml-auto"
              onClick={() => remoteShareVideoRef.current?.requestFullscreen?.()}
            >
              ⛶ Fullscreen
            </Button>
          </div>
          <video
            ref={remoteShareVideoRef}
            autoPlay
            playsInline
            className="w-full rounded-xl bg-black max-h-48 object-contain"
            onDoubleClick={() =>
              remoteShareVideoRef.current?.requestFullscreen?.()
            }
          />
        </div>
      )}

      {/* ── MAIN 3-COLUMN WORKSPACE ────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── LEFT: VIDEO CALL SIDEBAR ─────────────── */}
        <div
          className={`flex flex-col border-r border-white/10 transition-all duration-300 flex-shrink-0 ${
            videoCollapsed ? "w-10" : "w-64"
          }`}
        >
          {/* Collapse toggle */}
          <button
            onClick={() => setVideoCollapsed((v) => !v)}
            className="flex items-center justify-between px-3 py-2 border-b border-white/10 text-xs text-mutedForeground hover:text-foreground hover:bg-white/5 transition flex-shrink-0"
            title={videoCollapsed ? "Expand video panel" : "Collapse video panel"}
          >
            {!videoCollapsed && (
              <span className="font-semibold text-foreground">📹 Video Call</span>
            )}
            <span className={videoCollapsed ? "mx-auto" : ""}>
              {videoCollapsed ? "▶" : "◀"}
            </span>
          </button>

          {!videoCollapsed && (
            <div className="flex flex-col flex-1 overflow-y-auto p-2 gap-2">
              {!inCall ? (
                <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center px-2">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 grid place-items-center text-2xl">
                    📹
                  </div>
                  <p className="text-xs text-mutedForeground">
                    Join to video call with everyone in the room.
                  </p>
                  <Button size="sm" onClick={joinCall} className="w-full">
                    Join Call
                  </Button>
                </div>
              ) : (
                <>
                  {/* Call controls */}
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={toggleVideo}
                      title={localVideoEnabled ? "Turn off camera" : "Turn on camera"}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-medium border transition ${
                        localVideoEnabled
                          ? "bg-white/5 border-white/10 text-foreground hover:bg-white/10"
                          : "bg-red-500/10 border-red-500/30 text-red-400"
                      }`}
                    >
                      {localVideoEnabled ? "📷" : "📷✕"}
                    </button>
                    <button
                      onClick={toggleAudio}
                      title={localAudioEnabled ? "Mute" : "Unmute"}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-medium border transition ${
                        localAudioEnabled
                          ? "bg-white/5 border-white/10 text-foreground hover:bg-white/10"
                          : "bg-red-500/10 border-red-500/30 text-red-400"
                      }`}
                    >
                      {localAudioEnabled ? "🎙️" : "🔇"}
                    </button>
                    <button
                      onClick={leaveCall}
                      title="Leave call"
                      className="flex-1 py-1.5 rounded-xl text-xs font-medium border bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 transition"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Local video */}
                  <div className="relative rounded-xl overflow-hidden bg-black border border-white/10 aspect-video flex-shrink-0">
                    <video
                      ref={setLocalVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                      style={{ transform: "scaleX(-1)" }}
                    />
                    {!localVideoEnabled && (
                      <div className="absolute inset-0 flex items-center justify-center bg-[#0d1117]">
                        <div
                          className="h-10 w-10 rounded-xl grid place-items-center text-lg font-bold text-white"
                          style={{ background: getColor(currentUser?.firstName) }}
                        >
                          {currentUser?.firstName?.[0]?.toUpperCase()}
                        </div>
                      </div>
                    )}
                    <div className="absolute bottom-1.5 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-black/60 text-white">
                      You {!localAudioEnabled && "🔇"}
                    </div>
                  </div>

                  {/* Remote peers */}
                  {remoteStreams.map(({ socketId, stream, name }) => (
                    <RemoteVideo key={socketId} stream={stream} name={name} />
                  ))}

                  {remoteStreams.length === 0 && (
                    <div className="rounded-xl border border-dashed border-white/10 aspect-video flex flex-col items-center justify-center gap-1 text-mutedForeground">
                      <span className="text-xl opacity-40">👤</span>
                      <p className="text-[10px]">Waiting for others…</p>
                    </div>
                  )}

                  <p className="text-[10px] text-mutedForeground text-center">
                    {remoteStreams.length + 1} participant
                    {remoteStreams.length !== 0 ? "s" : ""}
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── CENTER: CODE EDITOR ──────────────────── */}
        <div
          ref={editorContainerRef}
          className={`flex flex-col transition-all duration-300 ${
            editorCollapsed ? "w-10 flex-shrink-0" : "flex-1 min-w-0"
          } ${
            isFullscreen
              ? "fixed inset-0 z-[9999] bg-[#1e1e1e] p-4"
              : ""
          }`}
        >
          {/* Editor toolbar */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 flex-shrink-0">
            {!editorCollapsed && (
              <>
                <span className="text-xs font-semibold text-foreground">
                  &lt;/&gt; Code Editor
                </span>
                <span className="text-[10px] text-green-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                  Live sync
                </span>
              </>
            )}
            <div className={`flex items-center gap-2 ${editorCollapsed ? "mx-auto" : "ml-auto"}`}>
              {!editorCollapsed && (
                <>
                  <select
                    value={language}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className="text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-foreground focus:outline-none"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l} value={l} className="bg-[#1e1e1e]">
                        {l}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={toggleFullscreen}
                    className="text-xs text-mutedForeground hover:text-foreground transition px-2 py-1 rounded-lg hover:bg-white/5"
                    title="Toggle fullscreen"
                  >
                    {isFullscreen ? "⊠ Exit" : "⛶"}
                  </button>
                </>
              )}
              {/* Editor collapse/expand toggle */}
              <button
                onClick={() => setEditorCollapsed((v) => !v)}
                className="text-xs text-mutedForeground hover:text-foreground transition px-2 py-1 rounded-lg hover:bg-white/5"
                title={editorCollapsed ? "Show code editor" : "Hide code editor"}
              >
                {editorCollapsed ? "▶" : "◀"}
              </button>
            </div>
          </div>

          {/* Monaco Editor — hidden when collapsed but NOT unmounted (preserves state) */}
          <div className={`flex-1 min-h-0 ${editorCollapsed ? "hidden" : ""}`}>
            <Editor
              height="100%"
              language={language}
              value={code}
              onChange={handleCodeChange}
              onMount={onEditorMount}
              theme="vs-dark"
              options={{
                fontSize: 13,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                padding: { top: 12 },
                fontFamily:
                  "'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace",
                fontLigatures: true,
                lineNumbers: "on",
                renderLineHighlight: "line",
                cursorBlinking: "smooth",
                cursorSmoothCaretAnimation: "on",
                quickSuggestions: { other: true, comments: true, strings: true },
                suggestOnTriggerCharacters: true,
                acceptSuggestionOnEnter: "on",
                tabCompletion: "on",
                wordBasedSuggestions: "allDocuments",
                parameterHints: { enabled: true },
                inlineSuggest: { enabled: true },
                snippetSuggestions: "top",
                suggest: {
                  preview: true,
                  showMethods: true,
                  showFunctions: true,
                  showVariables: true,
                  showClasses: true,
                },
                bracketPairColorization: { enabled: true },
                autoClosingBrackets: "always",
                autoClosingQuotes: "always",
                formatOnPaste: true,
                formatOnType: true,
              }}
            />
          </div>
        </div>

        {/* ── RIGHT: CHAT + MEMBERS SIDEBAR ────────── */}
        <div className="flex flex-col w-72 flex-shrink-0 border-l border-white/10">

          {/* Right panel tabs */}
          <div className="flex border-b border-white/10 flex-shrink-0">
            {[
              ["chat", "💬 Chat"],
              ["members", "👥 Members"],
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setRightPanel(id)}
                className={`flex-1 py-2.5 text-xs font-medium transition ${
                  rightPanel === id
                    ? "text-foreground border-b-2 border-primary"
                    : "text-mutedForeground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── CHAT PANEL ─────────────────────────── */}
          {rightPanel === "chat" && (
            <>
              <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-mutedForeground">
                    <span className="text-2xl">💬</span>
                    <p className="text-xs">No messages yet. Say hi!</p>
                  </div>
                ) : (
                  messages.map((msg, i) => {
                    const isMe = msg.sender === currentUser?.firstName;
                    const color = getColor(msg.sender);
                    return (
                      <div
                        key={i}
                        className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={`flex items-end gap-1.5 max-w-[90%] ${
                            isMe ? "flex-row-reverse" : ""
                          }`}
                        >
                          <div
                            className="h-5 w-5 rounded-md grid place-items-center text-[9px] font-bold text-white flex-shrink-0"
                            style={{ background: color }}
                          >
                            {msg.sender?.[0]?.toUpperCase()}
                          </div>
                          <div
                            className={`px-2.5 py-1.5 rounded-2xl text-xs leading-relaxed ${
                              isMe
                                ? "text-white rounded-br-sm"
                                : "bg-white/5 border border-white/10 text-foreground rounded-bl-sm"
                            }`}
                            style={isMe ? { background: color } : {}}
                          >
                            {!isMe && (
                              <p
                                className="text-[9px] font-semibold mb-0.5"
                                style={{ color }}
                              >
                                {msg.sender}
                              </p>
                            )}
                            {msg.message}
                          </div>
                        </div>
                        <p className="text-[9px] text-mutedForeground mt-0.5 px-7">
                          {fmt(msg.timestamp)}
                        </p>
                      </div>
                    );
                  })
                )}

                {/* Typing indicator */}
                {typingUsers.length > 0 && (
                  <div className="flex items-center gap-1.5 text-mutedForeground">
                    <div className="flex gap-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-mutedForeground animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-mutedForeground animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-mutedForeground animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-[10px]">
                      {typingUsers.join(", ")} typing…
                    </span>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Chat input */}
              <div className="flex gap-2 p-3 border-t border-white/10 flex-shrink-0">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleChatKeyDown}
                  placeholder="Message… (Enter)"
                  className="text-xs"
                />
                <Button
                  size="sm"
                  onClick={sendMessage}
                  disabled={!chatInput.trim()}
                >
                  ↑
                </Button>
              </div>
            </>
          )}

          {/* ── MEMBERS PANEL ──────────────────────── */}
          {rightPanel === "members" && (
            <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
              <p className="text-[10px] text-mutedForeground uppercase tracking-wider mb-3">
                Online — {room.members.length}
              </p>
              {room.members.map((m) => {
                const memberId = m.userId._id;
                const memberName = m.userId.firstName;
                const isRoomOwner = room.owner?._id === memberId;
                const isCurrentUser = memberId === currentUser?._id;
                return (
                  <div
                    key={memberId}
                    className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                  >
                    <div
                      className="h-7 w-7 rounded-lg grid place-items-center text-xs font-bold text-white flex-shrink-0"
                      style={{ background: getColor(memberName) }}
                    >
                      {memberName?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {memberName}
                        {isCurrentUser && (
                          <span className="text-mutedForeground"> (you)</span>
                        )}
                      </p>
                      {isRoomOwner && (
                        <p className="text-[9px] text-primary">host</p>
                      )}
                    </div>
                    {/* Remove member button (owner only, not self) */}
                    {isOwner && !isCurrentUser && !isRoomOwner && (
                      <button
                        onClick={() => handleRemoveMember(memberId)}
                        className="text-[10px] text-red-400 hover:text-red-300 transition px-1"
                        title="Remove member"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Room;
