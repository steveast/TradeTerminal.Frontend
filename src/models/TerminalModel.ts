import { IAlgoOrder, ILimitOrder, IPosition, IStrategy, ISymbolInfo, IUnrealizedStrategy } from '@app/types/trade';
import { roundNumbers } from '@app/utils/roundNumbers';
import { observable, makeObservable, action, runInAction, reaction, toJS, computed } from 'mobx';
import { ArrayQueue, ConstantBackoff, Websocket, WebsocketBuilder } from 'websocket-ts';



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
    entryPrice: this.currentPrice,
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
            case 'error':
              console.error('Ошибка от сервера:', message);
              break;
          }
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
      console.log('sent: ', msg);
      this.ws.send(JSON.stringify(msg));
    } else {
      console.warn('WS не подключён — сообщение не отправлено');
    }
  }

  public getSymbolInfo() {
    this.send({
      type: 'symbolInfo',
      payload: {
        symbol: this.symbol,
      },
    });
  }

  public getAccountInfo() {
    this.send({
      type: 'accountInfo',
    });
  }

  public getPositions() {
    this.send({
      type: 'getPositions'
    });
  }

  public getAllOpenOrders() {
    this.send({
      type: 'getAllOpenOrders'
    });
  }

  public marketBuy(usdAmount: number) {
    this.send({
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
    this.send({
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
    this.send({
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
  }

  @action.bound
  public modifyStrategy(payload: Partial<IStrategy>) {
    runInAction(() => {
      this.strategy = {
        ...this.strategy,
        ...payload,
      };
    });
  }

  public cancelAllOrders() {
    this.send({
      type: 'cancelAllOrders',
      symbol: this.symbol,
    });
  }
}
