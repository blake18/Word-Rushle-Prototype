const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
// Use public DNS servers for MongoDB Atlas SRV lookups.
// I was having a butload of problems and chatgpt recommended this and it worked so I went with it.

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const cors = require("cors");
const bcrypt = require("bcrypt");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

// Serve frontend files from the public folder
app.use(express.static(path.join(__dirname, "public")));

// Connect to MongoDB Atlas
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB Atlas.");
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
  });

// Score model
const scoreSchema = new mongoose.Schema(
  {
    playerName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    score: {
      type: Number,
      required: true,
      min: 0
    },
    roundReached: {
      type: Number,
      required: true,
      min: 1
    },
    mode: {
      type: String,
      required: true,
      enum: ["daily", "endless"]
    }
  },
  {
    timestamps: true
  }
);

const Score = mongoose.model("Score", scoreSchema);

// User model
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 20
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20
    },
    passwordHash: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

const User = mongoose.model("User", userSchema);

// Word model
const wordSchema = new mongoose.Schema(
  {
    word: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      minlength: 4,
      maxlength: 4,
      unique: true
    },
    length: {
      type: Number,
      default: 4
    },
    isAnswer: {
      type: Boolean,
      default: true
    },
    isValidGuess: {
      type: Boolean,
      default: true
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

const Word = mongoose.model("Word", wordSchema);

function getTodayDateRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}

// Health check route
app.get("/api/health", (req, res) => {
  res.json({ message: "Word Rushle API is running." });
});

// AUTH: Register a new user account
app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, password, displayName } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required." });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanDisplayName = cleanUsername;

    if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
      return res.status(400).json({
        error: "Username must be 3-20 characters and use only letters, numbers, or underscores."
      });
    }

    if (password.length < 4) {
      return res.status(400).json({
        error: "Password must be at least 4 characters for this prototype."
      });
    }

    const existingUser = await User.findOne({ username: cleanUsername });

    if (existingUser) {
      return res.status(409).json({ error: "Username is already taken." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      username: cleanUsername,
      displayName: cleanDisplayName,
      passwordHash
    });

    res.status(201).json({
      message: "Account created successfully.",
      user: {
        id: newUser._id,
        username: newUser.username,
        displayName: newUser.displayName
      }
    });
  } catch (error) {
    console.error("Failed to register user:", error.message);
    res.status(500).json({ error: "Failed to register user." });
  }
});

// AUTH: Login to an existing account
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required." });
    }

    const cleanUsername = username.trim().toLowerCase();

    const user = await User.findOne({ username: cleanUsername });

    if (!user) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    res.json({
      message: "Login successful.",
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName
      }
    });
  } catch (error) {
    console.error("Failed to login:", error.message);
    res.status(500).json({ error: "Failed to login." });
  }
});

// USERS: Get stats for a user account
app.get("/api/users/:id/stats", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const scores = await Score.find({ userId: user._id }).sort({ createdAt: -1 });

    const gamesPlayed = scores.length;
    const bestScore = scores.length > 0
      ? Math.max(...scores.map(score => score.score))
      : 0;
    const bestRound = scores.length > 0
      ? Math.max(...scores.map(score => score.roundReached))
      : 0;
    const averageScore = scores.length > 0
      ? Math.round(scores.reduce((sum, score) => sum + score.score, 0) / scores.length)
      : 0;
    const dailyRuns = scores.filter(score => score.mode === "daily").length;
    const endlessRuns = scores.filter(score => score.mode === "endless").length;

    res.json({
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName
      },
      stats: {
        gamesPlayed,
        bestScore,
        bestRound,
        averageScore,
        dailyRuns,
        endlessRuns
      },
      recentScores: scores.slice(0, 10)
    });
  } catch (error) {
    console.error("Failed to load user stats:", error.message);
    res.status(500).json({ error: "Failed to load user stats." });
  }
});

// Converts a string into a repeatable numeric seed.
// Used so Daily mode can create the same shuffled word order for the same date.
function getNumericSeed(seedText) {
  let hash = 0;

  for (let i = 0; i < seedText.length; i++) {
    hash = (hash * 31 + seedText.charCodeAt(i)) >>> 0;
  }

  return hash;
}

