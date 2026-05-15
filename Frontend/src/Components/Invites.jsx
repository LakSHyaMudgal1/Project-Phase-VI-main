import React, { useEffect, useState } from "react";
import axios from "axios";
import { BASE_URL } from "../utils/constants";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Card from "./ui/Card";
import Button from "./ui/Button";

const USER_COLORS = [
  "#4f8ef7","#10b981","#f59e0b","#ef4444",
  "#8b5cf6","#ec4899","#14b8a6","#f97316",
];
const getColor = (name) =>
  USER_COLORS[(name?.charCodeAt(0) || 0) % USER_COLORS.length];

const Invites = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const currentUser = useSelector((s) => s.user);

  const fetchInvites = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/room/invites`, {
        withCredentials: true,
      });
      setRooms(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (roomId) => {
    try {
      await axios.post(
        `${BASE_URL}/room/join`,
        { roomId },
        { withCredentials: true }
      );
    } catch {
      // Already a member — just navigate
    }
    navigate(`/room/${roomId}`);
  };

  useEffect(() => {
    fetchInvites();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Invites &amp; Rooms
        </h1>
        <p className="text-sm text-mutedForeground mt-1">
          Rooms you've been invited to or can rejoin.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-mutedForeground">Loading…</p>
      ) : rooms.length === 0 ? (
        <Card className="p-10 flex flex-col items-center gap-2 text-center">
          <div className="h-10 w-10 rounded-2xl bg-white/5 border border-white/10 grid place-items-center text-xl">
            📭
          </div>
          <p className="text-sm text-mutedForeground">No invites or rooms yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {rooms.map((room) => {
            const isOwner = room.owner?._id === currentUser?._id;
            return (
              <Card
                key={room._id}
                className="p-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-9 w-9 rounded-xl grid place-items-center text-sm font-bold text-white flex-shrink-0"
                    style={{ background: getColor(room.name) }}
                  >
                    {room.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{room.name}</p>
                    <p className="text-xs text-mutedForeground mt-0.5">
                      {isOwner
                        ? "You own this room"
                        : `Invited by ${room.owner?.firstName}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isOwner && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                      host
                    </span>
                  )}
                  <Button size="sm" onClick={() => handleJoin(room._id)}>
                    ↩ Join / Rejoin
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Invites;
