import { observable, computed, action } from "mobx";
export class Store {
  @observable
  markersMapping: Map<number, MarkerStore> = new Map();

  @computed
  get filePath(): ?string {
    const editor = this.editor;
    if (!editor) return null;
    const savedFilePath = editor.getPath();
    return savedFilePath ? savedFilePath : `Unsaved Editor ${editor.id}`;
  }

  @action
  newMarkerStore(editorId: number) {
    const markerStore = new MarkerStore();
    this.markersMapping.set(editorId, markerStore);
    return markerStore;
  }
}
