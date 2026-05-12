const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const mongoose = require("mongoose");
require("dotenv").config();

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

const STARTER_WORDS = [
  "ABLE", "BAKE", "BARK", "BIRD", "BLUE",
  "BOAT", "BOLD", "BOND", "CAMP", "CARD",
  "COLD", "DARK", "DUST", "FIRE", "FISH",
  "GAME", "GOLD", "HAND", "HARD", "JUMP",
  "KING", "LAMP", "LAND", "LEAF", "MOON",
  "PATH", "PLAY", "RING", "ROAD", "ROCK",
  "SHIP", "SNOW", "STAR", "TIME", "TREE",
  "WIND", "WOLF", "WORD", "WORK", "ZONE"
];

async function seedSmallWords() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB Atlas.");

    const wordDocs = STARTER_WORDS.map(word => ({
      word,
      length: 4,
      isAnswer: true,
      isValidGuess: true,
      active: true
    }));

    await Word.deleteMany({ length: 4 });
    await Word.insertMany(wordDocs);

    const totalWords = await Word.countDocuments({ length: 4 });

    console.log(`Seeded ${totalWords} starter words.`);
  } catch (error) {
    console.error("Failed to seed starter words:", error.message);
  } finally {
    await mongoose.connection.close();
    console.log("Database connection closed.");
  }
}

seedSmallWords();