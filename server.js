const express = require('express');
const http = require('http');
const https = require('https');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Load Bible data
let bibleData = {};
try {
  bibleData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'kjv.json'), 'utf8'));
  console.log('KJV Bible loaded successfully');
} catch (err) {
  console.log('Bible data not found, will use API fallback');
}

// Load Songs data
let songsLibrary = [];
const songsPath = path.join(__dirname, 'data', 'songs.json');

function loadSongs() {
  try {
    if (fs.existsSync(songsPath)) {
      songsLibrary = JSON.parse(fs.readFileSync(songsPath, 'utf8'));
      console.log(`Loaded ${songsLibrary.length} songs from library`);
    } else {
      // Create empty file if not exists
      fs.writeFileSync(songsPath, '[]', 'utf8');
      songsLibrary = [];
    }
  } catch (err) {
    console.error('Error loading songs:', err);
    songsLibrary = [];
  }
}

function saveSongs() {
  try {
    fs.writeFileSync(songsPath, JSON.stringify(songsLibrary, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving songs:', err);
  }
}

loadSongs();

// Bible books list
const bibleBooks = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
  'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
  '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles',
  'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs',
  'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah',
  'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel',
  'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk',
  'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
  'Matthew', 'Mark', 'Luke', 'John', 'Acts',
  'Romans', '1 Corinthians', '2 Corinthians', 'Galatians',
  'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians',
  '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus',
  'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter',
  '1 John', '2 John', '3 John', 'Jude', 'Revelation'
];

// Chapter counts for each book
const chapterCounts = {
  'Genesis': 50, 'Exodus': 40, 'Leviticus': 27, 'Numbers': 36, 'Deuteronomy': 34,
  'Joshua': 24, 'Judges': 21, 'Ruth': 4, '1 Samuel': 31, '2 Samuel': 24,
  '1 Kings': 22, '2 Kings': 25, '1 Chronicles': 29, '2 Chronicles': 36,
  'Ezra': 10, 'Nehemiah': 13, 'Esther': 10, 'Job': 42, 'Psalms': 150, 'Proverbs': 31,
  'Ecclesiastes': 12, 'Song of Solomon': 8, 'Isaiah': 66, 'Jeremiah': 52,
  'Lamentations': 5, 'Ezekiel': 48, 'Daniel': 12, 'Hosea': 14, 'Joel': 3,
  'Amos': 9, 'Obadiah': 1, 'Jonah': 4, 'Micah': 7, 'Nahum': 3, 'Habakkuk': 3,
  'Zephaniah': 3, 'Haggai': 2, 'Zechariah': 14, 'Malachi': 4,
  'Matthew': 28, 'Mark': 16, 'Luke': 24, 'John': 21, 'Acts': 28,
  'Romans': 16, '1 Corinthians': 16, '2 Corinthians': 13, 'Galatians': 6,
  'Ephesians': 6, 'Philippians': 4, 'Colossians': 4, '1 Thessalonians': 5,
  '2 Thessalonians': 3, '1 Timothy': 6, '2 Timothy': 4, 'Titus': 3,
  'Philemon': 1, 'Hebrews': 13, 'James': 5, '1 Peter': 5, '2 Peter': 3,
  '1 John': 5, '2 John': 1, '3 John': 1, 'Jude': 1, 'Revelation': 22
};

// API endpoint to get books list
app.get('/api/bible/books', (req, res) => {
  res.json(bibleBooks);
});

// API endpoint to get chapters for a book
app.get('/api/bible/chapters/:book', (req, res) => {
  const book = req.params.book;
  const count = chapterCounts[book] || 1;
  res.json({ book, chapters: count });
});

// API endpoint to get verse
app.get('/api/bible/verse/:book/:chapter/:verse', async (req, res) => {
  const { book, chapter, verse } = req.params;
  
  // Try local data first
  if (bibleData[book] && bibleData[book][chapter] && bibleData[book][chapter][verse]) {
    return res.json({
      book,
      chapter,
      verse,
      text: bibleData[book][chapter][verse]
    });
  }
  
  // Fallback to API
  try {
    const apiBook = book.replace(/ /g, '%20');
    const url = `https://bible-api.com/${apiBook}%20${chapter}:${verse}?translation=kjv`;
    
    https.get(url, (apiRes) => {
      let data = '';
      apiRes.on('data', chunk => data += chunk);
      apiRes.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.text) {
            res.json({
              book,
              chapter,
              verse,
              text: result.text.trim()
            });
          } else {
            res.status(404).json({ error: 'Verse not found' });
          }
        } catch (e) {
          res.status(500).json({ error: 'Failed to parse response' });
        }
      });
    }).on('error', (e) => {
      res.status(500).json({ error: 'API request failed' });
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch verse' });
  }
});

// API endpoint to get verse range
app.get('/api/bible/verses/:book/:chapter/:verseStart/:verseEnd', async (req, res) => {
  const { book, chapter, verseStart, verseEnd } = req.params;
  
  // Try local data first
  if (bibleData[book] && bibleData[book][chapter]) {
    const verses = [];
    for (let v = parseInt(verseStart); v <= parseInt(verseEnd); v++) {
      if (bibleData[book][chapter][v]) {
        verses.push(`${v}. ${bibleData[book][chapter][v]}`);
      }
    }
    if (verses.length > 0) {
      return res.json({
        book,
        chapter,
        verseStart,
        verseEnd,
        text: verses.join(' ')
      });
    }
  }
  
  // Fallback to API
  try {
    const apiBook = book.replace(/ /g, '%20');
    const url = `https://bible-api.com/${apiBook}%20${chapter}:${verseStart}-${verseEnd}?translation=kjv`;
    
    https.get(url, (apiRes) => {
      let data = '';
      apiRes.on('data', chunk => data += chunk);
      apiRes.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.text) {
            res.json({
              book,
              chapter,
              verseStart,
              verseEnd,
              text: result.text.trim()
            });
          } else {
            res.status(404).json({ error: 'Verses not found' });
          }
        } catch (e) {
          res.status(500).json({ error: 'Failed to parse response' });
        }
      });
    }).on('error', (e) => {
      res.status(500).json({ error: 'API request failed' });
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch verses' });
  }
});

