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
  cover: string;
  description: string;
  publishedDate: string;
  publisher: string;
  isbn: string;
}

export interface AuthorLinks {
  goodreads?: string;
  wikipediaEs?: string;
  wikipediaCa?: string;
  planeta?: string;
  googleBooks?: string;
  twitter?: string;
  instagram?: string;
  youtube?: string;
  tiktok?: string;
  facebook?: string;
  website?: string;
}

export interface AuthorInfo {
  name: string;
  photo: string;
  bioEs: string;
  bioCa: string;
  generatedBioEs: string;
  generatedBioCa: string;
  presentingBook: string;
  books: AuthorBook[];
  goodreadsUrl: string;
  rating: string;
  ratingsCount: string;
  wikiUrl: string;
  planetaUrl: string;
  links: AuthorLinks;
}

export type ActiveView = 'list' | 'favorites' | 'author';

export type Locale = 'ca' | 'es';
