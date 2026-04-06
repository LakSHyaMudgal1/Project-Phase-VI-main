const express= require('express');
const authRouter= express.Router();
const bcrypt = require('bcrypt');
const User= require('../models/user');
const {validateSignupData}= require('../utils/validation');


authRouter.post('/signup', async (req, res)=>{
    try{
      validateSignupData(req);
      const {firstName, lastName, emailId, password, gender, age, photoUrl}= req.body;
  
      const Hashpassword= await bcrypt.hash(password, 10)
  
      const user= new User({
          firstName, lastName, emailId, password:Hashpassword, gender, age, photoUrl});

      
      await user.save();
      const token= await user.getJWT();
      res.cookie("token", token);
      
      res.json({message: "User Added Successfully", data: user})
     } 
  
     catch(err){
      res.status(400).send("There is an error" + err);
     }
  })
  
authRouter.post('/login', async(req, res)=>{
      try{
          const {emailId, password}= req.body;
          const user= await User.findOne({emailId: emailId});
  
          if(!user){
              throw new Error("Invalid Credentials")
          }
          const isPasswordValid= await user.validatePassword(password);
  
          if(isPasswordValid){
              const token= await user.getJWT();
  
              res.cookie("token", token, {
                httpOnly: true,
                secure: false, 
                sameSite: "lax",  
              });
              res.send({ user, token });
          }
  
          else{
              throw new Error("Invalid Credentials")
          }
      }
      catch(err){
          res.status(400).send("There is some error" + err);
      }
  })

authRouter.post('/logout', async(req, res)=>{
    res.cookie("token", null, {expires: new Date(Date.now())});
    res.send("LoggedOut Successfully");
})

module.exports= authRouter;