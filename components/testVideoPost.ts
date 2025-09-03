// Example test data for a video post
import { Post } from '../types/social';

export const testVideoPost: Post = {
  id: 'test-video-1',
  user_id: 'user-123',
  caption: 'Check out this awesome workout! 💪',
  image_url: 'https://www.w3schools.com/html/mov_bbb.mp4', // public sample video
  media_type: 'video',
  created_at: new Date().toISOString(),
  product_id: null,
  profiles: {
    id: 'user-123',
    username: 'videouser',
    avatar_url: 'https://randomuser.me/api/portraits/men/32.jpg',
    is_verified: true,
  },
  likes: [
    { id: 'like-1', user_id: 'user-456' },
    { id: 'like-2', user_id: 'user-789' },
  ],
};