// Repeatable pseudo-random number generator.
// Same seed always produces the same sequence of numbers.
function seededRandom(seed) {
  let value = seed;

  return function () {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

// Creates a repeatable shuffled copy of an array using a seeded random generator.
function seededShuffle(items, seedText) {
  const shuffled = [...items];
  const random = seededRandom(getNumericSeed(seedText));

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

// WORDS: Get the seeded Daily answer for a specific round.
// The same date and round number will always return the same word,
// but the full daily sequence is shuffled to avoid obvious letter streaks. (Thanks Kiev and Hamza for noticing this)
app.get("/api/words/daily-answer", async (req, res) => {
  try {
    const round = Number(req.query.round) || 1;

    if (round < 1) {
      return res.status(400).json({ error: "Round must be at least 1." });
    }

    const todayKey = new Date().toISOString().split("T")[0];

    const answerWords = await Word.find({
      length: 4,
      isAnswer: true,
      active: true
    }).sort({ word: 1 });

    if (answerWords.length === 0) {
      return res.status(404).json({ error: "No answer words found." });
    }

    const shuffledWords = seededShuffle(answerWords, todayKey);
    const selectedWord = shuffledWords[(round - 1) % shuffledWords.length];

    res.json({
      word: selectedWord.word,
      date: todayKey,
      round: round
    });
  } catch (error) {
    console.error("Failed to get daily answer word:", error.message);
    res.status(500).json({ error: "Failed to get daily answer word." });
  }
});

// WORDS: Get a random active answer word
app.get("/api/words/random-answer", async (req, res) => {
  try {
    const count = await Word.countDocuments({
      length: 4,
      isAnswer: true,
      active: true
    });

    if (count === 0) {
      return res.status(404).json({ error: "No answer words found." });
    }

    const randomIndex = Math.floor(Math.random() * count);

    const randomWord = await Word.findOne({
      length: 4,
      isAnswer: true,
      active: true
    }).skip(randomIndex);

    res.json({ word: randomWord.word });
  } catch (error) {
    console.error("Failed to get random answer word:", error.message);
    res.status(500).json({ error: "Failed to get random answer word." });
  }
});

// WORDS: Validate a player's guess
app.get("/api/words/validate/:guess", async (req, res) => {
  try {
    const guess = req.params.guess.toUpperCase();

    if (!/^[A-Z]{4}$/.test(guess)) {
      return res.json({ valid: false });
    }

    const foundWord = await Word.findOne({
      word: guess,
      length: 4,
      isValidGuess: true,
      active: true
    });

    res.json({ valid: Boolean(foundWord) });
  } catch (error) {
    console.error("Failed to validate guess:", error.message);
    res.status(500).json({ error: "Failed to validate guess." });
  }
});

// WORDS: Show word database summary
app.get("/api/words/summary", async (req, res) => {
  try {
    const totalWords = await Word.countDocuments({ length: 4 });
    const activeWords = await Word.countDocuments({ length: 4, active: true });
    const answerWords = await Word.countDocuments({
      length: 4,
      isAnswer: true,
      active: true
    });
    const validGuessWords = await Word.countDocuments({
      length: 4,
      isValidGuess: true,
      active: true
    });

    res.json({
      totalWords,
      activeWords,
      answerWords,
      validGuessWords
    });
  } catch (error) {
    console.error("Failed to load word summary:", error.message);
    res.status(500).json({ error: "Failed to load word summary." });
  }
});

// WORDS: Add one word manually
app.post("/api/words", async (req, res) => {
  try {
    const { word, isAnswer = true, isValidGuess = true } = req.body;

    if (!word || !/^[A-Za-z]{4}$/.test(word)) {
      return res.status(400).json({ error: "Word must be exactly 4 letters." });
    }

    const newWord = await Word.create({
      word: word.toUpperCase(),
      length: 4,
      isAnswer,
      isValidGuess,
      active: true
    });

    res.status(201).json({
      message: "Word added successfully.",
      word: newWord
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: "Word already exists." });
    }

    console.error("Failed to add word:", error.message);
    res.status(500).json({ error: "Failed to add word." });
  }
});

// CREATE: Save a score
app.post("/api/scores", async (req, res) => {
  try {
    const { playerName, score, round, mode, userId } = req.body;

    if (!playerName || typeof score !== "number" || typeof round !== "number" || !mode) {
      return res.status(400).json({ error: "Missing or invalid score data." });
    }

    let linkedUserId = null;

    if (userId) {
      const user = await User.findById(userId);

      if (!user) {
        return res.status(400).json({ error: "User account not found." });
      }

      linkedUserId = user._id;
    }

    const newScore = await Score.create({
      playerName,
      userId: linkedUserId,
      score,
      roundReached: round,
      mode
    });

    res.status(201).json({
      message: "Score saved successfully.",
      scoreId: newScore._id,
      userId: linkedUserId
    });
  } catch (error) {
    console.error("Failed to save score:", error.message);
    res.status(500).json({ error: "Failed to save score." });
  }
});

// READ: Load top scores
app.get("/api/scores", async (req, res) => {
  try {
    const scores = await Score.find()
      .sort({ score: -1, roundReached: -1, createdAt: 1 })
      .limit(10);

    res.json(scores);
  } catch (error) {
    console.error("Failed to load scores:", error.message);
    res.status(500).json({ error: "Failed to load scores." });
  }
});

// READ: Load separated leaderboards
app.get("/api/leaderboards", async (req, res) => {
  try {
    const { start, end } = getTodayDateRange();

    const todayDaily = await Score.find({
      mode: "daily",
      createdAt: {
        $gte: start,
        $lt: end
      }
    })
      .sort({ score: -1, roundReached: -1, createdAt: 1 })
      .limit(10);

    const allTimeDaily = await Score.aggregate([
      {
        $match: {
          mode: "daily"
        }
      },
      {
        $sort: {
          score: -1,
          roundReached: -1,
          createdAt: 1
        }
      },
      {
        $group: {
          _id: {
            $ifNull: ["$userId", "$playerName"]
          },
          bestScore: {
            $first: "$$ROOT"
          }
        }
      },
      {
        $replaceRoot: {
          newRoot: "$bestScore"
        }
      },
      {
        $sort: {
          score: -1,
          roundReached: -1,
          createdAt: 1
        }
      },
      {
        $limit: 10
      }
    ]);

    const endless = await Score.aggregate([
      {
        $match: {
          mode: "endless"
        }
      },
      {
        $sort: {
          score: -1,
          roundReached: -1,
          createdAt: 1
        }
      },
      {
        $group: {
          _id: {
            $ifNull: ["$userId", "$playerName"]
          },
          bestScore: {
            $first: "$$ROOT"
          }
        }
      },
      {
        $replaceRoot: {
          newRoot: "$bestScore"
        }
      },
      {
        $sort: {
          score: -1,
          roundReached: -1,
          createdAt: 1
        }
      },
      {
        $limit: 10
      }
    ]);

    res.json({
      todayDaily,
      allTimeDaily,
      endless
    });
  } catch (error) {
    console.error("Failed to load leaderboards:", error.message);
    res.status(500).json({ error: "Failed to load leaderboards." });
  }
});

// UPDATE: Edit the player name for a score
app.put("/api/scores/:id", async (req, res) => {
  try {
    const { playerName } = req.body;

    if (!playerName || playerName.trim() === "") {
      return res.status(400).json({ error: "Player name is required." });
    }

    const updatedScore = await Score.findByIdAndUpdate(
      req.params.id,
      { playerName: playerName.trim() },
      { new: true, runValidators: true }
    );

    if (!updatedScore) {
      return res.status(404).json({ error: "Score not found." });
    }

    res.json({ message: "Score updated successfully." });
  } catch (error) {
    console.error("Failed to update score:", error.message);
    res.status(500).json({ error: "Failed to update score." });
  }
});

// DELETE: Delete a score
app.delete("/api/scores/:id", async (req, res) => {
  try {
    const deletedScore = await Score.findByIdAndDelete(req.params.id);

    if (!deletedScore) {
      return res.status(404).json({ error: "Score not found." });
    }

    res.json({ message: "Score deleted successfully." });
  } catch (error) {
    console.error("Failed to delete score:", error.message);
    res.status(500).json({ error: "Failed to delete score." });
  }
});

// Load frontend at root URL
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});