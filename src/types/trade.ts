export interface IStrategy {
  entryPrice: number;
  positionSide: 'LONG' | 'SHORT',
  side: 'BUY' | 'SELL';
  stopLoss: number;
  symbol: string; // 'BTCUSDT',
  takeProfit: number;
  usdAmount: number;
}

export interface ISymbolInfo {
  minQty: number;
  precision: number;
  stepSize: number;
  tickSize: number;
}

export interface IPosition {
  entryOrderId: string;
  entryPrice: number;
  positionSide: 'LONG' | 'SHORT';
  quantity: string; // "0.083"
  slAlgoId: number;
  stopLoss: number;
  takeProfit: number;
  tpAlgoId: number;
}
