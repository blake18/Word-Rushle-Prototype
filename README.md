# Word Rushle

Word Rushle is a web-based fun word puzzle game inspired by Wordle. Players complete survival-style word guessing rounds, earn points based on performance, and try to reach the highest score possible. The prototype includes Daily and Endless gameplay modes, score tracking, increasing difficulty, skips, and a database-backed leaderboard for saving, viewing, editing, and deleting player scores.

Originally designed for COSC 412 – Software Engineering course at Towson University taught by Professor Jeff Tirschman

## How to Run the Application

### 1. Download or Clone the Project

Download the project zip file or clone the repository from GitHub.

### 2. Open the Project Folder

Open the project folder in Visual Studio Code or another code editor.

### 3. Install Dependencies

Run this command in the project folder:

npm install

### 4. Start the Server

Run this command:

node server.js

The server should start at:

http://localhost:3000

### 5. Open the Application

Open a web browser and go to:

http://localhost:3000


## Features Included in This Prototype

- Playable word puzzle gameplay
- Daily mode
- Endless mode
- Score tracking
- Round tracking
- Skip system
- Increasing difficulty as rounds progress
- Best score and best round tracking
- Run summary screen
- Guest score saving
- Leaderboard screen
- SQLite database integration
- Create, read, update, and delete leaderboard score records
- Basic navigation sidebar
- Word Rushle branding and interface layout

## Technologies Used

- HTML
- CSS
- JavaScript
- Node.js
- Express.js
- SQLite
- GitHub for version control

## Database Information

This prototype uses a SQLite database named:

scores.db

The database stores leaderboard score records in a `scores` table.

The `scores` table includes:

- `id`
- `player_name`
- `score`
- `round_reached`
- `mode`
- `created_at`

## API Routes

The backend server provides the following API routes:

POST /api/scores  
Saves a new score to the database.

GET /api/scores  
Retrieves the top leaderboard scores.

PUT /api/scores/:id  
Updates the player name for a saved score.

DELETE /api/scores/:id  
Deletes a saved score from the database.

## Known Limitations

The current prototype is not the final version of the full project. Some planned features are not fully implemented yet.

Current limitations include:

- User accounts are not fully implemented.
- Words are currently stored in the frontend instead of the database.
- Stats and How to Play pages are placeholder screens.
- Friend leaderboard filtering is not fully implemented.
- Word ratings and comments are planned for a future release.
- Admin word management is planned for a future release.

## Developer

This project was developed by Oscar Ma as a solo project under the team name SoloDevMa.