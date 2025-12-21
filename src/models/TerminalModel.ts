import { IStrategy } from '@app/types/trade';
import { TMessage } from '@app/types/ws';
import { LS } from '@app/utils/storage';
import { observable, makeObservable, action, runInAction, reaction, toJS } from 'mobx';
import { ArrayQueue, ConstantBackoff, Websocket, WebsocketBuilder } from 'websocket-ts';



interface ITerminalModel {
  activeTab: 'stopOne' | 'squeeze';
  currentPrice: number;
  deposit: number;
  hasPosition: boolean;
  leverage: number;
  strategy: IStrategy;
  symbol: string;
}

export class TerminalModel implements ITerminalModel {
  @observable activeTab: 'stopOne' | 'squeeze' = LS.get('activeTab', 'stopOne');

  // Trading
  @observable currentPrice: number = 0;
  @observable symbol: string = 'BTCUSDT';
  @observable hasPosition: boolean = false;
  @observable deposit: number = 1000;
  @observable leverage: number = 10;
  @observable available: number = this.deposit * this.leverage;
  @observable tickSize: number = 1;

  @observable strategy: IStrategy = {
    entryPrice: this.currentPrice,
    positionSide: 'LONG',
    side: 'BUY',
    stopLoss: -(this.currentPrice * 0.09),
    symbol: this.symbol,
    takeProfit: this.currentPrice * 0.09,
    usdAmount: this.available
  };


  // Connection
  @observable connected: boolean = false;

  // Privates
  private ws: Websocket;

  constructor() {
    makeObservable(this);
    reaction(
      () => this.activeTab,
      (activeTab) => {
        LS.set('activeTab', activeTab);
      }
    );
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
            case 'candle':
              //setCandle(msg.data);
              break;
            case 'positions':
              //setPositions(msg.data);
              break;
            case 'status':
              break;
            case 'symbolChanged':
              // setCurrentSymbol(msg.symbol);
              // setCurrentInterval(msg.interval);
              break;
            case 'strategy':
              console.log(data);
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

  protected send(msg: any) {
    if (this.connected) {
      this.ws.send(JSON.stringify(msg));
    } else {
      console.warn('WS не подключён — сообщение не отправлено');
    }
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
