// Event Types and Interfaces

export enum EventType {
  VIDEO_VIEW = 'video.view',
  VIDEO_LIKE = 'video.like',
  VIDEO_DISLIKE = 'video.dislike',
  VIDEO_UNLIKE = 'video.unlike',
  COMMENT_CREATE = 'comment.create',
  COMMENT_LIKE = 'comment.like',
  COMMENT_DELETE = 'comment.delete',
  SUBSCRIPTION_CREATE = 'subscription.create',
  SUBSCRIPTION_DELETE = 'subscription.delete',
  VIDEO_UPLOAD = 'video.upload',
  USER_ACTIVITY = 'user.activity'
}

export interface BaseEvent {
  id: string;
  type: EventType;
  timestamp: number;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface VideoViewEvent extends BaseEvent {
  type: EventType.VIDEO_VIEW;
  videoId: string;
  duration?: number;
  quality?: string;
}

export interface VideoLikeEvent extends BaseEvent {
  type: EventType.VIDEO_LIKE | EventType.VIDEO_DISLIKE | EventType.VIDEO_UNLIKE;
  videoId: string;
}

export interface CommentEvent extends BaseEvent {
  type: EventType.COMMENT_CREATE | EventType.COMMENT_LIKE | EventType.COMMENT_DELETE;
  commentId: string;
  videoId: string;
  parentId?: string;
  content?: string;
}

export interface SubscriptionEvent extends BaseEvent {
  type: EventType.SUBSCRIPTION_CREATE | EventType.SUBSCRIPTION_DELETE;
  channelId: string;
}

export interface VideoUploadEvent extends BaseEvent {
  type: EventType.VIDEO_UPLOAD;
  videoId: string;
  title: string;
  duration?: number;
  size?: number;
}

export type VideoEvent = 
  | VideoViewEvent 
  | VideoLikeEvent 
  | CommentEvent 
  | SubscriptionEvent 
  | VideoUploadEvent;
