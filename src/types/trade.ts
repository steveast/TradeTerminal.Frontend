export interface IStrategy {
  entryPrice: number;
  positionSide: 'LONG' | 'SHORT',
  side: 'BUY' | 'SELL';
  stopLoss: number;
  symbol: string; // 'BTCUSDT',
  takeProfit: number;
  usdAmount: number;
}

export interface IUnrealizedStrategy {
  entry: number;
  isFull: boolean;
  positionSide: 'LONG' | 'SHORT';
  sl: number;
  tp: number;
}

export interface ISymbolInfo {
  minQty: number;
  precision: number;
  stepSize: number;
  tickSize: number;
}

export type IPosition = {
  askNotional: number;              // номинал заявок на продажу
  bidNotional: number;              // номинал заявок на покупку
  breakEvenPrice: number;           // цена безубыточности
  entryPrice: number;               // цена входа
  initialMargin: number;            // использованная начальная маржа
  isolated: boolean;                // изолированная маржа
  isolatedWallet: number;           // баланс изолированного кошелька
  leverage: number;                 // кредитное плечо
  maintMargin: number;              // поддерживающая маржа
  maxNotional: number;              // максимальный допустимый номинал
  notional: number;                 // номинал позиции
  openOrderInitialMargin: number;   // маржа под открытые ордера
  positionAmt: number;              // размер позиции
  positionInitialMargin: number;    // начальная маржа позиции
  positionSide: 'LONG' | 'SHORT'; // сторона позиции
  stopLoss: IAlgoOrder;
  symbol: string;                   // торговая пара
  takeProfit: IAlgoOrder;
  unrealizedProfit: number;         // нереализованный PnL
  updateTime: number;               // время обновления
};

export interface IAlgoOrder {
  actualOrderId: number;
  actualPrice: number;
  algoId: number;
  algoStatus: string;
  algoType: string;
  clientAlgoId: string;
  closePosition: boolean;
  createTime: number;
  goodTillDate: number;
  icebergQuantity: number | null;
  orderType: string;
  positionSide: string;
  price: number;
  priceMatch: string;
  priceProtect: boolean;
  quantity: number;
  reduceOnly: boolean;
  selfTradePreventionMode: string;
  side: string;
  symbol: string;
  timeInForce: string;
  tpOrderType: number;
  triggerPrice: number;
  triggerTime: number;
  updateTime: number;
  workingType: string;
}

export interface ILimitOrder {
  avgPrice: number;
  clientOrderId: string;
  closePosition: boolean;
  cumQuote: number;
  executedQty: number;
  goodTillDate: number;
  orderId: number;
  origQty: number;
  origType: string;
  positionSide: 'LONG' | 'SHORT';
  price: number;
  priceMatch: 'NONE' | 'OPPONENT' | 'QUEUE';
  priceProtect: boolean;
  reduceOnly: boolean;
  selfTradePreventionMode: 'EXPIRE_MAKER' | 'NONE';
  side: 'BUY' | 'SELL';
  status: 'NEW' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELED' | 'EXPIRED';
  stopPrice: number;
  symbol: string;
  time: number;
  timeInForce: 'GTC' | 'IOC' | 'FOK';
  type: 'LIMIT' | 'MARKET' | 'STOP' | 'TAKE_PROFIT';
  updateTime: number;
  workingType: 'MARK_PRICE' | 'CONTRACT_PRICE';
}
