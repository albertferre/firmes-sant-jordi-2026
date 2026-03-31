export interface Signing {
  id: string;
  author: string;
  book: string;
  publisher: string;
  location: string;
  address: string;
  coordinates: { lat: number; lng: number };
  startTime: string;
  endTime: string;
  image?: string;
}

export interface AuthorBook {
  title: string;
  url: string;
}

export interface AuthorInfo {
  name: string;
  goodreadsUrl: string;
  photo: string;
  bio: string;
  bornInfo: string;
  rating: string;
  ratingsCount: string;
  books: AuthorBook[];
  genres: string[];
}

export type ActiveView = 'list' | 'favorites' | 'map' | 'author';

export type Locale = 'ca' | 'es';
