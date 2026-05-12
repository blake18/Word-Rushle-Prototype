const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const mongoose = require("mongoose");
const words = require("an-array-of-english-words");
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
      default: false
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

// Curated answer list: common/fair 4-letter words.
// These are the words the game is allowed to choose as hidden answers.
const COMMON_ANSWER_WORDS = [
  "ABLE", "ACID", "AGED", "ALSO", "AREA", "ARMY", "AWAY",
  "BABY", "BACK", "BAKE", "BALL", "BAND", "BANK", "BARK", "BASE", "BATH", "BEAR", "BEAT", "BELL", "BIRD", "BLUE", "BOAT", "BODY", "BOLD", "BOND", "BONE", "BOOK", "BOOM", "BORN", "BOSS", "BOTH", "BOWL", "BULK", "BURN", "BUSH",
  "CALL", "CALM", "CAME", "CAMP", "CARD", "CARE", "CASE", "CASH", "CAST", "CELL", "CHAT", "CITY", "CLUB", "COAL", "COAT", "CODE", "COLD", "COME", "COOK", "COOL", "COPY", "CORE", "COST", "CREW",
  "DARK", "DATA", "DATE", "DAWN", "DAYS", "DEAD", "DEAL", "DEAR", "DEBT", "DEEP", "DESK", "DISH", "DOOR", "DOWN", "DRAW", "DROP", "DUAL", "DUKE", "DUST", "DUTY",
  "EACH", "EARN", "EASE", "EAST", "EASY", "EDGE", "ELSE", "EVEN", "EVER", "EVIL", "EXIT",
  "FACE", "FACT", "FAIL", "FAIR", "FALL", "FARM", "FAST", "FATE", "FEAR", "FEED", "FEEL", "FEET", "FELL", "FELT", "FILE", "FILL", "FILM", "FIND", "FINE", "FIRE", "FIRM", "FISH", "FIVE", "FLAT", "FLOW", "FOOD", "FOOT", "FORM", "FORT", "FOUR", "FREE", "FUEL", "FULL", "FUND",
  "GAIN", "GAME", "GATE", "GAVE", "GEAR", "GIFT", "GIRL", "GIVE", "GLAD", "GOAL", "GOES", "GOLD", "GOLF", "GONE", "GOOD", "GRAY", "GROW",
  "HAIR", "HALF", "HALL", "HAND", "HANG", "HARD", "HARM", "HATE", "HAVE", "HEAD", "HEAR", "HEAT", "HELD", "HELP", "HERE", "HERO", "HIGH", "HILL", "HIRE", "HOLD", "HOLE", "HOLY", "HOME", "HOPE", "HOST", "HOUR", "HUGE", "HUNT",
  "IDEA", "INCH", "INTO", "IRON", "ITEM",
  "JACK", "JOIN", "JUMP", "JURY", "JUST",
  "KEEP", "KEPT", "KICK", "KILL", "KIND", "KING", "KNEE", "KNEW", "KNOW",
  "LACK", "LADY", "LAID", "LAKE", "LAMP", "LAND", "LANE", "LAST", "LATE", "LEAD", "LEAF", "LEFT", "LESS", "LIFE", "LIFT", "LIKE", "LINE", "LINK", "LIST", "LIVE", "LOAD", "LOAN", "LOCK", "LONG", "LOOK", "LORD", "LOSE", "LOSS", "LOST", "LOVE", "LUCK",
  "MADE", "MAIL", "MAIN", "MAKE", "MALE", "MANY", "MARK", "MASS", "MEAL", "MEAN", "MEAT", "MEET", "MENU", "MILE", "MILK", "MIND", "MINE", "MISS", "MODE", "MOOD", "MOON", "MORE", "MOST", "MOVE", "MUCH", "MUST",
  "NAME", "NAVY", "NEAR", "NECK", "NEED", "NEWS", "NEXT", "NICE", "NINE", "NONE", "NOSE", "NOTE",
  "ONCE", "ONLY", "OPEN", "OVER",
  "PACE", "PACK", "PAGE", "PAID", "PAIN", "PAIR", "PALM", "PARK", "PART", "PASS", "PAST", "PATH", "PEAK", "PICK", "PINK", "PIPE", "PLAN", "PLAY", "PLOT", "PLUS", "POLL", "POOL", "POOR", "PORT", "POST", "PULL", "PURE", "PUSH",
  "RACE", "RAIL", "RAIN", "RANK", "RARE", "RATE", "READ", "REAL", "REAR", "RELY", "RENT", "RICE", "RICH", "RIDE", "RING", "RISE", "RISK", "ROAD", "ROCK", "ROLE", "ROLL", "ROOF", "ROOM", "ROOT", "ROSE", "RULE", "RUSH",
  "SAFE", "SAID", "SAKE", "SALE", "SALT", "SAME", "SAND", "SAVE", "SEAT", "SEED", "SEEK", "SEEM", "SEEN", "SELF", "SELL", "SEND", "SENT", "SHIP", "SHOP", "SHOT", "SHOW", "SHUT", "SICK", "SIDE", "SIGN", "SITE", "SIZE", "SKIN", "SLIP", "SLOW", "SNOW", "SOFT", "SOIL", "SOLD", "SOLE", "SOME", "SONG", "SOON", "SORT", "SOUL", "SPOT", "STAR", "STAY", "STEP", "STOP", "SUCH", "SUIT", "SURE",
  "TAKE", "TALE", "TALK", "TALL", "TANK", "TASK", "TEAM", "TECH", "TELL", "TEND", "TERM", "TEST", "TEXT", "THAN", "THAT", "THEM", "THEN", "THEY", "THIN", "THIS", "TIDE", "TIED", "TIME", "TINY", "TOLD", "TOLL", "TONE", "TOOK", "TOOL", "TOUR", "TOWN", "TREE", "TRIP", "TRUE", "TUNE", "TURN", "TWIN", "TYPE",
  "UNIT", "UPON", "USED", "USER",
  "VARY", "VAST", "VERY", "VIEW", "VOTE",
  "WAGE", "WAIT", "WAKE", "WALK", "WALL", "WANT", "WARD", "WARM", "WASH", "WAVE", "WAYS", "WEAK", "WEAR", "WEEK", "WELL", "WENT", "WERE", "WEST", "WHAT", "WHEN", "WIDE", "WIFE", "WILD", "WILL", "WIND", "WINE", "WING", "WIRE", "WISE", "WISH", "WITH", "WOLF", "WOOD", "WORD", "WORE", "WORK", "YARD", "YEAH", "YEAR", "YOUR", "ZERO", "ZONE"
];

async function seedLargeWords() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB Atlas.");

    const answerSet = new Set(COMMON_ANSWER_WORDS);

    const fourLetterWords = [...new Set(
      words
        .map(word => word.toUpperCase())
        .filter(word => /^[A-Z]{4}$/.test(word))
    )];

    const wordDocs = fourLetterWords.map(word => ({
      word,
      length: 4,
      isValidGuess: true,
      isAnswer: answerSet.has(word),
      active: true
    }));

    await Word.deleteMany({ length: 4 });
    await Word.insertMany(wordDocs, { ordered: false });

    const totalWords = await Word.countDocuments({ length: 4 });
    const validGuessWords = await Word.countDocuments({
      length: 4,
      isValidGuess: true,
      active: true
    });
    const answerWords = await Word.countDocuments({
      length: 4,
      isAnswer: true,
      active: true
    });

    console.log(`Seeded ${totalWords} total 4-letter words.`);
    console.log(`Valid guesses: ${validGuessWords}`);
    console.log(`Answer words: ${answerWords}`);
  } catch (error) {
    console.error("Failed to seed large word bank:", error.message);
  } finally {
    await mongoose.connection.close();
    console.log("Database connection closed.");
  }
}

seedLargeWords();