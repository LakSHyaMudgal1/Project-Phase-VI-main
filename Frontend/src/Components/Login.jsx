import React, { useState } from 'react'
import axios from 'axios'
import { useDispatch } from 'react-redux';
import { addUser } from '../utils/userSlice';
import { useNavigate } from "react-router";
import { BASE_URL } from '../utils/constants';
import Card from "./ui/Card";
import Button from "./ui/Button";
import Input from "./ui/Input";

const Login = () => {
  const [emailId, setEmailId] = useState("Dinky@gmail.com");
  const [password, setPassword] = useState("Dinky@123");
  const [firstName, setFirstName]=useState("");
  const [lastName, setLastName]=useState("");
  const [isLogin, setIsLogin]=useState(true);
  const [error, setError]=useState("");

  const dispatch = useDispatch()
  const navigate=useNavigate();

  const HandleLogin= async ()=>{
    try{
      const res= await axios.post(BASE_URL+ "/login", {emailId, password}, {withCredentials:true});
      dispatch(addUser(res.data.user))
      navigate('/')
    }
    catch(err){
      console.log(err);
      setError(err.response?.data || "Something went wrong");
    }
  }

  const HandleSignUp=async ()=>{
    try{
      const res= await axios.post(BASE_URL+ "/signup", {firstName, lastName, emailId, password}, {withCredentials:true});
      dispatch(addUser(res.data.data));
      navigate('/')
    }
    catch(err){
      console.error(err);
      setError(err.response?.data || "Something went wrong");
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <Card className="w-full max-w-md p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              {isLogin ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-sm text-mutedForeground mt-1">
              {isLogin ? "Sign in to continue." : "Start tracking with a premium workspace."}
            </p>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-white/5 border border-white/10 grid place-items-center">
            <div className="h-2 w-2 rounded-full bg-primary" />
          </div>
        </div>

        {/* First Name & Last Name */}
        {!isLogin && (
          <>
            <label className="block text-xs text-mutedForeground mt-6 mb-2">First name</label>
            <Input
              type="text"
              value={firstName}
              onChange={(e)=> setFirstName(e.target.value)}
            />

            <label className="block text-xs text-mutedForeground mt-4 mb-2">Last name</label>
            <Input
              type="text"
              value={lastName}
              onChange={(e)=> setLastName(e.target.value)}
            />
          </>
        )}

        {/* Email */}
        <label className="block text-xs text-mutedForeground mt-6 mb-2">Email</label>
        <Input
          type="text"
          value={emailId}
          onChange={(e)=> setEmailId(e.target.value)}
        />

        {/* Password */}
        <label className="block text-xs text-mutedForeground mt-4 mb-2">Password</label>
        <Input
          type="password"
          value={password}
          onChange={(e)=> setPassword(e.target.value)}
        />

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* Button */}
        <div className="mt-6">
          <Button className="w-full" size="lg" onClick={isLogin ? HandleLogin : HandleSignUp}>
            {isLogin ? "Sign in" : "Create account"}
          </Button>
        </div>

        {/* Toggle */}
        <button
          onClick={()=> setIsLogin((value)=>!value)}
          className="mt-5 w-full text-center text-sm text-mutedForeground hover:text-foreground transition"
        >
          {isLogin ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
      </Card>
    </div>
  )
}

export default Login;