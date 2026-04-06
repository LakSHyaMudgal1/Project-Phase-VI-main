import React, { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom';
import { BASE_URL } from '../utils/constants';
import { removeUser } from '../utils/userSlice';
import axios from 'axios';
import Button from "./ui/Button";
import Input from "./ui/Input";

const Navbar = () => {
  const user = useSelector((store) => store.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const HandleLogout = async () => {
    try {
      await axios.post(BASE_URL + '/logout', {}, { withCredentials: true });
      dispatch(removeUser());
      navigate('/login');
    } catch (err) {}
  };

  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-[60]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-4">
        <div className="glass rounded-3xl px-4 py-3 flex items-center justify-between">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-2xl bg-white/10 border border-white/10 grid place-items-center">
              <div className="h-2 w-2 rounded-full bg-primary shadow-soft" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">TabTrack</div>
              <div className="text-[11px] text-mutedForeground -mt-0.5">Work. Focus. Insight.</div>
            </div>
          </Link>

          {/* Right section */}
          {user && (
            <div className="flex items-center gap-3 relative">

              {/* Search */}
              <div className="hidden md:block w-[220px]">
                <Input placeholder="Search…" />
              </div>

              {/* Avatar + dropdown */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setOpen(!open)}
                  className="flex items-center gap-2 rounded-2xl px-2 py-1 hover:bg-white/5 transition"
                >
                  <img
                    src={user.photoUrl}
                    alt="User"
                    className="w-9 h-9 rounded-2xl border border-white/10 object-cover"
                  />
                  <div className="hidden sm:block text-left">
                    <div className="text-sm font-medium leading-tight">{user.firstName}</div>
                    <div className="text-[11px] text-mutedForeground -mt-0.5">{user.emailId}</div>
                  </div>
                </button>

                {open && (
                  <div className="absolute right-0 mt-2 w-52 rounded-2xl z-[100] shadow-glass overflow-hidden border border-white/10 bg-[hsl(222,47%,9%)] backdrop-blur-xl">
                    <Link to="/profile" onClick={() => setOpen(false)}
                      className="block px-4 py-3 text-sm hover:bg-white/5 transition">
                      Profile
                    </Link>
                    <Link to="/create-room" onClick={() => setOpen(false)}
                      className="block px-4 py-3 text-sm hover:bg-white/5 transition">
                      Create Room
                    </Link>
                    <Link to="/invites" onClick={() => setOpen(false)}
                      className="block px-4 py-3 text-sm hover:bg-white/5 transition">
                      Invites
                    </Link>
                    <Link to="/analytics" onClick={() => setOpen(false)}
                      className="block px-4 py-3 text-sm hover:bg-white/5 transition">
                      Analytics
                    </Link>
                    <div className="px-4 py-3 border-t border-white/10">
                      <Button variant="danger" className="w-full" onClick={HandleLogout}>
                        Logout
                      </Button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Navbar;
