import React, { useEffect } from 'react';
import Navbar from './Navbar';
import { Outlet, useNavigate } from 'react-router-dom';
import Footer from './Footer';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { BASE_URL } from '../utils/constants';
import { addUser } from '../utils/userSlice';

const Body = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const userData = useSelector((store) => store.user);

  const fetchUser = async () => {
    try {
      const res = await axios.get(BASE_URL + "/profile", {
        withCredentials: true,
      });

      dispatch(addUser(res.data));
    } catch (err) {
      navigate("/login");
      console.error(err);
    }
  };

  useEffect(() => {
    // 🔥 only call API if redux is empty
    if (!userData) {
      fetchUser();
    }
  }, []);

  return (
    <div className="app-shell">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default Body;