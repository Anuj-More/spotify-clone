export interface LyricLine {
  time: number;
  text: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  audioUrl: string;
  duration: number;
  tags: string[];
  lyrics: LyricLine[];
  isFavorite?: boolean;
}

export type ViewType = "home" | "search" | "library" | "collections" | "queue";
