const express = require("express");
const main = express();
const session = require('cookie-session');
const bodyParser = require("body-parser");
const http = require('http');
const socketIo = require('socket.io');
const server = http.createServer(main);
main.use(express.json());
const io = socketIo(server, {
  cors: {
    origin: 'https://zcoderstage.vercel.app',
    methods: ['GET', 'POST']
  }
});
const onlineUsers = {};
const User = require("./user");
const Question = require("./questionschema");
const Messages = require("./messageModel");
const Comment = require("./comment");

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

const cors = require('cors');
main.use(cors({
  origin: 'https://zcoderstage.vercel.app',
  methods: ['GET', 'POST'],
  credentials: true
}));

main.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true
}));

main.use(express.json());
main.set("view engine", "ejs");
main.use(express.urlencoded({ extended: false }));




// POST endpoint to send a message
main.post("/friends", async (req, res) => {
  const { senderEmail, receiverEmail, messageText } = req.body;

  try {
    const sender = await User.findOne({ email: senderEmail });
    const receiver = await User.findOne({ email: receiverEmail });

    if (!sender || !receiver) {
      return res.status(404).json({ message: "Sender or receiver not found" });
    }

    const message = new Messages({
      message: { text: messageText },
      users: [sender._id, receiver._id],
      sender: sender._id,
    });

    await message.save();

    res.status(201).json(message);
  } catch (error) {
    console.error("Send Message Error:", error);
    res.status(500).json({ message: "Failed to send message" });
  }
});

