import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import axios from "axios";
import Button from "./ui/Button";
import Card from "./ui/Card";
import { BASE_URL } from "../utils/constants";

const USER_COLORS = [
  "#4f8ef7","#10b981","#f59e0b","#ef4444",
  "#8b5cf6","#ec4899","#14b8a6","#f97316",
];
const getColor = (name) =>
  USER_COLORS[(name?.charCodeAt(0) || 0) % USER_COLORS.length];

const Home = () => {
  const user = useSelector((s) => s.user);
  const navigate = useNavigate();
  const [myRooms, setMyRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoadingRooms(true);
    axios
      .get(`${BASE_URL}/room/my-rooms`, { withCredentials: true })
      .then((res) => setMyRooms(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoadingRooms(false));
  }, [user]);

  const handleRejoin = async (roomId) => {
    try {
      await axios.post(
        `${BASE_URL}/room/join`,
        { roomId },
        { withCredentials: true }
      );
      navigate(`/room/${roomId}`);
    } catch {
      // Already a member — just navigate
      navigate(`/room/${roomId}`);
    }
  };

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="pt-6">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-mutedForeground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
              Video · Code · Chat · All at once
            </div>

            <h1 className="mt-5 text-4xl sm:text-5xl font-semibold tracking-tight">
              Study together.
              <span className="block text-mutedForeground font-medium mt-2">
                Code, chat, and call — in one room.
              </span>
            </h1>

            <p className="mt-5 text-sm sm:text-base text-mutedForeground leading-relaxed max-w-xl">
              A collaborative workspace built for students. Video call your
              teammates, edit code together in real time, and chat — all
              simultaneously inside a single room.
            </p>

            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <Link to="/create-room">
                <Button size="lg">Create a Room</Button>
              </Link>
              <Link to="/invites">
                <Button size="lg" variant="secondary">
                  View Invites
                </Button>
              </Link>
            </div>
          </div>

          {/* Feature preview card */}
          <Card className="p-6">
            <div className="text-sm font-semibold mb-4">
              Workspace features
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: "📹", label: "Video Call", desc: "WebRTC mesh, mute/cam toggle" },
                { icon: "</>" , label: "Code Editor", desc: "Monaco, live sync, cursors" },
                { icon: "💬", label: "Real-time Chat", desc: "Persisted, typing indicators" },
                { icon: "🖥️", label: "Screen Share", desc: "WebRTC screen broadcast" },
              ].map((f) => (
                <div
                  key={f.label}
                  className="rounded-2xl border border-white/10 bg-white/5 p-3"
                >
                  <div className="text-xl mb-1">{f.icon}</div>
                  <div className="text-xs font-semibold">{f.label}</div>
                  <div className="text-[10px] text-mutedForeground mt-0.5">
                    {f.desc}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      {/* My Rooms — rejoin section */}
      {user && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">My Rooms</h2>
            <Link to="/create-room">
              <Button size="sm" variant="secondary">
                + New Room
              </Button>
            </Link>
          </div>

          {loadingRooms ? (
            <p className="text-sm text-mutedForeground">Loading rooms…</p>
          ) : myRooms.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-sm text-mutedForeground">
                No rooms yet.{" "}
                <Link to="/create-room" className="text-primary hover:underline">
                  Create one
                </Link>{" "}
                or check your{" "}
                <Link to="/invites" className="text-primary hover:underline">
                  invites
                </Link>
                .
              </p>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myRooms.map((room) => {
                const isOwner = room.owner?._id === user._id;
                return (
                  <Card key={room._id} className="p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-8 w-8 rounded-xl grid place-items-center text-sm font-bold text-white flex-shrink-0"
                          style={{ background: getColor(room.name) }}
                        >
                          {room.name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold leading-tight">
                            {room.name}
                          </p>
                          <p className="text-[10px] text-mutedForeground">
                            by {room.owner?.firstName}
                            {isOwner && " (you)"}
                          </p>
                        </div>
                      </div>
                      {isOwner && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary flex-shrink-0">
                          host
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-mutedForeground">
                      <span>
                        {room.permanentMembers?.length || 0} member
                        {room.permanentMembers?.length !== 1 ? "s" : ""}
                      </span>
                      <span>·</span>
                      <span>
                        {new Date(room.updatedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => handleRejoin(room._id)}
                    >
                      ↩ Rejoin Room
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Feature highlights */}
      <section className="grid md:grid-cols-3 gap-4">
        {[
          {
            title: "Rooms persist",
            desc: "Leaving a room doesn't delete it. Rejoin anytime and pick up where you left off.",
          },
          {
            title: "Code is saved",
            desc: "Every keystroke is synced and saved. Refresh or rejoin — your code is still there.",
          },
          {
            title: "Chat history",
            desc: "Messages are stored in the database. Rejoin and scroll back through the full conversation.",
          },
        ].map((f) => (
          <Card key={f.title} className="p-5">
            <div className="text-sm font-semibold">{f.title}</div>
            <div className="mt-2 text-sm text-mutedForeground leading-relaxed">
              {f.desc}
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
};

export default Home;
