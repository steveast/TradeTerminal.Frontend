import { IPosition, IStrategy, ISymbolInfo } from '@app/types/trade';
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

          switch (type) {
            case 'candles':
              //setCandle(msg.data);
              break;
            case 'positions':
              console.log(data)
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
              console.log(data);
              break;
            case 'symbolInfo':
              this.symbolInfo = data;
              break;
            case 'accountInfo':
              // console.log(Number(data.availableBalance));
              runInAction(() => {
                const deposit = parseInt(data.availableBalance, 10);
                this.deposit = deposit;
                this.modifyStrategy({ usdAmount: this.notional });
              })

              break;
            case 'openTpAndSl':
              this.modifyStrategy({
                entryPrice: this.currentPosition?.entryPrice,
                takeProfit: data.takeProfit.triggerPrice,
                stopLoss: data.stopLoss.triggerPrice,
              });
              break;
            case 'orderResult':
            case 'closeResult':
              console.log('Результат команды:', data);
              // обработай как нужно (toast, обнови UI)
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

  protected send(msg: any) {
    if (this.connected) {
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

  public getOpenTpAndSl() {
    this.send({
      type: 'openTpAndSl',
      payload: {
        symbol: this.symbol,
        positionSide: this.strategy.positionSide,
      }
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
}
