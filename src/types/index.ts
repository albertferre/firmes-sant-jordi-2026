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
  rating: string;
  ratingsCount: string;
  url: string;
}

export interface AuthorIndex {
  name: string;
  photo: string;
  presentingBook: string;
  goodreadsFollowers: number;
  goodreadsUrl: string;
  openLibraryUrl: string;
  wikiUrl: string;
  planetaUrl: string;
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
  openLibraryUrl: string;
  goodreadsFollowers: number;
  wikiUrl: string;
  planetaUrl: string;
  links: AuthorLinks;
}

export type ActiveView = 'list' | 'favorites' | 'map' | 'author';

export type Locale = 'ca' | 'es';
