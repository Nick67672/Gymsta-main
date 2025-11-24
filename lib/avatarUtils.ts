/**
 * Avatar utilities for handling default profile pictures
 * 
 * This module provides gym-themed default avatars for users who haven't uploaded
 * custom profile pictures. The avatars are generated using the DiceBear API with
 * fitness-themed colors and styles.
 * 
 * Available avatar styles:
 * - Identicon: Geometric patterns with gym colors (red, blue, green, orange)
 * - Bottts: Robotic/equipment-like shapes
 * - Avataaars: Human-like avatars with fitness accessories
 * 
 * Colors used: Energetic reds, blues, greens, and oranges that are motivating
 * and appropriate for a fitness application.
 */

/**
 * Get the appropriate avatar URL for a user
 * If the user has a custom avatar, use it
 * Otherwise, return a default avatar based on their username
 */
export const getAvatarUrl = (avatarUrl: string | null, username: string | null | undefined): string => {
  if (avatarUrl && avatarUrl.trim() !== '') {
    return avatarUrl;
  }
  
  // Return a default avatar with the user's initials
  return getDefaultAvatarUrl(username || 'default');
};

/**
 * Generate a default avatar URL using DiceBear API
 * This creates a consistent avatar based on the username
 */
export const getDefaultAvatarUrl = (username: string | null | undefined): string => {
  // Ensure username is a valid string
  const safeUsername = username || 'default';
  
  // Use DiceBear's identicon style for gym-themed geometric avatars
  // This creates consistent, fitness-themed avatars with gym-related colors
  const encodedUsername = encodeURIComponent(safeUsername);
  
  // Gym-themed color palette: energetic reds, blues, greens, and oranges
  const gymColors = [
    'ff4757', // Red
    '2f3542', // Dark gray
    '3742fa', // Blue
    '2ed573', // Green
    'ffa502', // Orange
    'ff6348', // Coral
    '5352ed', // Purple
    'ff3838', // Bright red
    '17c0eb', // Cyan
    'ff9ff3', // Pink
  ];
  
  // Join colors for the API
  const colorString = gymColors.join(',');
  
  // Generate a consistent style choice based on username
  const styleIndex = safeUsername.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 3;
  
  // Choose between different gym-themed styles
  switch (styleIndex) {
    case 0:
      // Geometric identicon style - modern and clean
      return `https://api.dicebear.com/7.x/identicon/svg?seed=${encodedUsername}&backgroundColor=${colorString}&radius=50&scale=80&size=200&backgroundColorLevel=light&backgroundColorVariant=400&backgroundColorType=solid`;
    case 1:
      // Bottts style - more robotic/equipment-like
      return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodedUsername}&backgroundColor=${colorString}&radius=50&scale=80&size=200&backgroundColorLevel=light&backgroundColorVariant=400&backgroundColorType=solid`;
    case 2:
      // Avataaars style - more human-like with fitness accessories
      return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodedUsername}&backgroundColor=${colorString}&radius=50&scale=80&size=200&backgroundColorLevel=light&backgroundColorVariant=400&backgroundColorType=solid&accessories=round&accessoriesChance=50&clothing=shirt&clothingChance=80&clothingColor=random&eyes=normal&hair=short&hairChance=70&mouth=smile&skinColor=random`;
    default:
      return `https://api.dicebear.com/7.x/identicon/svg?seed=${encodedUsername}&backgroundColor=${colorString}&radius=50&scale=80&size=200&backgroundColorLevel=light&backgroundColorVariant=400&backgroundColorType=solid`;
  }
};

/**
 * Generate a gym-themed avatar with fitness equipment icons
 * This creates avatars with dumbbells, weights, and other gym equipment
 */
export const getGymEquipmentAvatarUrl = (username: string): string => {
  const encodedUsername = encodeURIComponent(username);
  
  // Gym equipment themed colors
  const equipmentColors = [
    'ff4757', // Red
    '2f3542', // Dark gray
    '3742fa', // Blue
    '2ed573', // Green
    'ffa502', // Orange
  ];
  
  const colorString = equipmentColors.join(',');
  
  // Use DiceBear's bottts style for more geometric, equipment-like shapes
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodedUsername}&backgroundColor=${colorString}&radius=50&scale=80&size=200&backgroundColorLevel=light&backgroundColorVariant=400&backgroundColorType=solid`;
};

/**
 * Generate a fitness-themed avatar with abstract patterns
 * This creates avatars with energetic, motivational patterns
 */
export const getFitnessPatternAvatarUrl = (username: string): string => {
  const encodedUsername = encodeURIComponent(username);
  
  // Fitness-themed vibrant colors
  const fitnessColors = [
    'ff3838', // Bright red
    '17c0eb', // Cyan
    'ff9ff3', // Pink
    '2ed573', // Green
    'ffa502', // Orange
  ];
  
  const colorString = fitnessColors.join(',');
  
  // Use DiceBear's avataaars style for more human-like fitness avatars
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodedUsername}&backgroundColor=${colorString}&radius=50&scale=80&size=200&backgroundColorLevel=light&backgroundColorVariant=400&backgroundColorType=solid&accessories=round&accessoriesChance=50&clothing=shirt&clothingChance=80&clothingColor=random&eyes=normal&hair=short&hairChance=70&mouth=smile&skinColor=random`;
};

/**
 * Get user initials from username
 * Handles various username formats and special characters
 */
export const getUserInitials = (username: string): string => {
  if (!username || username.trim() === '') {
    return '?';
  }

  // Clean the username and split by common separators
  const cleanUsername = username.trim().replace(/[^a-zA-Z0-9\s]/g, '');
  const parts = cleanUsername.split(/[\s._-]+/).filter(part => part.length > 0);
  
  if (parts.length === 0) {
    return username.charAt(0).toUpperCase();
  }
  
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  
  // Return first letter of first and last parts
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

/**
 * Alternative default avatar using a simple colored background with initials
 * This is a fallback if DiceBear is not available
 */
export const getSimpleDefaultAvatarUrl = (username: string | null | undefined): string => {
  // Ensure username is a valid string
  const safeUsername = username || 'default';
  const initials = getUserInitials(safeUsername);
  // Gym-themed colors: energetic and motivating
  const colors = [
    '#ff4757', // Red
    '#2f3542', // Dark gray
    '#3742fa', // Blue
    '#2ed573', // Green
    '#ffa502', // Orange
    '#ff6348', // Coral
    '#5352ed', // Purple
    '#ff3838', // Bright red
    '#17c0eb', // Cyan
    '#ff9ff3', // Pink
  ];
  
  // Generate a consistent color based on username
  const colorIndex = safeUsername.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  const backgroundColor = colors[colorIndex];
  
  // Create a simple SVG with initials
  const svg = `
    <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="${backgroundColor}"/>
      <text x="100" y="120" font-family="Arial, sans-serif" font-size="60" font-weight="bold" text-anchor="middle" fill="white">${initials}</text>
    </svg>
  `;
  
  // Convert SVG to data URL
  const dataUrl = `data:image/svg+xml;base64,${btoa(svg)}`;
  return dataUrl;
}; 