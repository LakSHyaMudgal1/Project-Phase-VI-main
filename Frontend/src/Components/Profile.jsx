import React, { useEffect, useState } from "react";
import axios from "axios";
import { BASE_URL } from "../utils/constants";
import Card from "./ui/Card";
import Button from "./ui/Button";
import Input from "./ui/Input";

const Profile = () => {
  const [user, setUser] = useState(null);
  const [editData, setEditData] = useState({});
  const [passwordData, setPasswordData] = useState({ currentPassword: "", newPassword: "" });
  const [msg, setMsg] = useState({ text: "", type: "" });

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/profile`, { withCredentials: true });
      setUser(res.data);
      setEditData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  const notify = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 3000);
  };

  const handleChange = (e) => setEditData({ ...editData, [e.target.name]: e.target.value });

  const handleUpdate = async () => {
    try {
      const res = await axios.put(`${BASE_URL}/profile/edit`, editData, { withCredentials: true });
      setUser(res.data.data);
      notify("Profile updated");
    } catch (err) {
      notify(err.response?.data || "Update failed", "error");
    }
  };

  const handlePasswordChange = async () => {
    try {
      await axios.patch(`${BASE_URL}/profile/password`, passwordData, { withCredentials: true });
      setPasswordData({ currentPassword: "", newPassword: "" });
      notify("Password updated");
    } catch (err) {
      notify(err.response?.data || "Password change failed", "error");
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64 text-mutedForeground text-sm">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-semibold tracking-tight">My Profile</h1>

      {msg.text && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            msg.type === "error"
              ? "border-red-500/30 bg-red-500/10 text-red-200"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          }`}
        >
          {msg.text}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Profile display */}
        <Card className="p-6 flex flex-col items-center text-center gap-3">
          <img
            src={user.photoUrl}
            alt="profile"
            className="w-20 h-20 rounded-2xl border border-white/10 object-cover"
          />
          <div>
            <p className="font-semibold text-lg">{user.firstName} {user.lastName}</p>
            <p className="text-sm text-mutedForeground mt-0.5">{user.emailId}</p>
          </div>
          {user.about && (
            <p className="text-sm text-mutedForeground leading-relaxed">{user.about}</p>
          )}
        </Card>

        {/* Edit profile */}
        <Card className="p-6 space-y-3">
          <p className="text-sm font-semibold mb-1">Edit Profile</p>
          <Input name="firstName" value={editData.firstName || ""} onChange={handleChange} placeholder="First Name" />
          <Input name="lastName" value={editData.lastName || ""} onChange={handleChange} placeholder="Last Name" />
          <Input name="photoUrl" value={editData.photoUrl || ""} onChange={handleChange} placeholder="Photo URL" />
          <textarea
            name="about"
            value={editData.about || ""}
            onChange={handleChange}
            placeholder="About"
            rows={3}
            className="w-full rounded-2xl px-3 py-2 text-sm bg-white/5 border border-white/10 placeholder:text-mutedForeground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          />
          <Button className="w-full" onClick={handleUpdate}>Update Profile</Button>
        </Card>
      </div>

      {/* Change password */}
      <Card className="p-6 space-y-3">
        <p className="text-sm font-semibold mb-1">Change Password</p>
        <Input
          type="password"
          placeholder="Current Password"
          value={passwordData.currentPassword}
          onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
        />
        <Input
          type="password"
          placeholder="New Password"
          value={passwordData.newPassword}
          onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
        />
        <Button variant="secondary" className="w-full" onClick={handlePasswordChange}>
          Change Password
        </Button>
      </Card>
    </div>
  );
};

export default Profile;
