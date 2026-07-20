import React, { useState, useEffect, useRef } from "react";
import {
  Home,
  Search,
  Library,
  Folder,
  ListMusic,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
  Volume1,
  Heart,
  ChevronLeft,
  ChevronRight,
  Bell,
  Maximize2,
  Minimize2,
  Mic2,
  Loader2,
  Music,
  Check
} from "lucide-react";
import { Song, ViewType } from "./types";

export default function App() {
  // Navigation & UI States
  const [currentView, setCurrentView] = useState<ViewType>("library"); // default to library
  const [showLyricsPanel, setShowLyricsPanel] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Audio & Playback States
  const [songs, setSongs] = useState<Song[]>([]);
  const [queue, setQueue] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // References
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lyricsContainerRef = useRef<HTMLDivElement | null>(null);
  const activeLyricRef = useRef<HTMLParagraphElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  // Fetch initial songs & queue
  useEffect(() => {
    fetchSongs();
    fetchQueue();
  }, []);

  const fetchSongs = async () => {
    try {
      const res = await fetch("/api/songs");
      const data = await res.json();
      setSongs(data);
      if (data.length > 0) {
        // Set first song as default current song if none set
        setCurrentSong(data[0]);
      }
      setIsLoading(false);
    } catch (err) {
      console.error("Failed to fetch songs:", err);
      setIsLoading(false);
    }
  };

  const fetchQueue = async () => {
    try {
      const res = await fetch("/api/queue");
      const data = await res.json();
      setQueue(data);
    } catch (err) {
      console.error("Failed to fetch queue:", err);
    }
  };

  // Sync Audio volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Handle Play/Pause trigger
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch(err => {
        console.warn("Playback error (often browser autoplay policy):", err);
        setIsPlaying(false);
      });
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentSong?.id]);

  // Dynamic Lyrics synchronization & scrolling
  const [activeLyricIndex, setActiveLyricIndex] = useState(-1);

  useEffect(() => {
    if (!currentSong || !currentSong.lyrics) {
      setActiveLyricIndex(-1);
      return;
    }

    // Find current index
    const index = currentSong.lyrics.findIndex((lyric, idx) => {
      const nextLyric = currentSong.lyrics[idx + 1];
      if (nextLyric) {
        return currentTime >= lyric.time && currentTime < nextLyric.time;
      }
      return currentTime >= lyric.time;
    });

    setActiveLyricIndex(index);
  }, [currentTime, currentSong]);

  // Smooth scroll active lyric to center
  useEffect(() => {
    if (activeLyricRef.current && lyricsContainerRef.current) {
      activeLyricRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }
  }, [activeLyricIndex]);

  // Format seconds to MM:SS
  const formatTime = (secs: number) => {
    if (isNaN(secs)) return "00:00";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  // Select and play a specific song
  const playSong = (song: Song) => {
    setCurrentSong(song);
    setIsPlaying(true);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.src = song.audioUrl;
      // Wait for load metadata to set duration
      audioRef.current.load();
      audioRef.current.play().catch(() => {
        setIsPlaying(false);
      });
    }
  };

  // Toggle favorite via API
  const toggleFavorite = async (songId: string) => {
    try {
      const res = await fetch(`/api/songs/${songId}/favorite`, {
        method: "POST"
      });
      const data = await res.json();
      
      // Update local state
      setSongs(prevSongs =>
        prevSongs.map(s => (s.id === songId ? { ...s, isFavorite: data.isFavorite } : s))
      );
      if (currentSong && currentSong.id === songId) {
        setCurrentSong(prev => prev ? { ...prev, isFavorite: data.isFavorite } : null);
      }
      // Re-fetch queue to stay synced
      fetchQueue();
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
    }
  };

  // Control Functions
  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleNext = () => {
    if (queue.length === 0) return;
    const currentIndex = queue.findIndex(s => s.id === currentSong?.id);
    if (isShuffle) {
      const randomIndex = Math.floor(Math.random() * queue.length);
      playSong(queue[randomIndex]);
    } else if (currentIndex < queue.length - 1) {
      playSong(queue[currentIndex + 1]);
    } else {
      // Loop to beginning of queue
      playSong(queue[0]);
    }
  };

  const handlePrevious = () => {
    if (queue.length === 0) return;
    const currentIndex = queue.findIndex(s => s.id === currentSong?.id);
    if (currentIndex > 0) {
      playSong(queue[currentIndex - 1]);
    } else {
      // Loop to end of queue
      playSong(queue[queue.length - 1]);
    }
  };

  // Seek functionality
  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !audioRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const newTime = (clickX / width) * duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Seek directly to lyric timestamp
  const handleLyricClick = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
      if (!isPlaying) {
        setIsPlaying(true);
      }
    }
  };

  // Search trigger
  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      console.error("Failed to search:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // Fullscreen trigger
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error("Error going fullscreen:", err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  return (
    <div className="flex flex-col h-screen font-sans bg-[#0a0a0a] text-white overflow-hidden antialiased">
      {/* Hidden Native Audio Element */}
      {currentSong && (
        <audio
          ref={audioRef}
          src={currentSong.audioUrl}
          onTimeUpdate={() => {
            if (audioRef.current) {
              setCurrentTime(audioRef.current.currentTime);
            }
          }}
          onLoadedMetadata={() => {
            if (audioRef.current) {
              setDuration(audioRef.current.duration);
            }
          }}
          onEnded={() => {
            if (isRepeat) {
              if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play();
              }
            } else {
              handleNext();
            }
          }}
        />
      )}

      {/* Main Layout Container */}
      <div className="flex flex-1 h-[calc(100vh-96px)] relative overflow-hidden">
        
        {/* Left Sidebar Component */}
        <nav className="w-64 flex flex-col py-8 px-6 border-r border-[#1a1a1a] bg-black z-40 shrink-0">
          <div className="mb-8 flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight italic text-white leading-none">AETHER</h1>
              <p className="text-gray-500 text-[9px] uppercase tracking-wider mt-0.5 font-bold">Sonic Player</p>
            </div>
          </div>

          {/* Navigation links */}
          <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto custom-scrollbar">
            <button
              onClick={() => setCurrentView("library")}
              className={`flex items-center gap-4 px-4 py-3 font-medium transition-all duration-200 rounded-lg cursor-pointer text-left ${
                currentView === "library"
                  ? "text-white bg-white/10"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Library className="w-5 h-5" />
              <span>Library</span>
            </button>

            <button
              onClick={() => setCurrentView("search")}
              className={`flex items-center gap-4 px-4 py-3 font-medium transition-all duration-200 rounded-lg cursor-pointer text-left ${
                currentView === "search"
                  ? "text-white bg-white/10"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Search className="w-5 h-5" />
              <span>Search</span>
            </button>

            <button
              onClick={() => setCurrentView("collections")}
              className={`flex items-center gap-4 px-4 py-3 font-medium transition-all duration-200 rounded-lg cursor-pointer text-left ${
                currentView === "collections"
                  ? "text-white bg-white/10"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Folder className="w-5 h-5" />
              <span>Collections</span>
            </button>

            <button
              onClick={() => setCurrentView("queue")}
              className={`flex items-center gap-4 px-4 py-3 font-medium transition-all duration-200 rounded-lg cursor-pointer text-left ${
                currentView === "queue"
                  ? "text-white bg-white/10"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <ListMusic className="w-5 h-5" />
              <span>Queue</span>
            </button>
          </div>

          {/* Playlists static section as requested by Elegant Dark */}
          <div className="mt-4 flex flex-col gap-4 border-t border-[#1a1a1a] pt-4 mb-4">
            <p className="text-xs uppercase tracking-widest text-gray-500 font-bold px-4">Playlists</p>
            <div className="flex flex-col gap-2 px-4">
              <button onClick={() => setCurrentView("library")} className="text-sm text-gray-400 hover:text-white transition-colors text-left truncate">Late Night Jazz</button>
              <button onClick={() => setCurrentView("library")} className="text-sm text-gray-400 hover:text-white transition-colors text-left truncate">Vaporwave Essentials</button>
              <button onClick={() => setCurrentView("library")} className="text-sm text-gray-400 hover:text-white transition-colors text-left truncate">Deep Focus (Coding)</button>
              <button onClick={() => setCurrentView("library")} className="text-sm text-gray-400 hover:text-white transition-colors text-left truncate">Euphoric Trance</button>
            </div>
          </div>

          {/* Premium User Profile in bottom rail */}
          <div className="mt-auto flex items-center gap-3 px-2 py-4 border-t border-[#1a1a1a]">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-tr from-purple-500 to-blue-500 shrink-0 border border-white/10">
              <img
                alt="Alex Chen"
                className="w-full h-full object-cover grayscale"
                referrerPolicy="no-referrer"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDE019018BxhYXsIp7zB_29ADw5voVkz8wTNE0cV2n0Pb1iKaRU1HeKRJiG8ZLV6G4vleByiOo9Ljv8Ii_B-tBfh-yNoxymI6Bmxi4VQcV1dm_HFCyBa15Ry2gSm2YjHhcNF5Nx2JVLcSftaIBYeAcimKL2T4hq_lssJDXvlF_B6lRBmurESeRhtgW3jGfPIfiscAKfc4fiHokE-fRhy_6Z5OkHXkyzUKq7UAiZ5KX73SgZTaTFHF6NEG8Xt5un7rKl-ZCUAkeJ_qM"
              />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">User.dev</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Premium</p>
            </div>
          </div>
        </nav>

        {/* Content Wrapper */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a]">
          
          {/* Header Component */}
          <header className="h-16 flex items-center justify-between px-8 bg-transparent shrink-0">
            <div className="flex items-center gap-3">
              <button className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white hover:bg-black/60 transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white hover:bg-black/60 transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex items-center gap-6">
              <button className="text-xs uppercase font-extrabold tracking-widest text-gray-400 hover:text-white transition-colors">
                Upgrade
              </button>
              <button className="text-gray-400 hover:text-white cursor-pointer transition-colors relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-white rounded-full"></span>
              </button>
            </div>
          </header>

          {/* Core Content views */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-8 pb-8">
            
            {/* 1. Library View (Main Mock UI with Now Playing Split) */}
            {currentView === "library" && (
              <div className="h-full flex flex-col md:flex-row gap-8 items-stretch mt-4">
                
                {/* Left pane: Focused Track Details */}
                <div className="w-full md:w-2/5 flex flex-col justify-center max-w-sm mx-auto md:mx-0 bg-black/30 p-6 rounded-2xl border border-white/5 shadow-xl">
                  {currentSong ? (
                    <>
                      <div className="mb-6 group relative">
                        <div className="aspect-square w-full bg-[#111] border border-white/10 overflow-hidden rounded-xl shadow-2xl transition-all duration-500 group-hover:border-white/20">
                          <img
                            alt={currentSong.title}
                            className="w-full h-full object-cover grayscale contrast-125 transition-transform duration-700 group-hover:scale-105"
                            referrerPolicy="no-referrer"
                            src={currentSong.coverUrl}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <h2 className="text-2xl font-black text-white tracking-tight leading-none">
                            {currentSong.title}
                          </h2>
                          <button
                            onClick={() => toggleFavorite(currentSong.id)}
                            className="text-gray-400 hover:text-white cursor-pointer transition-colors"
                          >
                            <Heart
                              className={`w-6 h-6 transition-all ${
                                currentSong.isFavorite ? "fill-white text-white scale-110" : ""
                              }`}
                            />
                          </button>
                        </div>
                        <p className="text-base text-gray-400 font-medium">{currentSong.artist}</p>
                      </div>

                      {/* Music Metadata Pills */}
                      <div className="mt-6 flex flex-wrap gap-2 border-t border-white/10 pt-6">
                        {currentSong.tags?.map((tag, i) => (
                          <span
                            key={i}
                            className="text-[9px] uppercase tracking-widest text-gray-400 font-bold px-2.5 py-1 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 hover:text-white transition-colors"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12">
                      <Music className="w-12 h-12 text-gray-500 mx-auto mb-4 animate-pulse" />
                      <p className="text-sm text-gray-400">Select a song to start playing</p>
                    </div>
                  )}
                </div>

                {/* Right pane: Minimalist scrolling lyrics panel */}
                <div className="flex-1 flex flex-col justify-center min-h-[300px]">
                  {showLyricsPanel && currentSong && currentSong.lyrics && currentSong.lyrics.length > 0 ? (
                    <div className="relative">
                      {/* Top Fade */}
                      <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-[#1a1a1a] to-transparent pointer-events-none z-10"></div>
                      
                      <div
                        ref={lyricsContainerRef}
                        className="h-[55vh] overflow-y-auto custom-scrollbar pr-4 space-y-8 py-24 relative scroll-smooth"
                      >
                        {currentSong.lyrics.map((line, index) => {
                          const isActive = index === activeLyricIndex;
                          return (
                            <p
                              key={index}
                              ref={isActive ? activeLyricRef : null}
                              onClick={() => handleLyricClick(line.time)}
                              className={`lyric-line text-2xl md:text-3xl font-bold tracking-tight text-left cursor-pointer transition-all duration-300 origin-left hover:text-white ${
                                isActive
                                  ? "text-white opacity-100 scale-105 font-black drop-shadow-[0_0_12px_rgba(255,255,255,0.15)]"
                                  : "text-gray-400 opacity-25 hover:opacity-75"
                              }`}
                            >
                              {line.text}
                            </p>
                          );
                        })}
                      </div>

                      {/* Bottom Fade */}
                      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#0a0a0a] to-transparent pointer-events-none z-10"></div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-600">
                      <Mic2 className="w-12 h-12 mb-3" />
                      <p className="text-sm">Lyrics are disabled or unavailable for this song</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. Search View */}
            {currentView === "search" && (
              <div className="space-y-6 mt-4">
                <div>
                  <h2 className="text-3xl font-black text-white tracking-tight mb-2">Search</h2>
                  <p className="text-sm text-gray-400">Search across our high-fidelity collection</p>
                </div>

                <div className="relative max-w-xl">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="Search songs, artists, or albums..."
                    className="w-full bg-white/5 border border-white/10 focus:border-white/30 focus:ring-1 focus:ring-white/20 rounded-xl pl-12 pr-4 py-3.5 text-sm text-white placeholder-gray-500 outline-none transition-all"
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white animate-spin" />
                  )}
                </div>

                {searchQuery.trim() ? (
                  <div className="space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Search Results
                    </h3>
                    {searchResults.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {searchResults.map(song => (
                          <div
                            key={song.id}
                            onClick={() => playSong(song)}
                            className="flex items-center gap-4 p-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-xl transition-all cursor-pointer group"
                          >
                            <div className="w-16 h-16 rounded-lg overflow-hidden bg-[#111] border border-white/10 shrink-0">
                              <img
                                alt={song.title}
                                className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300"
                                src={song.coverUrl}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-white truncate group-hover:text-white">
                                {song.title}
                              </p>
                              <p className="text-xs text-gray-400 truncate">{song.artist}</p>
                              <p className="text-[10px] text-gray-500 mt-1">{song.album}</p>
                            </div>
                            <div className="flex items-center gap-3 pr-2">
                              <span className="text-xs text-gray-400 font-mono">
                                {formatTime(song.duration)}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFavorite(song.id);
                                }}
                                className="text-gray-400 hover:text-white"
                              >
                                <Heart
                                  className={`w-4.5 h-4.5 ${
                                    song.isFavorite ? "fill-white text-white" : ""
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-12 text-center text-gray-500">
                        No results found for "{searchQuery}"
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Popular Searches
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      {songs.map(song => (
                        <div
                           key={song.id}
                           onClick={() => playSong(song)}
                           className="p-4 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-xl cursor-pointer transition-all text-center group"
                        >
                          <div className="aspect-square w-full rounded-lg overflow-hidden bg-[#111] border border-white/5 mb-3 max-w-[150px] mx-auto">
                            <img
                              alt={song.title}
                              className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
                              src={song.coverUrl}
                            />
                          </div>
                          <p className="font-bold text-white text-sm truncate">{song.title}</p>
                          <p className="text-xs text-gray-400 truncate mt-0.5">{song.artist}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. Collections View */}
            {currentView === "collections" && (
              <div className="space-y-8 mt-4">
                <div>
                  <h2 className="text-3xl font-black text-white tracking-tight mb-2">Collections</h2>
                  <p className="text-sm text-gray-400">Sleek curations and master recordings</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Curated collection card 1 */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden group hover:border-white/20 transition-all flex flex-col justify-between">
                    <div className="p-6">
                      <div className="aspect-video w-full rounded-xl overflow-hidden bg-black/40 border border-white/5 mb-4">
                        <img
                          alt="Echoes of the Void"
                          className="w-full h-full object-cover grayscale contrast-125 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
                          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCr77MzwDtFmXNexTVcKbdvTgwVcnbDI-Pp65oRzw7ik15IRjp1rFdD6Wl8BRoVrM6_zyT7GdgNtdFO6udAvd0wBjqKo1wt2pF378jbW7hk4ArLHK1o1E4NttP3ylPuA_saHYIpbsrBfHB3tPkfYI_2uJBraGdBlLyeYcQ8l840UbKUslYJoSwrb2A-HA1KQPQRHT9mvOs7lj8IeDVpCRFCKtI9oTQ9AbU4XRx0mE9WfMrTOqne6hhc7WFHINNYRTwn05rqDvdn-6k"
                        />
                      </div>
                      <h3 className="text-lg font-bold text-white tracking-tight">Echoes of the Void</h3>
                      <p className="text-xs text-gray-400 mt-1">By Lumina Void</p>
                      <p className="text-xs text-gray-400/70 mt-3 line-clamp-2 leading-relaxed">
                        A dynamic ambient study crossing the threshold between human expression and synthetic harmony.
                      </p>
                    </div>
                    <div className="p-6 pt-0 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-gray-500">2 TRACKS • LOSSLESS</span>
                      <button 
                        onClick={() => {
                          const song = songs.find(s => s.album === "Echoes of the Void");
                          if (song) playSong(song);
                        }}
                        className="text-xs font-bold text-white hover:underline uppercase tracking-wider"
                      >
                        Play Collection
                      </button>
                    </div>
                  </div>

                  {/* Curated collection card 2 */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden group hover:border-white/20 transition-all flex flex-col justify-between">
                    <div className="p-6">
                      <div className="aspect-video w-full rounded-xl overflow-hidden bg-black/40 border border-white/5 mb-4">
                        <img
                          alt="Monolith"
                          className="w-full h-full object-cover grayscale contrast-125 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
                          src="https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=600&auto=format&fit=crop"
                        />
                      </div>
                      <h3 className="text-lg font-bold text-white tracking-tight">Monolith</h3>
                      <p className="text-xs text-gray-400 mt-1">By Cyber Aether</p>
                      <p className="text-xs text-gray-400/70 mt-3 line-clamp-2 leading-relaxed">
                        Profound textures, digital dust and sprawling synth landscapes designed for deep focus.
                      </p>
                    </div>
                    <div className="p-6 pt-0 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-gray-500">1 TRACK • HI-RES</span>
                      <button 
                        onClick={() => {
                          const song = songs.find(s => s.album === "Monolith");
                          if (song) playSong(song);
                        }}
                        className="text-xs font-bold text-white hover:underline uppercase tracking-wider"
                      >
                        Play Collection
                      </button>
                    </div>
                  </div>

                  {/* Curated collection card 3 */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden group hover:border-white/20 transition-all flex flex-col justify-between">
                    <div className="p-6">
                      <div className="aspect-video w-full rounded-xl overflow-hidden bg-black/40 border border-white/5 mb-4">
                        <img
                          alt="Silicon Horizons"
                          className="w-full h-full object-cover grayscale contrast-125 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
                          src="https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=600&auto=format&fit=crop"
                        />
                      </div>
                      <h3 className="text-lg font-bold text-white tracking-tight">Silicon Horizons</h3>
                      <p className="text-xs text-gray-400 mt-1">By Neural Wave</p>
                      <p className="text-xs text-gray-400/70 mt-3 line-clamp-2 leading-relaxed">
                        Nostalgic synthwaves, driving rhythms, and beautiful neon decays echoing through processing cores.
                      </p>
                    </div>
                    <div className="p-6 pt-0 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-gray-500">1 TRACK • LOSSLESS</span>
                      <button 
                        onClick={() => {
                          const song = songs.find(s => s.album === "Silicon Horizons");
                          if (song) playSong(song);
                        }}
                        className="text-xs font-bold text-white hover:underline uppercase tracking-wider"
                      >
                        Play Collection
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. Queue View */}
            {currentView === "queue" && (
              <div className="space-y-6 mt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-black text-white tracking-tight mb-2">Play Queue</h2>
                    <p className="text-sm text-gray-400">Your current line-up of stellar frequencies</p>
                  </div>
                  <button
                    onClick={() => {
                      // Reset queue to all songs
                      const ids = songs.map(s => s.id);
                      fetch("/api/queue", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ songIds: ids })
                      }).then(() => fetchQueue());
                    }}
                    className="text-xs font-bold text-gray-300 hover:text-white border border-white/10 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    Reset Queue
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Now Playing indicator in queue */}
                  {currentSong && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Now Playing
                      </h3>
                      <div className="flex items-center gap-4 p-4 bg-white/10 border border-white/10 rounded-xl">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-black border border-white/10">
                          <img
                            alt={currentSong.title}
                            className="w-full h-full object-cover grayscale"
                            src={currentSong.coverUrl}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white truncate">{currentSong.title}</p>
                          <p className="text-xs text-gray-400 truncate">{currentSong.artist}</p>
                        </div>
                        <span className="text-[10px] font-mono text-white tracking-widest uppercase font-bold mr-4 animate-pulse px-2 py-1 bg-white/10 rounded">
                          PLAYING
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Upcoming section */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Next Up
                    </h3>
                    {queue.length > 0 ? (
                      <div className="space-y-2">
                        {queue.map((song, i) => {
                          const isCurrent = song.id === currentSong?.id;
                          return (
                            <div
                              key={`${song.id}-${i}`}
                              onClick={() => playSong(song)}
                              className={`flex items-center gap-4 p-3 rounded-xl border transition-all cursor-pointer group ${
                                isCurrent
                                  ? "bg-white/10 border-white/10 opacity-60"
                                  : "bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10"
                              }`}
                            >
                              <div className="text-xs font-mono text-gray-500 w-5 text-center">
                                {i + 1}
                              </div>
                              <div className="w-10 h-10 rounded-lg overflow-hidden bg-black shrink-0 border border-white/5">
                                <img
                                  alt={song.title}
                                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300"
                                  src={song.coverUrl}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`font-bold truncate ${isCurrent ? "text-white" : "text-white group-hover:text-white"}`}>
                                  {song.title}
                                </p>
                                <p className="text-xs text-gray-400 truncate">{song.artist}</p>
                              </div>
                              <span className="text-xs text-gray-500 font-mono">
                                {formatTime(song.duration)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-8 text-center text-gray-500">
                        Queue is empty
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Footer Component Implementation */}
      <footer className="fixed bottom-0 left-0 w-full h-24 z-50 bg-[#050505] border-t border-[#1a1a1a] flex items-center justify-between px-10">
        
        {/* Mini Player Info */}
        <div className="flex items-center gap-4 w-1/4 min-w-[200px]">
          {currentSong ? (
            <>
              <div 
                onClick={() => setCurrentView("library")}
                className="w-12 h-12 bg-black/40 border border-white/10 rounded-xl overflow-hidden shrink-0 cursor-pointer hover:scale-[1.03] active:scale-95 transition-all"
              >
                <img
                  alt={currentSong.title}
                  className="w-full h-full object-cover grayscale"
                  src={currentSong.coverUrl}
                />
              </div>
              <div className="min-w-0">
                <span 
                  onClick={() => setCurrentView("library")}
                  className="block text-sm font-bold text-white tracking-tight cursor-pointer hover:underline truncate"
                >
                  {currentSong.title}
                </span>
                <span className="block text-xs text-gray-400 truncate">{currentSong.artist}</span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center">
                <Music className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <span className="block text-sm font-bold text-white">No song loaded</span>
                <span className="block text-xs text-gray-500">Select a track</span>
              </div>
            </div>
          )}
        </div>

        {/* Center Playback Controls */}
        <div className="flex flex-col items-center gap-2.5 flex-1 max-w-xl px-4">
          <div className="flex items-center gap-6 md:gap-8">
            <button
              onClick={() => setIsShuffle(!isShuffle)}
              title="Shuffle"
              className={`p-1 transition-colors relative cursor-pointer ${
                isShuffle ? "text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              <Shuffle className="w-4.5 h-4.5" />
              {isShuffle && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full"></span>}
            </button>

            <button
              onClick={handlePrevious}
              title="Previous"
              className="text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              onClick={handlePlayPause}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-black hover:scale-110 active:scale-95 transition-all cursor-pointer shadow-lg"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={handleNext}
              title="Next"
              className="text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <SkipForward className="w-5 h-5" />
            </button>

            <button
              onClick={() => setIsRepeat(!isRepeat)}
              title="Repeat"
              className={`p-1 transition-colors relative cursor-pointer ${
                isRepeat ? "text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              <Repeat className="w-4.5 h-4.5" />
              {isRepeat && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full"></span>}
            </button>
          </div>

          {/* Timeline slider */}
          <div className="w-full flex items-center gap-4">
            <span className="text-[10px] font-mono text-gray-400 w-9 text-right select-none">
              {formatTime(currentTime)}
            </span>
            <div
              ref={progressBarRef}
              onClick={handleProgressBarClick}
              className="flex-1 h-1 bg-white/10 relative group cursor-pointer rounded-full"
            >
              <div
                className="absolute h-full bg-white rounded-full transition-all duration-100"
                style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
              ></div>
              <div
                className="absolute h-3 w-3 bg-white rounded-full -top-1 -ml-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                style={{ left: `${(currentTime / (duration || 1)) * 100}%` }}
              ></div>
            </div>
            <span className="text-[10px] font-mono text-gray-400 w-9 text-left select-none">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Secondary Controls (Right Pane) */}
        <div className="flex items-center justify-end gap-5 w-1/4 min-w-[200px]">
          <button
            onClick={() => setShowLyricsPanel(!showLyricsPanel)}
            title="Toggle Lyrics"
            className={`p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer ${
              showLyricsPanel ? "text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            <Mic2 className="w-4.5 h-4.5" />
          </button>

          <button
            onClick={() => setCurrentView("queue")}
            title="Queue"
            className={`p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer ${
              currentView === "queue" ? "text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            <ListMusic className="w-4.5 h-4.5" />
          </button>

          {/* Volume control with mute toggle */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="text-gray-400 hover:text-white transition-colors cursor-pointer p-1"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4.5 h-4.5" />
              ) : volume < 0.4 ? (
                <Volume1 className="w-4.5 h-4.5" />
              ) : (
                <Volume2 className="w-4.5 h-4.5" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                if (isMuted) setIsMuted(false);
              }}
              className="w-16 sm:w-20 accent-white h-1 bg-white/20 rounded-full appearance-none cursor-pointer hover:bg-white/30 transition-colors"
            />
          </div>

          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            className="text-gray-400 hover:text-white transition-colors cursor-pointer p-1"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4.5 h-4.5" />
            ) : (
              <Maximize2 className="w-4.5 h-4.5" />
            )}
          </button>
        </div>

      </footer>
    </div>
  );
}
