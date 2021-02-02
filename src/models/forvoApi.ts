import axios from 'axios';

export interface IForvoApi {
  queryWordPronounciations: ({ word }: { word: string }) => Promise<any>;
}

export class ForvoApi implements IForvoApi {
  private apiKey: string;
  private langaugeCode: string;
  private countryCode: string;

  constructor({
    apiKey,
    langaugeCode,
    countryCode,
  }: {
    apiKey: string;
    langaugeCode: string;
    countryCode: string;
  }) {
    this.apiKey = apiKey;
    this.langaugeCode = langaugeCode;
    this.countryCode = countryCode;
  }

  public async queryWordPronounciations({ word }: { word: string }) {
    let url = `https://apifree.forvo.com/key/${this.apiKey}/format/json/action/word-pronunciations/word/${word}/lanuage/${this.langaugeCode}/country/${this.countryCode}`;
    url = encodeURI(url);
    const response = await axios.get(url);

    return response.data;
  }
}
