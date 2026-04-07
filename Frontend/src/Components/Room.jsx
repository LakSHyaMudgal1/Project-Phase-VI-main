import React, { useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Editor, { useMonaco } from "@monaco-editor/react";
import { BASE_URL } from "../utils/constants";
import { socket } from "../utils/socket";
import Card from "./ui/Card";
import Button from "./ui/Button";
import Input from "./ui/Input";

const fmt = (iso) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const ICE_SERVERS = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

// Assign a stable color per user name
const USER_COLORS = ["#4f8ef7","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#14b8a6","#f97316"];
const getColor = (name) => USER_COLORS[(name?.charCodeAt(0) || 0) % USER_COLORS.length];

const LANGUAGES = ["javascript","typescript","python","java","cpp","c","go","rust","html","css","json","markdown"];

/* ── RemoteVideo — attaches stream via ref ───────── */
const RemoteVideo = ({ stream, name }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && stream) ref.current.srcObject = stream;
  }, [stream]);
  return (
    <div className="relative rounded-2xl overflow-hidden bg-black border border-white/10 aspect-video">
      <video ref={ref} autoPlay playsInline className="w-full h-full object-cover" />
      <div className="absolute bottom-2 left-2 text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-black/60 text-white">
        {name || "Peer"}
      </div>
    </div>
  );
};

