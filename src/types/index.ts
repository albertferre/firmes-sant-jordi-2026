export interface Firma {
  id: string;
  autor: string;
  libro: string;
  editorial: string;
  ubicacion: string;
  direccion: string;
  coordenadas: { lat: number; lng: number };
  horaInicio: string;
  horaFin: string;
  imagen?: string;
}

export type VistaActiva = 'lista' | 'mapa';
