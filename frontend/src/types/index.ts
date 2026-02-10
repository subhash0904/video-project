// ============================================
// API Response Types
// ============================================

export type VideoCategory =
  | 'FILM_ANIMATION'
  | 'AUTOS_VEHICLES'
  | 'MUSIC'
  | 'PETS_ANIMALS'
  | 'SPORTS'
  | 'TRAVEL_EVENTS'
  | 'GAMING'
  | 'PEOPLE_BLOGS'
  | 'COMEDY'
  | 'ENTERTAINMENT'
  | 'NEWS_POLITICS'
  | 'HOWTO_STYLE'
  | 'EDUCATION'
  | 'SCIENCE_TECH'
  | 'NONPROFITS_ACTIVISM'
  | 'KIDS'
  | 'OTHER';

export interface Video {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  duration: number;
  views: number;
  likes: number;
  dislikes?: number;
  commentCount?: number;
  type: 'STANDARD' | 'SHORT';
  status?: 'PROCESSING' | 'READY' | 'FAILED';
  category?: VideoCategory;
  publishedAt: string;
  channel: Channel;
  qualities?: VideoQuality[];
  hlsUrl?: string;
}

export interface VideoQuality {
  quality: string;
  url: string;
  width: number;
  height: number;
  bitrate: number;
}

export interface Channel {
  id: string;
  name: string;
  handle: string;
  avatarUrl?: string;
  bannerUrl?: string;
  description?: string;
  verified: boolean;
  subscriberCount: number;
}

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  channel?: Channel;
}

export interface VideoFeedResponse {
  videos: Video[];
  total: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: PaginationMeta;
}
