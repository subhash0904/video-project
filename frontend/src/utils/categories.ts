export type VideoCategoryId =
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

export const VIDEO_CATEGORY_OPTIONS: { id: VideoCategoryId; label: string }[] = [
  { id: 'MUSIC', label: 'Music' },
  { id: 'GAMING', label: 'Gaming' },
  { id: 'SPORTS', label: 'Sports' },
  { id: 'ENTERTAINMENT', label: 'Entertainment' },
  { id: 'COMEDY', label: 'Comedy' },
  { id: 'EDUCATION', label: 'Education' },
  { id: 'SCIENCE_TECH', label: 'Science & Tech' },
  { id: 'NEWS_POLITICS', label: 'News & Politics' },
  { id: 'HOWTO_STYLE', label: 'Howto & Style' },
  { id: 'PEOPLE_BLOGS', label: 'People & Blogs' },
  { id: 'FILM_ANIMATION', label: 'Film & Animation' },
  { id: 'AUTOS_VEHICLES', label: 'Autos & Vehicles' },
  { id: 'PETS_ANIMALS', label: 'Pets & Animals' },
  { id: 'TRAVEL_EVENTS', label: 'Travel & Events' },
  { id: 'KIDS', label: 'Kids' },
  { id: 'NONPROFITS_ACTIVISM', label: 'Nonprofits & Activism' },
  { id: 'OTHER', label: 'Other' },
];

export const VIDEO_CATEGORY_FILTERS: { id: VideoCategoryId | 'ALL'; label: string }[] = [
  { id: 'ALL', label: 'All' },
  ...VIDEO_CATEGORY_OPTIONS,
];
