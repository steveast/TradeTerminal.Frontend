import { IAlgoOrder, ILimitOrder, IPosition, IStrategy, ISymbolInfo, IUnrealizedStrategy } from '@app/types/trade';
import { roundNumbers } from '@app/utils/roundNumbers';
import { observable, makeObservable, action, runInAction, toJS, computed } from 'mobx';
import { ArrayQueue, ConstantBackoff, Websocket, WebsocketBuilder } from 'websocket-ts';
import LoaderModel from './LoaderModel';



interface ITerminalModel {
  currentPrice: number;
  deposit: number;
  isGraphReady: boolean;
  leverage: number;
  positions: IPosition[];
  strategy: IStrategy;
  symbol: string;
  symbolInfo: ISymbolInfo;
}

export class TerminalModel implements ITerminalModel {
  // Trading
  @observable currentPrice: number = 0;
  @observable symbol: string = 'BTCUSDT';
  @observable deposit: number = 0;
  @observable leverage: number = 10;
  @observable positions: IPosition[] = [];

  @observable algoOrders: IAlgoOrder[] = [];
  @observable limitOrders: ILimitOrder[] = [];
  @observable allOrders: (ILimitOrder & IAlgoOrder)[] = [];

  @observable symbolInfo: ISymbolInfo = {
    minQty: 100,
    precision: 1,
    stepSize: 0.1,
    tickSize: 1,
  };

  @observable strategy: IStrategy = {
    entryPrice: 0,
    positionSide: 'LONG',
    side: 'BUY',
    stopLoss: -(this.currentPrice * 0.09),
    symbol: this.symbol,
    takeProfit: this.currentPrice * 0.09,
    usdAmount: this.notional
  };


  // Connection
  @observable connected: boolean = false;
  @observable status: 'disconnected' | 'connecting' | 'connected' = 'disconnected';

  // Infrastructure
  @observable isGraphReady: boolean = false;

  // Sub models
  public loader = new LoaderModel();

  // Privates
  private ws: Websocket;

  constructor() {
    makeObservable(this);
    this.ws = new WebsocketBuilder('ws://localhost:3001')
      .withBackoff(new ConstantBackoff(2000)) // reconnect каждые 2 секунды
      .withBuffer(new ArrayQueue()) // буферизует сообщения при отключении
      .onOpen((i, ev) => {
        console.log('WS подключён');
        this.connected = true;
      })
      .onClose((i, ev) => {
        console.log('WS отключён');
        this.connected = false;
      })
      .onError((i, ev) => {
        console.error('WS ошибка:', ev);
      })
      .onMessage((i, ev) => {
        try {
          const { data, type, message }: any = JSON.parse(ev.data);

          if (!data.closeTime) {
            console.log(`Got ${type}`, data);
          }

          switch (type) {
            case 'candles':
              //setCandle(msg.data);
              break;
            case 'positions':
              runInAction(() => {
                this.positions = data.map((x: IPosition) => ({
                  ...roundNumbers(x, this.symbolInfo.tickSize),
                  takeProfit: roundNumbers(x.takeProfit, this.symbolInfo.tickSize),
                  stopLoss: roundNumbers(x.stopLoss, this.symbolInfo.tickSize),
                }));
              });
              break;
            case 'status':
              this.status = data;
              break;
            case 'symbolChanged':
              // setCurrentSymbol(msg.symbol);
              // setCurrentInterval(msg.interval);
              break;
            case 'strategy':
              console.log('Strategy created successfully!', data);
              this.modifyStrategy(data);
              this.getAllOpenOrders();
              break;
            case 'symbolInfo':
              this.symbolInfo = data;
              break;
            case 'accountInfo':
              runInAction(() => {
                const deposit = parseInt(data.availableBalance, 10);
                this.deposit = deposit;
                this.modifyStrategy({ usdAmount: this.notional });
              });
              break;
            case 'getAllOpenOrders':
              runInAction(() => {
                this.algoOrders = data.algoOrders;
                this.limitOrders = data.limitOrders;
                this.allOrders = data.all;
              })
              break;
            case 'cancelAllOrders':
              console.log('Cancel algo: ', data.algo.map((x: any) => x.msg).join(', '));
              console.log('Cancel limit: ', data.limit.msg);
              break;
            case 'cancelOrder':
              this.getAllOpenOrders();
              break;
            case 'error':
              console.error('Ошибка от сервера:', message);
              break;
          }
          this.loader.resolve(type, data);
        } catch (e) {
          console.warn('Не удалось распарсить сообщение:', ev.data);
        }
      })
      .onRetry((i, ev) => {
        console.log('Попытка переподключения...');
      })
      .build();
  }

  /**
   * Присваивает значения в модель (batch обновления)
   */
  @action.bound
  public commit(patch: Partial<ITerminalModel> = {}): this {
    runInAction(() => {
      Object.assign(this, patch);
    });
    return this;
  }

  // ============== Methods ==============

  @computed
  public get notional() {
    return this.deposit * this.leverage;
  }

