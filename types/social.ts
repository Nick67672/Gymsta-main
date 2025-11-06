export interface Story {
  id: string;
  media_url: string;
  user_id: string;
}

export interface UserProfileBasic {
  id?: string;
  username: string;
  avatar_url: string | null;
  is_verified?: boolean;
  gym?: string | null;
  has_story?: boolean; // for Story rail convenience
  is_private?: boolean;
}

export interface Post {
  id: string;
  user_id: string;
  caption: string | null;
  image_url: string;
  image_urls?: string[]; // Array of multiple images for carousel
  media_type: string;
  created_at: string;
  product_id: string | null;
  workout_id?: string | null;
  post_type?: 'regular' | 'workout' | 'achievement';
  profiles: any;
  likes: {
    id: string;
    user_id: string;
  }[];
}

export interface Workout {
  id: string;
  user_id: string;
  exercises: any[];
  duration_minutes?: number;
  total_volume?: number;
  created_at: string;
  profiles: any;
  workout_sharing_information?: {
    title?: string | null;
    caption?: string | null;
    photo_url?: string | null;
    is_my_gym?: boolean;
  }[] | null;
}

export interface Notification {
  id: string;
  user_id: string;
  actor_id: string;
  type: 'like' | 'follow';
  post_id?: string;
  created_at: string;
  read: boolean;
  actor: {
    id: string;
    username: string;
    avatar_url: string | null;
    is_verified?: boolean;
  };
  post?: {
    id: string;
    image_url: string;
  };
}

export interface FollowRequest {
  id: string;
  requester_id: string;
  requested_id: string;
  created_at: string;
  requester: {
    id: string;
    username: string;
    avatar_url: string | null;
    is_verified?: boolean;
  };
}

export type Profile = UserProfileBasic; 