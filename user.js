const mongoose = require('mongoose');
require ('dotenv').config();
mongoose.connect(process.env.MONGODB_URI || process.env.Mongo_url)
    .then(() => {
        console.log("mongodb connected");
    })
    .catch(() => {
        console.log("fail.connect");
    })

const userSchema = new mongoose.Schema({
  first_name: {
    type: String,
    required: true
  },
  last_name: {
    type: String,
    required: true
  },
  college: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    match: [/.+@.+\..+/, 'Please enter a valid email address']
  },
  about: { type: String },
  skills: { type: [String] },
  userhandle: {
    type: String,
    unique: true,
   required: true,
  },
  password: {
    type: String,
    required: true
  },
  bookmark: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question'
}],
handles: {
  type: Map,
  of: String,
},
following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
});

const User = new mongoose.model('User', userSchema);
module.exports = User;