const Room = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const currentUser = useSelector((s) => s.user);
  const monaco = useMonaco();

  const [room, setRoom] = useState(null);
  const [activity, setActivity] = useState([]);
  const [email, setEmail] = useState("");
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef(null);

  const [activePanel, setActivePanel] = useState("chat");
  const [code, setCode] = useState("// Start coding together...\n");
  const [language, setLanguage] = useState("javascript");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isRemoteUpdate = useRef(false);
  const editorRef = useRef(null);
  const editorContainerRef = useRef(null);
  const decorationsRef = useRef({});   // { socketId: decorationId[] }
  const remoteCursors = useRef({});    // { socketId: { sender, color, cursor } }

  const [sharing, setSharing] = useState(false);
  const [viewingShare, setViewingShare] = useState(false);
  const [shareError, setShareError] = useState("");
  const localStreamRef = useRef(null);
  const pcRef = useRef(null);
  const viewerPcRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // ── Video call state ──────────────────────────────
  const [inCall, setInCall] = useState(false);
  const [localVideoEnabled, setLocalVideoEnabled] = useState(true);
  const [localAudioEnabled, setLocalAudioEnabled] = useState(true);
  const localCallStreamRef = useRef(null);   // camera/mic stream
  const callPeersRef = useRef({});           // { socketId: { pc, stream, name } }
  const localVideoElRef = useRef(null);
  const [remoteStreams, setRemoteStreams] = useState([]); // [{ socketId, stream, name }]

  /* ── room data ─────────────────────────────────── */
  const fetchRoom = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/room/get/${roomId}`, { withCredentials: true });
      setRoom(res.data.data);
    } catch (err) { console.error(err); }
  };

  const fetchActivity = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/room/activity/${roomId}`, { withCredentials: true });
      setActivity(res.data.data);
    } catch (err) { console.error(err); }
  };

  const handleInvite = async () => {
    if (!email) return;
    try {
      await axios.post(`${BASE_URL}/room/invite`, { roomId, emailId: email }, { withCredentials: true });
      setEmail("");
    } catch (err) { console.error(err.response?.data); }
  };

  const handleJoin = async () => {
    try {
      await axios.post(`${BASE_URL}/room/join`, { roomId }, { withCredentials: true });
      fetchRoom();
    } catch (err) { console.error(err.response?.data); }
  };

  const handleLeave = async () => {
    stopShare();
    try {
      await axios.post(`${BASE_URL}/room/leave`, { roomId }, { withCredentials: true });
      navigate("/");
    } catch (err) { console.error(err.response?.data); }
  };

  /* ── chat ──────────────────────────────────────── */
  const sendMessage = () => {
    if (!chatInput.trim()) return;
    socket.emit("chatMessage", { roomId, message: chatInput.trim(), sender: currentUser?.firstName || "You" });
    setChatInput("");
  };

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  /* ── code ──────────────────────────────────────── */
  const handleCodeChange = (value) => {
    if (isRemoteUpdate.current) { isRemoteUpdate.current = false; return; }
    setCode(value);
    socket.emit("codeUpdate", { roomId, code: value, language });
  };

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    socket.emit("codeUpdate", { roomId, code, language: lang });
  };

  // Inject CSS for remote cursor labels once monaco is ready
  useEffect(() => {
    if (!monaco) return;
    const style = document.createElement("style");
    style.id = "remote-cursor-styles";
    style.textContent = `
      .remote-cursor-label {
        font-size: 10px;
        font-weight: 600;
        padding: 1px 5px;
        border-radius: 3px;
        pointer-events: none;
        white-space: nowrap;
        position: absolute;
        top: -18px;
        z-index: 100;
      }
      .remote-cursor-line {
        border-left: 2px solid;
        margin-left: -1px;
      }
    `;
    if (!document.getElementById("remote-cursor-styles")) {
      document.head.appendChild(style);
    }
  }, [monaco]);

  const applyRemoteCursor = useCallback(({ socketId, sender, color, cursor }) => {
    const editor = editorRef.current;
    if (!editor || !monaco) return;

    const { lineNumber, column } = cursor;

    // Remove old decoration for this user
    const oldDecorations = decorationsRef.current[socketId] || [];
    const newDecorations = editor.deltaDecorations(oldDecorations, [
      {
        range: new monaco.Range(lineNumber, column, lineNumber, column + 1),
        options: {
          className: "remote-cursor-line",
          beforeContentClassName: undefined,
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          zIndex: 100,
          // Inline style via afterContentClassName trick
          after: {
            content: sender,
            inlineClassName: "remote-cursor-label",
            inlineClassNameAffectsLetterSpacing: false,
          },
        },
      },
    ]);

    decorationsRef.current[socketId] = newDecorations;

    // Apply color via dynamic style
    const styleId = `cursor-color-${socketId.replace(/[^a-z0-9]/gi, "")}`;
    let el = document.getElementById(styleId);
    if (!el) { el = document.createElement("style"); el.id = styleId; document.head.appendChild(el); }
    el.textContent = `
      .remote-cursor-line { border-color: ${color}; }
      .remote-cursor-label { background: ${color}; color: #fff; }
    `;
  }, [monaco]);

  const onEditorMount = (editor) => {
    editorRef.current = editor;

    // Broadcast cursor position on every cursor change
    editor.onDidChangeCursorPosition((e) => {
      socket.emit("cursorUpdate", {
        roomId,
        cursor: { lineNumber: e.position.lineNumber, column: e.position.column },
        sender: currentUser?.firstName || "Me",
        color: getColor(currentUser?.firstName),
      });
    });
  };

  /* ── fullscreen ────────────────────────────────── */
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

  /* ── screen share ──────────────────────────────── */
  const startShare = async () => {
    setShareError("");
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        setShareError("Screen sharing requires HTTPS or localhost.");
        return;
      }
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      setSharing(true);
      stream.getVideoTracks()[0].onended = stopShare;

      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      pc.onicecandidate = ({ candidate }) => {
        if (candidate) socket.emit("iceCandidate", { roomId, candidate, to: null });
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
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    pcRef.current?.close(); pcRef.current = null;
    setSharing(false);
    socket.emit("screenShareStopped", { roomId });
  };

  /* ── Video call ────────────────────────────────── */
  const ICE_CONFIG = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }] };

  const createPeerConnection = (remoteSocketId, remoteName) => {
    const pc = new RTCPeerConnection(ICE_CONFIG);

    // Add local tracks
    localCallStreamRef.current?.getTracks().forEach((t) => pc.addTrack(t, localCallStreamRef.current));

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) socket.emit("videoIceCandidate", { to: remoteSocketId, candidate });
    };

    pc.ontrack = ({ streams }) => {
      const stream = streams[0];
      callPeersRef.current[remoteSocketId] = { ...callPeersRef.current[remoteSocketId], stream };
      setRemoteStreams((prev) => {
        const exists = prev.find((s) => s.socketId === remoteSocketId);
        if (exists) return prev.map((s) => s.socketId === remoteSocketId ? { ...s, stream } : s);
        return [...prev, { socketId: remoteSocketId, stream, name: remoteName }];
      });
    };

    callPeersRef.current[remoteSocketId] = { pc, name: remoteName };
    return pc;
  };

  const joinCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localCallStreamRef.current = stream;
      if (localVideoElRef.current) { localVideoElRef.current.srcObject = stream; }
      setInCall(true);
      socket.emit("videoCallJoin", { roomId, userName: currentUser?.firstName || "User" });
    } catch (err) {
      console.error("Camera/mic error:", err);
    }
  };

  const leaveCall = () => {
    localCallStreamRef.current?.getTracks().forEach((t) => t.stop());
    localCallStreamRef.current = null;
    Object.values(callPeersRef.current).forEach(({ pc }) => pc?.close());
    callPeersRef.current = {};
    setRemoteStreams([]);
    setInCall(false);
    socket.emit("videoCallLeave", { roomId });
  };

  const toggleVideo = () => {
    const track = localCallStreamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setLocalVideoEnabled(track.enabled); }
  };

  const toggleAudio = () => {
    const track = localCallStreamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setLocalAudioEnabled(track.enabled); }
  };

  // Re-attach local stream when switching to video tab
  useEffect(() => {
    if (activePanel === "video" && inCall && localVideoElRef.current && localCallStreamRef.current) {
      localVideoElRef.current.srcObject = localCallStreamRef.current;
    }
  }, [activePanel, inCall]);

  /* ── socket events ─────────────────────────────── */
  useEffect(() => {
    socket.emit("joinRoom", roomId);

    socket.on("roomUpdate", (data) => { setActivity((prev) => [...prev, { message: data.message }]); fetchRoom(); });
    socket.on("chatMessage", (data) => setMessages((prev) => [...prev, data]));

    socket.on("codeUpdate", ({ code: incoming, language: lang }) => {
      isRemoteUpdate.current = true;
      setCode(incoming);
      if (lang) setLanguage(lang);
    });

    socket.on("cursorUpdate", ({ cursor, sender, color, socketId }) => {
      remoteCursors.current[socketId] = { cursor, sender, color };
      applyRemoteCursor({ socketId, sender, color, cursor });
    });

    socket.on("screenShareOffer", async ({ offer, from }) => {
      setViewingShare(true);
      const pc = new RTCPeerConnection(ICE_SERVERS);
      viewerPcRef.current = pc;
      pc.onicecandidate = ({ candidate }) => { if (candidate) socket.emit("iceCandidate", { roomId, candidate, to: from }); };
      pc.ontrack = ({ streams }) => {
        if (remoteVideoRef.current && streams[0]) {
          remoteVideoRef.current.srcObject = streams[0];
          remoteVideoRef.current.play().catch(() => {});
        }
      };
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("screenShareAnswer", { to: from, answer });
    });

    socket.on("screenShareAnswer", async ({ answer }) => {
      if (pcRef.current) await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on("iceCandidate", async ({ candidate }) => {
      const pc = pcRef.current || viewerPcRef.current;
      if (pc && candidate) { try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {} }
    });

    socket.on("screenShareStopped", () => {
      setViewingShare(false);
      viewerPcRef.current?.close(); viewerPcRef.current = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    });

    // ── Video call events ─────────────────────────
    // A new peer joined the call — we initiate the offer
    socket.on("videoCallUserJoined", async ({ socketId, userName }) => {
      if (!localCallStreamRef.current) return;
      const pc = createPeerConnection(socketId, userName);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("videoOffer", { to: socketId, offer, userName: currentUser?.firstName || "User" });
    });

    socket.on("videoCallUserLeft", ({ socketId }) => {
      callPeersRef.current[socketId]?.pc?.close();
      delete callPeersRef.current[socketId];
      setRemoteStreams((prev) => prev.filter((s) => s.socketId !== socketId));
    });

    socket.on("videoOffer", async ({ from, offer, userName }) => {
      if (!localCallStreamRef.current) return;
      const pc = createPeerConnection(from, userName);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("videoAnswer", { to: from, answer });
    });

    socket.on("videoAnswer", async ({ from, answer }) => {
      const peer = callPeersRef.current[from];
      if (peer?.pc) await peer.pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on("videoIceCandidate", async ({ from, candidate }) => {
      const peer = callPeersRef.current[from];
      if (peer?.pc && candidate) {
        try { await peer.pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
      }
    });

    fetchRoom(); fetchActivity();

    return () => {
      ["roomUpdate","chatMessage","codeUpdate","cursorUpdate","screenShareOffer","screenShareAnswer","iceCandidate","screenShareStopped",
       "videoCallUserJoined","videoCallUserLeft","videoOffer","videoAnswer","videoIceCandidate"]
        .forEach((e) => socket.off(e));
      stopShare();
      leaveCall();
    };
  }, [roomId, applyRemoteCursor]);

  if (!room) return (
    <div className="flex items-center justify-center h-64 text-mutedForeground text-sm">Loading room...</div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{room.name || "Room"}</h1>
          <p className="text-sm text-mutedForeground mt-1">{room.members.length} member{room.members.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleJoin}>Join</Button>
          <Button variant="danger" size="sm" onClick={handleLeave}>Leave</Button>
        </div>
      </div>

      {/* Screen share viewer */}
      {viewingShare && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse inline-block" />
              Live Screen Share
            </p>
            <Button variant="secondary" size="sm" onClick={() => remoteVideoRef.current?.requestFullscreen?.()}>
              ⛶ Fullscreen
            </Button>
          </div>
          <video ref={remoteVideoRef} autoPlay playsInline
            className="w-full rounded-2xl bg-black max-h-[480px] object-contain cursor-pointer"
            onDoubleClick={() => remoteVideoRef.current?.requestFullscreen?.()}
            title="Double-click for fullscreen" />
        </Card>
      )}

      {/* Share controls */}
      <Card className="p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">Screen Share</p>
          <p className="text-xs text-mutedForeground mt-0.5">
            {sharing ? "You are sharing your screen." : "Share your screen with everyone in the room."}
          </p>
          {shareError && <p className="text-xs text-red-400 mt-1">{shareError}</p>}
        </div>
        {sharing
          ? <Button variant="danger" size="sm" onClick={stopShare}>Stop Sharing</Button>
          : <Button variant="secondary" size="sm" onClick={startShare}>🖥️ Share Screen</Button>
        }
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Members + Invite + Activity */}
        <Card className="p-5 flex flex-col gap-4">
          <p className="text-sm font-semibold">Members</p>
          <div className="space-y-2">
            {room.members.map((m) => (
              <div key={m.userId._id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                <div className="h-7 w-7 rounded-xl grid place-items-center text-xs font-semibold text-white flex-shrink-0 rounded-xl"
                  style={{ background: getColor(m.userId.firstName) }}>
                  {m.userId.firstName?.[0]?.toUpperCase()}
                </div>
                <span className="text-sm">{m.userId.firstName}</span>
                {room.owner?._id === m.userId._id && (
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary">host</span>
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 pt-4">
            <p className="text-xs text-mutedForeground mb-2">Invite by email</p>
            <div className="flex gap-2">
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@email.com"
                onKeyDown={(e) => e.key === "Enter" && handleInvite()} />
              <Button size="sm" onClick={handleInvite}>Send</Button>
            </div>
          </div>

          <div className="border-t border-white/10 pt-4">
            <p className="text-xs text-mutedForeground mb-2">Activity</p>
            <div className="space-y-1 max-h-36 overflow-y-auto">
              {activity.length === 0
                ? <p className="text-xs text-mutedForeground">No activity yet.</p>
                : [...activity].reverse().map((a, i) => <p key={i} className="text-xs text-mutedForeground">{a.message}</p>)
              }
            </div>
          </div>
        </Card>

        {/* Chat / Code panel */}
        <Card className="md:col-span-2 p-5 flex flex-col" style={{ height: "560px" }}>

          {/* Tab switch */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1 bg-white/5 rounded-2xl p-1">
              {[["chat","💬 Chat"],["code","</> Code"],["video","📹 Video"]].map(([id, label]) => (
                <button key={id} onClick={() => setActivePanel(id)}
                  className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all ${
                    activePanel === id ? "bg-primary text-white shadow" : "text-mutedForeground hover:text-foreground"
                  }`}>
                  {label}
                </button>
              ))}
            </div>
            {activePanel === "code" && (
              <button onClick={toggleFullscreen}
                className="text-xs text-mutedForeground hover:text-foreground transition px-2 py-1 rounded-lg hover:bg-white/5"
                title="Toggle fullscreen">
                {isFullscreen ? "⊠ Exit Fullscreen" : "⛶ Fullscreen"}
              </button>
            )}
          </div>

          {/* Chat */}
          {activePanel === "chat" && (
            <>
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-mutedForeground">
                    <span className="text-2xl">💬</span>
                    <p className="text-sm">No messages yet. Say hi!</p>
                  </div>
                ) : messages.map((msg, i) => {
                  const isMe = msg.sender === currentUser?.firstName;
                  const color = getColor(msg.sender);
                  return (
                    <div key={i} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                      <div className={`flex items-end gap-2 max-w-[75%] ${isMe ? "flex-row-reverse" : ""}`}>
                        <div className="h-6 w-6 rounded-lg grid place-items-center text-[10px] font-bold text-white flex-shrink-0"
                          style={{ background: color }}>
                          {msg.sender?.[0]?.toUpperCase()}
                        </div>
                        <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                          isMe ? "text-white rounded-br-sm" : "bg-white/5 border border-white/10 text-foreground rounded-bl-sm"
                        }`} style={isMe ? { background: color } : {}}>
                          {!isMe && <p className="text-[10px] font-semibold mb-0.5" style={{ color }}>{msg.sender}</p>}
                          {msg.message}
                        </div>
                      </div>
                      <p className="text-[10px] text-mutedForeground mt-1 px-8">{fmt(msg.timestamp)}</p>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>
              <div className="flex gap-2 mt-3 border-t border-white/10 pt-3">
                <Input value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Type a message… (Enter to send)" />
                <Button size="sm" onClick={sendMessage} disabled={!chatInput.trim()}>Send</Button>
              </div>
            </>
          )}

          {/* Code editor */}
          {activePanel === "code" && (
            <div ref={editorContainerRef}
              className={`flex flex-col flex-1 gap-2 min-h-0 ${isFullscreen ? "bg-[#1e1e1e] p-4" : ""}`}
              style={isFullscreen ? { position: "fixed", inset: 0, zIndex: 9999 } : {}}>

              {/* Toolbar */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <p className="text-xs text-mutedForeground">Language:</p>
                <select value={language} onChange={(e) => handleLanguageChange(e.target.value)}
                  className="text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-foreground focus:outline-none">
                  {LANGUAGES.map((l) => <option key={l} value={l} className="bg-[#1e1e1e]">{l}</option>)}
                </select>
                <span className="text-[10px] text-mutedForeground ml-1">Live sync enabled</span>
                {isFullscreen && (
                  <button onClick={toggleFullscreen}
                    className="ml-auto text-xs text-mutedForeground hover:text-foreground px-2 py-1 rounded-lg hover:bg-white/10">
                    ⊠ Exit Fullscreen
                  </button>
                )}
              </div>

              <div className="flex-1 rounded-2xl overflow-hidden border border-white/10 min-h-0">
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
                    fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace",
                    fontLigatures: true,
                    lineNumbers: "on",
                    renderLineHighlight: "line",
                    cursorBlinking: "smooth",
                    cursorSmoothCaretAnimation: "on",
                    // Autocomplete / suggestions
                    quickSuggestions: { other: true, comments: true, strings: true },
                    suggestOnTriggerCharacters: true,
                    acceptSuggestionOnEnter: "on",
                    tabCompletion: "on",
                    wordBasedSuggestions: "allDocuments",
                    parameterHints: { enabled: true },
                    inlineSuggest: { enabled: true },
                    snippetSuggestions: "top",
                    suggest: { preview: true, showMethods: true, showFunctions: true, showVariables: true, showClasses: true },
                    bracketPairColorization: { enabled: true },
                    autoClosingBrackets: "always",
                    autoClosingQuotes: "always",
                    formatOnPaste: true,
                    formatOnType: true,
                  }}
                />
              </div>
            </div>
          )}

          {/* Video call */}
          {activePanel === "video" && (
            <div className="flex flex-col flex-1 gap-3 min-h-0 overflow-y-auto">
              {!inCall ? (
                <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center">
                  <div className="h-16 w-16 rounded-3xl bg-primary/10 border border-primary/20 grid place-items-center text-3xl">📹</div>
                  <div>
                    <p className="text-sm font-semibold">Video Call</p>
                    <p className="text-xs text-mutedForeground mt-1">Join to start a video call with everyone in the room.</p>
                  </div>
                  <Button onClick={joinCall}>Join Video Call</Button>
                </div>
              ) : (
                <>
                  {/* Controls */}
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                    <span className="flex items-center gap-1.5 text-xs text-mutedForeground">
                      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
                      In call · {remoteStreams.length + 1} participant{remoteStreams.length !== 0 ? "s" : ""}
                    </span>
                    <div className="ml-auto flex gap-2">
                      <button onClick={toggleVideo}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                          localVideoEnabled
                            ? "bg-white/5 border-white/10 text-foreground hover:bg-white/10"
                            : "bg-red-500/10 border-red-500/30 text-red-400"
                        }`}>
                        {localVideoEnabled ? "📷 Cam On" : "📷 Cam Off"}
                      </button>
                      <button onClick={toggleAudio}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                          localAudioEnabled
                            ? "bg-white/5 border-white/10 text-foreground hover:bg-white/10"
                            : "bg-red-500/10 border-red-500/30 text-red-400"
                        }`}>
                        {localAudioEnabled ? "🎙️ Mic On" : "🎙️ Mic Off"}
                      </button>
                      <Button variant="danger" size="sm" onClick={leaveCall}>Leave Call</Button>
                    </div>
                  </div>

                  {/* Video grid */}
                  <div className={`grid gap-3 flex-1 ${remoteStreams.length <= 1 ? "grid-cols-2" : "grid-cols-2"}`}>
                    {/* Local */}
                    <div className="relative rounded-2xl overflow-hidden bg-black border border-white/10 aspect-video">
                      <video ref={localVideoElRef} autoPlay playsInline muted
                        className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
                      {!localVideoEnabled && (
                        <div className="absolute inset-0 flex items-center justify-center bg-[#0d1117]">
                          <div className="h-12 w-12 rounded-2xl grid place-items-center text-xl font-bold text-white"
                            style={{ background: getColor(currentUser?.firstName) }}>
                            {currentUser?.firstName?.[0]?.toUpperCase()}
                          </div>
                        </div>
                      )}
                      <div className="absolute bottom-2 left-2 text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-black/60 text-white">
                        You {!localAudioEnabled && "🔇"}
                      </div>
                    </div>

                    {/* Remote peers */}
                    {remoteStreams.map(({ socketId, stream, name }) => (
                      <RemoteVideo key={socketId} stream={stream} name={name} />
                    ))}

                    {remoteStreams.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-white/10 aspect-video flex flex-col items-center justify-center gap-2 text-mutedForeground">
                        <span className="text-2xl opacity-40">👤</span>
                        <p className="text-xs">Waiting for others…</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

        </Card>
      </div>
    </div>
  );
};

export default Room;
