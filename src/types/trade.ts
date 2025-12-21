export interface IStrategy {
  entryPrice: number;
  positionSide: 'LONG' | 'SHORT',
  side: 'BUY' | 'SELL';
  stopLoss: number;
  symbol: string; // 'BTCUSDT',
  takeProfit: number;
  usdAmount: number;
}
