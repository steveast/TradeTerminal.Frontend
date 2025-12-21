export type TMessage =
  | { data: any; type: 'candle'; }
  | { data: any[]; type: 'positions'; }
  | { data: string; type: 'status'; }
  | { data: any; type: 'symbolChanged'; }
  | { data: any; type: 'orderResult'; }
  | { data: any; type: 'strategy'; }
  | { data: any; type: 'closeResult'; }
  | { message: string; type: 'error'; };