import { observable, computed, action } from "mobx";
export class Store {
  @observable
  markersMapping: Map<number, MarkerStore> = new Map();

  @computed
  get filePath(): string | null | undefined {
    return "/file";
  }

  @action
  newMarkerStore(editorId: number) {
    return 1;
  }

}
