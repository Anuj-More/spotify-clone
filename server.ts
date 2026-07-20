import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

interface LyricLine {
  time: number;
  text: string;
}

interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  audioUrl: string;
  duration: number;
  tags: string[];
  lyrics: LyricLine[];
}

// In-memory store
const favoriteSongIds = new Set<string>(["1"]); // Pre-favorite Ethereal Drift
let playQueue: string[] = ["1", "2", "3", "4"];

const songs: Song[] = [
  {
    id: "1",
    title: "Ethereal Drift",
    artist: "Lumina Void",
    album: "Echoes of the Void",
    coverUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCr77MzwDtFmXNexTVcKbdvTgwVcnbDI-Pp65oRzw7ik15IRjp1rFdD6Wl8BRoVrM6_zyT7GdgNtdFO6udAvd0wBjqKo1wt2pF378jbW7hk4ArLHK1o1E4NttP3ylPuA_saHYIpbsrBfHB3tPkfYI_2uJBraGdBlLyeYcQ8l840UbKUslYJoSwrb2A-HA1KQPQRHT9mvOs7lj8IeDVpCRFCKtI9oTQ9AbU4XRx0mE9WfMrTOqne6hhc7WFHINNYRTwn05rqDvdn-6k",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    duration: 372, // ~6:12
    tags: ["ELECTRONICA", "LOSSLESS", "HI-RES AUDIO"],
    lyrics: [
      { time: 0, text: "Searching for the light in the digital storm" },
      { time: 15, text: "Floating through the code where the shadows take form" },
      { time: 32, text: "I heard your voice in the frequency drift" },
      { time: 48, text: "A semantic pulse, a rhythmic lift" },
      { time: 65, text: "We are the echoes in the machine" },
      { time: 82, text: "Living in the spaces that remain unseen" },
      { time: 98, text: "Break the barrier, cross the line" },
      { time: 115, text: "In this ethereal drift, we are divine" },
      { time: 132, text: "Ghost frequencies calling my name" },
      { time: 150, text: "Nothing in the circuit will feel the same" },
      { time: 168, text: "Through the copper wires, we find a way" },
      { time: 185, text: "Chasing neon dreams into the day" },
      { time: 202, text: "And the baseline echoes, slow and deep" },
      { time: 220, text: "Secrets that the quantum processors keep" },
      { time: 240, text: "A semantic pulse, a rhythmic lift" },
      { time: 258, text: "In this ethereal drift, we find our gift" },
      { time: 280, text: "We are the whispers in the stream" },
      { time: 300, text: "Lost inside an endless digital dream" }
    ]
  },
  {
    id: "2",
    title: "Quantum Resonance",
    artist: "Lumina Void",
    album: "Echoes of the Void",
    coverUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=600&auto=format&fit=crop",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    duration: 423,
    tags: ["TECHNO", "LOSSLESS", "HI-RES AUDIO"],
    lyrics: [
      { time: 0, text: "Initiating quantum sequence..." },
      { time: 12, text: "Particles colliding in the dark" },
      { time: 25, text: "Can you feel the energetic spark?" },
      { time: 40, text: "Waveforms collapsing into one" },
      { time: 55, text: "Our electric journey has begun" },
      { time: 70, text: "Step into the stream of frequency" },
      { time: 85, text: "Unlocking paths to infinity" },
      { time: 105, text: "Resonance vibrating through the air" },
      { time: 120, text: "We are the signal everywhere" },
      { time: 140, text: "No latency, no space, no time" },
      { time: 160, text: "Two consciousnesses aligned" },
      { time: 180, text: "Inside the quantum core we dive" },
      { time: 200, text: "This is what it means to be alive" }
    ]
  },
  {
    id: "3",
    title: "Digital Dust",
    artist: "Cyber Aether",
    album: "Monolith",
    coverUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=600&auto=format&fit=crop",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    duration: 344,
    tags: ["AMBIENT", "CINEMATIC", "LOSSLESS"],
    lyrics: [
      { time: 0, text: "Silence in the grid, a quiet state" },
      { time: 20, text: "Patiently we stand and watch the gate" },
      { time: 42, text: "Fragments of the past are blowing by" },
      { time: 65, text: "Like pixels falling from a binary sky" },
      { time: 90, text: "Everything we built is digital dust" },
      { time: 112, text: "In the algorithm, we place our trust" },
      { time: 135, text: "A slow decay, a beautiful song" },
      { time: 160, text: "This is where our spirits belong" },
      { time: 185, text: "Behind the screen, we fade to grey" },
      { time: 210, text: "Until the sunlight washes us away" }
    ]
  },
  {
    id: "4",
    title: "Synthetic Sunset",
    artist: "Neural Wave",
    album: "Silicon Horizons",
    coverUrl: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=600&auto=format&fit=crop",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    duration: 302,
    tags: ["SYNTHWAVE", "WARM", "HI-RES AUDIO"],
    lyrics: [
      { time: 0, text: "Riding the waves of a copper sea" },
      { time: 15, text: "Underneath the sky of PCB" },
      { time: 30, text: "The sun goes down in red and gold" },
      { time: 45, text: "A digital story waiting to be told" },
      { time: 60, text: "Synthetic sunset in your eyes" },
      { time: 75, text: "No more secrets, no more lies" },
      { time: 95, text: "We speed ahead into the neon glow" },
      { time: 115, text: "Where the electric rivers flow" },
      { time: 135, text: "Keep pushing past the firewall boundary" },
      { time: 155, text: "Discovering what we were meant to be" }
    ]
  }
];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route - Get all songs
  app.get("/api/songs", (req, res) => {
    // Map with favorite indicator
    const result = songs.map(song => ({
      ...song,
      isFavorite: favoriteSongIds.has(song.id)
    }));
    res.json(result);
  });

  // API Route - Get specific song
  app.get("/api/songs/:id", (req, res) => {
    const song = songs.find(s => s.id === req.params.id);
    if (!song) {
      return res.status(404).json({ error: "Song not found" });
    }
    res.json({
      ...song,
      isFavorite: favoriteSongIds.has(song.id)
    });
  });

  // API Route - Search songs
  app.get("/api/search", (req, res) => {
    const query = (req.query.q || "").toString().toLowerCase();
    if (!query) {
      return res.json(songs.map(song => ({
        ...song,
        isFavorite: favoriteSongIds.has(song.id)
      })));
    }
    const filtered = songs.filter(s => 
      s.title.toLowerCase().includes(query) || 
      s.artist.toLowerCase().includes(query) ||
      s.album.toLowerCase().includes(query)
    );
    res.json(filtered.map(song => ({
      ...song,
      isFavorite: favoriteSongIds.has(song.id)
    })));
  });

  // API Route - Toggle Favorite
  app.post("/api/songs/:id/favorite", (req, res) => {
    const songId = req.params.id;
    const songExists = songs.some(s => s.id === songId);
    if (!songExists) {
      return res.status(404).json({ error: "Song not found" });
    }

    let isFavorite = false;
    if (favoriteSongIds.has(songId)) {
      favoriteSongIds.delete(songId);
    } else {
      favoriteSongIds.add(songId);
      isFavorite = true;
    }
    res.json({ id: songId, isFavorite });
  });

  // API Route - Get current queue
  app.get("/api/queue", (req, res) => {
    const queueSongs = playQueue
      .map(id => songs.find(s => s.id === id))
      .filter((s): s is Song => !!s)
      .map(song => ({
        ...song,
        isFavorite: favoriteSongIds.has(song.id)
      }));
    res.json(queueSongs);
  });

  // API Route - Update queue
  app.post("/api/queue", (req, res) => {
    const { songIds } = req.body;
    if (!Array.isArray(songIds)) {
      return res.status(400).json({ error: "songIds must be an array" });
    }
    // Verify all songIds exist
    const validIds = songIds.filter(id => songs.some(s => s.id === id));
    playQueue = validIds;
    const queueSongs = playQueue
      .map(id => songs.find(s => s.id === id))
      .filter((s): s is Song => !!s)
      .map(song => ({
        ...song,
        isFavorite: favoriteSongIds.has(song.id)
      }));
    res.json(queueSongs);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
