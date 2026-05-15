const mongoose= require('mongoose');
const validator= require('validator');
const jwt=require('jsonwebtoken');
const bcrypt= require('bcrypt');

const userSchema= new mongoose.Schema({
    firstName:{ 
        type: String,
        required: true,
        minLength: 3,
    },

    lastName:{
        type: String,
        maxLength: 50
    },

    emailId:{
        type: String,
        required: true,
        lowercase: true,
        unique: true,
        trim:true,
        validate(value){
            if(!validator.isEmail(value)){
                throw new Error("Not a valid Email Id");
            }
        }
    },

    password:{
        required: true,
        type: String,
        minLength:8,
        validate(value){
            if(!validator.isStrongPassword(value)){
                throw new Error("Enter a Strong Password");
            }
        }
    },

    gender:{
        type: String,
        maxLength: 1,
        uppercase: true,
        validate(value){
            if(!["M", "F", "O"].includes(value)){
                throw new error;
            }
        }
    },

    age:{
        type: Number,
        min: 18,
    },

    photoUrl:{
        type:String,
        default: "https://cdn-icons-png.flaticon.com/256/149/149071.png",
        validate(value){
            if(!validator.isURL(value)){
                throw new Error("Enter a valid URL");
            }
        }
    },

    about:{
        type: String,
        default: "This is the default about data"
    },

    role: {
        type: String,
        enum: ["student", "admin"],
        default: "student",
    },
},

{
    timestamps:true
}
)

userSchema.methods.getJWT= async function(){
    const token= await jwt.sign({_id:this._id}, "TabTrack@123", {expiresIn:'7d'});
    return token;
}

userSchema.methods.validatePassword= async function(passwordInputByUser){
    const isPasswordValid= await bcrypt.compare(passwordInputByUser, this.password);
    return(isPasswordValid);
}

module.exports= mongoose.model('User', userSchema);
