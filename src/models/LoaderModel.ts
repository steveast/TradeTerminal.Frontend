import { makeAutoObservable, observable } from 'mobx';

export default class LoaderModel {
  // Используем Map. MobX 6 автоматически сделает его ObservableMap
  @observable state = new Map<string, (value: any) => void>();

  constructor() {
    // КРИТИЧНО: без этого MobX не увидит изменения в классе
    makeAutoObservable(this);
  }

  public add(type: string): Promise<any> {
    return new Promise((resolve) => {
      // MobX зафиксирует добавление ключа
      this.state.set(type, resolve);
    });
  }

  public resolve(type: string, data?: any) {
    const resolver = this.state.get(type);
    if (resolver) {
      resolver(data);
      // MobX зафиксирует удаление ключа и вызовет рендер
      this.state.delete(type);
    }
  }

  public has(types: string | string[]): boolean {
    if (Array.isArray(types)) {
      // .some вернет true, как только найдет первый существующий ключ
      return types.some((type) => this.state.has(type));
    }
    return this.state.has(types);
  }

  // Полезный геттер для UI
  public get isLoadingAny() {
    return this.state.size > 0;
  }
}