// API endpoint to get full chapter
app.get('/api/bible/chapter/:book/:chapter', async (req, res) => {
  const { book, chapter } = req.params;
  
  // Try local data first
  if (bibleData[book] && bibleData[book][chapter]) {
    const verses = Object.entries(bibleData[book][chapter])
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
      .map(([v, text]) => ({ verse: parseInt(v), text }));
    return res.json({ book, chapter, verses });
  }
  
  // Fallback to API
  try {
    const apiBook = book.replace(/ /g, '%20');
    const url = `https://bible-api.com/${apiBook}%20${chapter}?translation=kjv`;
    
    https.get(url, (apiRes) => {
      let data = '';
      apiRes.on('data', chunk => data += chunk);
      apiRes.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.verses) {
            res.json({
              book,
              chapter,
              verses: result.verses.map(v => ({ verse: v.verse, text: v.text.trim() }))
            });
          } else {
            res.status(404).json({ error: 'Chapter not found' });
          }
        } catch (e) {
          res.status(500).json({ error: 'Failed to parse response' });
        }
      });
    }).on('error', (e) => {
      res.status(500).json({ error: 'API request failed' });
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chapter' });
  }
});

// Current state
let currentState = {
  mode: 'welcome', // 'welcome', 'bible', 'lyrics', 'program'
  bible: {
    book: '',
    chapter: '',
    verse: '',
    text: ''
  },
  lyrics: {
    title: '',
    currentSlide: 0,
    slides: []
  },
  program: {
    currentIndex: 0,
    events: []
  },
  display: {
    fontSize: 48,
    theme: 'dark'
  }
};

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Send current state to newly connected client
  socket.emit('state-update', currentState);
  
  // Handle state updates from control page
  socket.on('update-state', (newState) => {
    currentState = { ...currentState, ...newState };
    io.emit('state-update', currentState);
  });
  
  // Handle Bible verse update
  socket.on('update-bible', (bibleData) => {
    currentState.mode = 'bible';
    currentState.bible = bibleData;
    io.emit('state-update', currentState);
  });
  
  // Handle lyrics update
  socket.on('update-lyrics', (lyricsData) => {
    currentState.mode = 'lyrics';
    currentState.lyrics = lyricsData;
    io.emit('state-update', currentState);
  });

  // ========== SONG LIBRARY EVENTS ==========
  
  // Send songs list to client
  socket.on('get-songs', () => {
    socket.emit('songs-list', songsLibrary);
  });

  // Save new song or update existing
  socket.on('save-song', (songData) => {
    const existingIndex = songsLibrary.findIndex(s => s.id === songData.id);
    
    if (existingIndex >= 0) {
      songsLibrary[existingIndex] = songData; // Update
    } else {
      songData.id = songData.id || Date.now().toString();
      songsLibrary.push(songData); // Add new
    }
    
    // Sort alpha by title
    songsLibrary.sort((a, b) => a.title.localeCompare(b.title));
    
    saveSongs();
    io.emit('songs-list', songsLibrary); // Broadcast update to all controls
  });

  // Delete song
  socket.on('delete-song', (songId) => {
    songsLibrary = songsLibrary.filter(s => s.id !== songId);
    saveSongs();
    io.emit('songs-list', songsLibrary);
  });

  // ========================================
  
  // Handle next/previous slide for lyrics
  socket.on('lyrics-navigate', (direction) => {
    if (direction === 'next' && currentState.lyrics.currentSlide < currentState.lyrics.slides.length - 1) {
      currentState.lyrics.currentSlide++;
    } else if (direction === 'prev' && currentState.lyrics.currentSlide > 0) {
      currentState.lyrics.currentSlide--;
    } else if (typeof direction === 'number') {
      currentState.lyrics.currentSlide = direction;
    }
    io.emit('state-update', currentState);
  });
  
  // Handle program update
  socket.on('update-program', (programData) => {
    currentState.mode = 'program';
    currentState.program = programData;
    io.emit('state-update', currentState);
  });
  
  // Handle program navigation
  socket.on('program-navigate', (direction) => {
    if (direction === 'next' && currentState.program.currentIndex < currentState.program.events.length - 1) {
      currentState.program.currentIndex++;
    } else if (direction === 'prev' && currentState.program.currentIndex > 0) {
      currentState.program.currentIndex--;
    } else if (typeof direction === 'number') {
      currentState.program.currentIndex = direction;
    }
    io.emit('state-update', currentState);
  });
  
  // Handle display settings
  socket.on('update-display', (displayData) => {
    currentState.display = { ...currentState.display, ...displayData };
    io.emit('state-update', currentState);
  });
  
  // Handle mode change
  socket.on('change-mode', (mode) => {
    currentState.mode = mode;
    io.emit('state-update', currentState);
  });
  
  // Handle clear display
  socket.on('clear-display', () => {
    currentState.mode = 'welcome';
    io.emit('state-update', currentState);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Display page: http://localhost:${PORT}/display.html`);
  console.log(`Control page: http://localhost:${PORT}/control.html`);
});
