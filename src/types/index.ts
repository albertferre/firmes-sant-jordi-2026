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

export type ActiveView = 'list' | 'favorites' | 'map';

export type Locale = 'ca' | 'es';
