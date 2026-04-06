import React, { useState } from "react";
import axios from "axios";
import { BASE_URL } from "../utils/constants";
import { useNavigate } from "react-router-dom";
import Card from "./ui/Card";
import Button from "./ui/Button";
import Input from "./ui/Input";

const CreateRoom = () => {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await axios.post(`${BASE_URL}/room/create`, { name }, { withCredentials: true });
      navigate(`/room/${res.data.data._id}`);
    } catch (err) {
      setError(err.response?.data || "Failed to create room");
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md p-6 space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Create a Room</h2>
          <p className="text-sm text-mutedForeground mt-1">
            Set up a focused collaboration space.
          </p>
        </div>

        <div>
          <label className="block text-xs text-mutedForeground mb-2">Room name</label>
          <Input
            placeholder="e.g. Deep Work Session"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
        </div>

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        <Button className="w-full" size="lg" onClick={handleCreate} disabled={loading || !name.trim()}>
          {loading ? "Creating…" : "Create Room"}
        </Button>
      </Card>
    </div>
  );
};

export default CreateRoom;
