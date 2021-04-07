import { observer, action } from "mobx";
export class Store {
  @action
  @observer
  multipleDecorator() {
    return 0;
  }

  @action @observer
  multipleDecorator2() {
    return 0;
  }
}
