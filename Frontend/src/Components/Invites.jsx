import React, { useEffect, useState } from "react";
import axios from "axios";
import { BASE_URL } from "../utils/constants";
import { useNavigate } from "react-router-dom";
import Card from "./ui/Card";
import Button from "./ui/Button";

const Invites = () => {
  const [rooms, setRooms] = useState([]);
  const navigate = useNavigate();

  const fetchInvites = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/room/invites`, { withCredentials: true });
      setRooms(res.data.data);
    } catch (err) { console.error(err); }
  };

  const handleJoin = async (roomId) => {
    await axios.post(`${BASE_URL}/room/join`, { roomId }, { withCredentials: true });
    navigate(`/room/${roomId}`);
  };

  useEffect(() => { fetchInvites(); }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Invites</h1>
        <p className="text-sm text-mutedForeground mt-1">Rooms you've been invited to.</p>
      </div>

      {rooms.length === 0 ? (
        <Card className="p-10 flex flex-col items-center gap-2 text-center">
          <div className="h-10 w-10 rounded-2xl bg-white/5 border border-white/10 grid place-items-center text-xl">
            📭
          </div>
          <p className="text-sm text-mutedForeground">No pending invites.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {rooms.map((room) => (
            <Card key={room._id} className="p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">{room.name}</p>
                <p className="text-xs text-mutedForeground mt-0.5">
                  Invited by {room.owner.firstName}
                </p>
              </div>
              <Button size="sm" onClick={() => handleJoin(room._id)}>Join</Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Invites;
