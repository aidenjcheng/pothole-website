import type { mapkit } from '@types/apple-mapkit-js-browser';

declare global {
  interface Window {
    mapkit: typeof mapkit;
    initMapKit?: () => void;
    searchDebounceTimer?: NodeJS.Timeout;
  }
}

export interface Pothole {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  created_at: string;
  upvote_count?: number;
  user_id?: string;
}

export type VoteType = 'upvote' | 'downvote';

export interface PotholeVote {
  id: string;
  pothole_id: string;
  user_id: string;
  vote_type: VoteType;
  created_at: string;
}

export interface SearchResult {
  id: string;
  name: string;
  created_at: string;
}

export interface MapKitMapState {
  potholes: Pothole[];
  loading: boolean;
  searchQuery: string;
  searchResults: Pothole[];
  showResults: boolean;
  activeResultIndex: number;
}

export interface Database {
  public: {
    Tables: {
      potholes: {
        Row: Pothole;
        Insert: Omit<Pothole, 'id' | 'created_at'>;
        Update: Partial<Omit<Pothole, 'id' | 'created_at'>>;
      };
      pothole_votes: {
        Row: PotholeVote;
        Insert: Omit<PotholeVote, 'id' | 'created_at'>;
        Update: Partial<Omit<PotholeVote, 'id' | 'created_at'>>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
