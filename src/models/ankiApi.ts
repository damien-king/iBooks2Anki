import axios from "axios";

export interface IAnkiNote {
  deckName: string;
  modelName: "Basic";
  fields: {
    Front: string;
    Back: string;
  };
  options: {
    allowDuplicate: false;
    duplicateScope: "deck";
  };
  tags?: string[];
  audio?: {
    url: string;
    filename: string;
    skipHash?: string;
    fields: string[];
  }[];
}

export interface IAnkiApi {
  createNote: (note: IAnkiNote) => Promise<void>;
}

export class AnkiApi implements IAnkiApi {
  private endpoint = "http://127.0.0.1:8765";

  public async createNote(note: IAnkiNote) {
    const params = {
      action: "addNote",
      version: 6,
      params: {
        note,
      },
    };

    await axios.post(this.endpoint, params);
  }
}
