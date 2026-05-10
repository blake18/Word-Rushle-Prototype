const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const db = new sqlite3.Database("./scores.db", (error) => {
  if (error) {
    console.error("Database connection failed:", error.message);
  } else {
    console.log("Connected to SQLite database.");
  }
});

db.run(`
  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_name TEXT NOT NULL,
    score INTEGER NOT NULL,
    round_reached INTEGER NOT NULL,
    mode TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

// CREATE: Save a score.
app.post("/api/scores", (req, res) => {
  const { playerName, score, round, mode } = req.body;

  if (!playerName || typeof score !== "number" || typeof round !== "number" || !mode) {
    return res.status(400).json({ error: "Missing or invalid score data." });
  }

  const sql = `
    INSERT INTO scores (player_name, score, round_reached, mode)
    VALUES (?, ?, ?, ?)
  `;

  db.run(sql, [playerName, score, round, mode], function (error) {
    if (error) {
      console.error("Failed to save score:", error.message);
      return res.status(500).json({ error: "Failed to save score." });
    }

    res.json({
      message: "Score saved successfully.",
      scoreId: this.lastID
    });
  });
});

// READ: Load top scores.
app.get("/api/scores", (req, res) => {
  const sql = `
    SELECT id, player_name, score, round_reached, mode, created_at
    FROM scores
    ORDER BY score DESC
    LIMIT 10
  `;

  db.all(sql, [], (error, rows) => {
    if (error) {
      console.error("Failed to load scores:", error.message);
      return res.status(500).json({ error: "Failed to load scores." });
    }

    res.json(rows);
  });
});

// UPDATE: Edit the player name for a score.
app.put("/api/scores/:id", (req, res) => {
  const scoreId = req.params.id;
  const { playerName } = req.body;

  if (!playerName || playerName.trim() === "") {
    return res.status(400).json({ error: "Player name is required." });
  }

  const sql = `
    UPDATE scores
    SET player_name = ?
    WHERE id = ?
  `;

  db.run(sql, [playerName.trim(), scoreId], function (error) {
    if (error) {
      console.error("Failed to update score:", error.message);
      return res.status(500).json({ error: "Failed to update score." });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: "Score not found." });
    }

    res.json({ message: "Score updated successfully." });
  });
});

// DELETE: Delete a score.
app.delete("/api/scores/:id", (req, res) => {
  const scoreId = req.params.id;

  const sql = `
    DELETE FROM scores
    WHERE id = ?
  `;

  db.run(sql, [scoreId], function (error) {
    if (error) {
      console.error("Failed to delete score:", error.message);
      return res.status(500).json({ error: "Failed to delete score." });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: "Score not found." });
    }

    res.json({ message: "Score deleted successfully." });
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});