  @computed
  public get hasPosition() {
    return this.positions.some((x) => x.symbol === this.symbol);
  }

  @computed
  public get currentPosition() {
    return this.positions.find((x) => x.symbol === this.symbol);
  }

  @computed
  public get unrealizedStrategy() {
    const result: IUnrealizedStrategy = {
      entry: 0,
      sl: 0,
      tp: 0,
      positionSide: 'LONG',
      isFull: false,
    };
    this.allOrders.forEach((order) => {
      if (order.orderType === 'TAKE_PROFIT_MARKET') {
        result.tp = order.triggerPrice;
      }
      if (order.orderType === 'STOP_MARKET') {
        result.sl = order.triggerPrice;
      }
      if (order.type === 'LIMIT') {
        result.entry = order.price;
        result.positionSide = order.positionSide;
      }
    });
    result.isFull = Boolean(result.entry && result.tp && result.sl);
    return result;
  }

  protected send(msg: any) {
    if (this.connected) {
      console.log('Sent: ', msg);
      this.ws.send(JSON.stringify(msg));
      return this.loader.add(msg.type);
    }
    return Promise.resolve();
  }

  public getSymbolInfo() {
    return this.send({
      type: 'symbolInfo',
      payload: {
        symbol: this.symbol,
      },
    });
  }

  public getAccountInfo() {
    return this.send({
      type: 'accountInfo',
    });
  }

  public getPositions() {
    return this.send({
      type: 'getPositions'
    });
  }

  public getAllOpenOrders() {
    return this.send({
      type: 'getAllOpenOrders'
    });
  }

  public marketBuy(usdAmount: number) {
    return this.send({
      type: 'marketOrder',
      payload: {
        symbol: this.symbol,
        side: 'BUY',
        usdAmount,
        positionSide: 'LONG',
      },
    });
  }

  public marketSell(usdAmount: number) {
    return this.send({
      type: 'marketOrder',
      payload: {
        symbol: this.symbol,
        side: 'SELL',
        usdAmount,
        positionSide: 'SHORT',
      },
    });
  }

  public runStrategy() {
    return this.send({
      type: 'strategy',
      payload: toJS(this.strategy),
    });
  }

  public updateStrategy() {
    if (this.currentPosition) {
      const tpChanged = this.strategy.takeProfit !== this.currentPosition.takeProfit.triggerPrice;
      const slChanged = this.strategy.stopLoss !== this.currentPosition.stopLoss.triggerPrice;
      if (tpChanged) {
        this.send({
          type: 'tp:modify',
          payload: toJS({
            symbol: this.symbol,
            algoId: this.currentPosition!.takeProfit.algoId,
            newTriggerPrice: this.strategy.takeProfit,
            positionSide: this.strategy.positionSide,
          }),
        });
      }
      if (slChanged) {
        this.send({
          type: 'sl:modify',
          payload: toJS({
            symbol: this.symbol,
            algoId: this.currentPosition!.stopLoss.algoId,
            newTriggerPrice: this.strategy.stopLoss,
            positionSide: this.strategy.positionSide,
          }),
        });
      }
      if (!tpChanged && !slChanged) {
        this.getPositions();
      }
    }
    return this;
  }

  @action.bound
  public setStrategy(payload: Pick<IStrategy, 'entryPrice' | 'stopLoss' | 'takeProfit' | 'positionSide'>) {
    const riskSum = this.deposit * 0.01;
    const stopPercent =
      Math.abs(payload.entryPrice - payload.stopLoss) /
      payload.entryPrice *
      100;
    const amount = Math.floor(riskSum / (stopPercent / 100));
    const usdAmount = amount >= this.deposit ? this.deposit : amount;

    this.strategy = {
      symbol: this.symbol,
      side: payload.positionSide === 'LONG' ? 'BUY' : 'SELL',
      usdAmount: usdAmount * this.leverage,
      ...payload,
    };
    return this;
  }

  @action.bound
  public modifyStrategy(payload: Partial<IStrategy>) {
    runInAction(() => {
      this.strategy = {
        ...this.strategy,
        ...payload,
      };
    });
    return this;
  }

  public cancelAllOrders() {
    return this.send({
      type: 'cancelAllOrders',
      symbol: this.symbol,
    });
  }

  public cancelOrder({
    orderId,
    clientOrderId
  }: {
    clientOrderId?: string;
    orderId?: number | string;
  }) {
    return this.send({
      type: 'cancelOrder',
      symbol: this.symbol,
      orderId,
      clientOrderId,
    });
  }

  public cancelAlgoOrder(algoId: number) {
    return this.send({
      type: 'cancelAlgoOrder',
      algoId,
    });
  }

  @action
  public removeOrder(id: string | number) {
    this.allOrders = this.allOrders.filter((x) => {
      return x.algoId !== id && x.clientOrderId !== id;
    });
    this.limitOrders = this.limitOrders.filter((x) => {
      return x.clientOrderId !== id;
    });
    this.algoOrders = this.algoOrders.filter((x) => {
      return x.algoId !== id;
    });
    return this;
  }
}