main.get("/friends", async (req, res) => {
  const { from, to } = req.query;

  try {
    const sender = await User.findOne({ email: from });
    const receiver = await User.findOne({ email: to });

    if (!sender || !receiver) {
      return res.status(404).json({ message: "Sender or receiver not found" });
    }

    const messages = await Messages.find({
      users: { $all: [sender._id, receiver._id] },
    }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error("Fetch Chat Error:", error);
    res.status(500).json({ message: "Failed to fetch chat messages" });
  }
});







    io.on('connection', (socket) => {
      console.log('a user connected');
    
      socket.on('setUserId', (userId) => {
        onlineUsers[userId] = socket.id;
        io.emit('userOnline', onlineUsers);
    
      
        
        });
        socket.on('sendMessage', async (messageData) => {
          const { senderEmail, receiverEmail, messageText } = messageData;
      
          try {
            const sender = await User.findOne({ email: senderEmail });
            const receiver = await User.findOne({ email: receiverEmail });
      
            if (!sender || !receiver) {
              return;
            }
      
            const message = new Messages({
              message: { text: messageText },
              users: [sender._id, receiver._id],
              sender: sender._id,
            });
      
            await message.save();
      
            io.emit('receiveMessage', {
              message: { text: messageText },
              users: [sender._id, receiver._id],
              sender: sender._id,
              receiver: receiver._id,
              senderhandle:sender.userhandle,
            });
      
          } catch (error) {
            console.error("Send Message Error:", error);
          }
        });
      
        socket.on('typing', ({ from, to, typing }) => {
          if (onlineUsers[to]) {
            io.to(onlineUsers[to]).emit('typing', { from, typing });
          }
        });
      
        socket.on('disconnect', () => {
            const userId = Object.keys(onlineUsers).find((key) => onlineUsers[key] === socket.id);
          if (userId) {
            delete onlineUsers[userId];
            io.emit('userOnline', onlineUsers);
          }
          console.log('User disconnected:', socket.id);
        });
      });





main.post("/questions", async (req, res) => {
  const userEmail = req.query.email;
  //const userId = "5a9427648b0beebeb69579e7";
  const { title, link, topics ,solution} = req.body;
  const topicsArray = Array.isArray(topics) ? topics : [topics];
  const question = new Question({
    title: title,
    link: link,
    topics: topicsArray,
    solution: solution
  });

  console.log(question);


  try {
    await question.save();
    const user = await User.findOne({ email: userEmail });
    if (user) {
      
        const questions = await Question.find();
        return res.json({ user, questions });
        //res.render("landing", { user, questions });
      
    }
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});


main.post("/register", async (req, res) => {
  
  try {
    // Hash the password
    const data = req.body.credentials
    // Create a new user object
    const user = new User({
      first_name: data.first_name,
      last_name: data.last_name,
      city: data.city,
      college: data.college,
      email: data.email,
      userhandle: data.userhandle,
      password: data.password,
      bookmark: [],
      following: [],
      handles: {
        Codeforces: "https://codeforces.com/",
        Codechef: "https://codechef.com/",
        Atcoder: "https://atcoder.jp/",
        GeeksforGeeks: "https://www.geeksforgeeks.org/",
        Leetcode: "https://leetcode.com/"
      }
    });

    console.log("User created:", user);

    try {
      // Save the user to the database
      await user.save();

      // Add any session-based bookmarked question
      if (req.session.questionToBookmark) {
        user.bookmark.push(req.session.questionToBookmark);
        await user.save();
        req.session.questionToBookmark = null;
      }

      // Fetch all questions and handle session bookmarks
      const questions = await Question.find();
      if (req.session.bookmark) {
        const bookmarkedQuestions = await Question.find({
          _id: { $in: user.bookmark },
        });
        req.session.bookmark = null;
        return res.json({ user, bookmarkedQuestions });
      }

      // Send the user and questions data as JSON
      return res.json({ user, questions });
    } catch (err) {
      if (err.code === 11000) {
        console.error("Duplicate key error:", err);
        return res.status(400).send("Email already exists");
      } else {
        console.error("Error saving user to database:", err);
        return res.status(500).send("Internal Server Error");
      }
    }
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(500).send("Error occurred");
  }
});
main.post("/signin", async (req, res) => {


 
  try {
    const user = await User.findOne({ email: req.body.email });

   
    
    if (user) {
      const questions = await Question.find();
      if (req.session.questionToBookmark) {
        user.bookmark.push(req.session.questionToBookmark);
        await user.save();
        req.session.questionToBookmark = null;
      }
      if (req.session.bookmark) {
        const bookmarkedQuestions = await Question.find({
          _id: { $in: user.bookmark },
        });
        req.session.bookmark = null;
       const comments = await Comment.find().populate('userId', 'userhandle');
       return res.json({ user, bookmarkedQuestions ,comments });
      }

      console.log(user);
      return res.json({ user, questions });
    } else {

      console.log("Sign-in request received:", req.body);
      console.log("Invalid credentials");
      return res.status(401).json({ message: "Invalid credentials" });
    }
  } catch {
    
    return res.status(500).json({ message: "An error occurred during sign-in" });
  }
});

main.post("/bookmark/:questionId/:email", async (req, res) => {
  const userEmail = req.params.email;
  console.log(userEmail);
  const questionId = req.params.questionId;

  const user = await User.findOne({email: userEmail});
  if (user) {
    
      if (!user.bookmark.includes(questionId)) {
        user.bookmark.push(questionId);
        await user.save();
      }else{
        return res.status(400).send("Question already bookmarked");
      }
      const questions = await Question.find();
     return res.json({ user,bookmark: user.bookmark});
    
  } else {
    res.status(404).send("User not found");
  }
});

main.get("/bookmarkquestions", async (req, res) => {
  const userEmail = req.query.email;
  try {
    const user = await User.findOne({ email: userEmail });
    if (user) {
    
        const bookmarkedQuestions = await Question.find({
          _id: { $in: user.bookmark },
        });
       return res.json({ user, bookmarkedQuestions });
      
    } else {
      res.status(404).send("User not found");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

main.post("/unbookmark/:questionId/:email", async (req, res) => {
  const userEmail = req.params.email;
  const questionId = req.params.questionId;

  const user = await User.findOne({ email: userEmail });
  if (user) {
    index = user.bookmark.findIndex((id) => id !== questionId);
    if (index !== -1) {
      user.bookmark.splice(index, 1);
    }
    await user.save();
      const bookmarkedQuestions = await Question.find({
      _id: { $in: user.bookmark },
    });
    return res.json({ user, bookmarkedQuestions });
  } else {
    res.status(404).send("User not found");
  }
});

main.get("/landing", async (req, res) => {
  const userId = req.query.userId;

  try {
    const user = await User.findById(userId);
      const questions = await Question.find();
      res.render("landing", { user, questions });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

main.get("/question", async (req, res) => {
  const userEmail = req.query.email;
  const user = await User.findOne({ email: userEmail });
  const questions = await Question.find();
  const comments = await Comment.find().populate('userId', 'userhandle');
  return res.json({ user, questions,comments });
});

main.get('/profile', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.query.email });
       
        return res.json({ user });
      
    }
  catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).send('Internal Server Error');
  }
});

main.get("/edit", async (req, res) => {
  const userId = req.query.userId;

  try {
    const user = await User.findById(userId);
    res.render("edit", { user });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

main.post("/update", async (req, res) => {
  try {
      const userId = req.query.userId; 
      const updatedUserData = {
          first_name: req.body.first_name,
          last_name: req.body.last_name,
          city: req.body.city,
          college: req.body.college,
          email: req.body.email,
          userhandle: req.body.userhandle,
          password: req.body.password, 
          about: req.body.about,
      skills: Array.isArray(req.body.skills) ? req.body.skills : [req.body.skills]
    };
    console.log(updatedUserData);

      const updatedUser = await User.findOneAndUpdate(
          { _id: userId },
          updatedUserData,
          { new: true } 
      );
     

      if (!updatedUser) {
          return res.status(404).send("User not found"); 
      }

      return res.json({ user: updatedUser });
  } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).send("Internal Server Error");
  }
});

main.get("/handle", async (req, res) => {
  const userId = req.query.userId;

  try {
    const user = await User.findById(userId);
    res.render("addhandle", { user });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

main.post("/addHandles", async (req, res) => {

  try {
      const { userId, handleName, handleLink } = req.body;

      const updatedUser = await User.findOneAndUpdate(
          { _id: userId },
          { $set: { [`handles.${handleName}`]: handleLink } },
          { new: true }
      );

     return res.json({ user: updatedUser });
  } catch (error) {
      console.error("Error updating handles:", error);
      res.status(500).send("Internal Server Error");
  }
});

main.get('/searchUser', async (req, res) => {
 // const usercurrId = req.query.userId; // Use req.query.userId for GET requests
  try {
      const userhandle = req.query.userhandle.toLowerCase();
      const user = await User.findOne({ userhandle });

      if (!user) {
          return res.status(404).send("User not found");
      }
      console.log(user);

      return res.json({ user }); 
  } catch (error) {
      console.error("Error searching user:", error);
      res.status(500).send("Internal Server Error");
  }
});


main.get("/profileid", async (req, res) => {
const userId = req.query.userId;

 
  try {
    const user = await User.findById(userId);
    console.log(user);
    return res.json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

main.post('/follow/:userId', async (req, res) => {
  const userId = req.params.userId;
  const userIdToFollow = req.body.userIdtofollow;

  if (userIdToFollow === userId) {
      return res.status(400).send("You cannot follow yourself");
  }

  try {
    const user = await User.findById(userId);

      if (!user.following) {
        user.following = [];
        user.following.push(userIdToFollow);
      }
      if (!user.following.includes(userIdToFollow)) {
        user.following.push(userIdToFollow);
        await user.save();
    }
    
     
      //res.render("profile", { user });
      //console.log(user.following);
      return res.json({ user });
  } catch (error) {
      console.error("Error following user:", error);
      res.status(500).send("Internal Server Error");
  }
});



main.post("/comment/:questionId/:userId", async (req, res) => {
  const { questionId, userId } = req.params;
  const { comment } = req.body;
  // console.log('Question ID:', questionId);
  // console.log('User ID:', userId);
  // console.log('Comment:', comment);

  try {
    const newComment = new Comment({
      questionId,
      userId,
      comment,
    });

    const user = await User.findById(userId);
    await newComment.save();

    const questions = await Question.find();
    const comments = await Comment.find().populate('userId', 'userhandle');
   
    return res.json({ user, questions, comments });
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});
