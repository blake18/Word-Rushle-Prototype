const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
// Use public DNS servers for MongoDB Atlas SRV lookups.
// I was having a butload of problems and chatgpt recommended this and it worked so I went with it.

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const cors = require("cors");
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
      maxlength: 16
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

// Health check route
app.get("/api/health", (req, res) => {
  res.json({ message: "Word Rushle API is running." });
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
    const { playerName, score, round, mode } = req.body;

    if (!playerName || typeof score !== "number" || typeof round !== "number" || !mode) {
      return res.status(400).json({ error: "Missing or invalid score data." });
    }

    const newScore = await Score.create({
      playerName,
      score,
      roundReached: round,
      mode
    });

    res.status(201).json({
      message: "Score saved successfully.",
      scoreId: newScore._id
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