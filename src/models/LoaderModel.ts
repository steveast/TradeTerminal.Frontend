import { observable } from 'mobx';


export default class LoaderModel {
  @observable state = new Map<string, (value: any) => void>();

  public add(type: string) {
    return new Promise((resolve) => {
      this.state.set(type, resolve);
    });
  }

  public resolve(type: string, data: any) {
    this.state.get(type)?.(data);
  }
}