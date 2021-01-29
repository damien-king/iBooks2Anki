import * as dotenv from 'dotenv';
import * as fs from 'fs';

import { AnkiApi, IAnkiApi, IAnkiNote } from './models/ankiApi';
import { ForvoApi, IForvoApi } from './models/forvoApi';
import { IAnnotation, IBooks } from './models/iBooksSql';

import { spawn } from 'child_process';

dotenv.config();

const DECK_NAME = process.env.DECK_NAME;
const FORVO_COUNTRY = process.env.FORVO_COUNTRY || '';
const FORVO_LANGUAGE = process.env.FORVO_LANGUAGE || '';
const FORVO_KEY = process.env.FORVO_KEY || '';
const NOTE_AS_DEFINITION =
  process.env.NOTE_AS_DEFINITION?.toLowerCase() === 'true';
const WATCHED_BOOKS: string[] = JSON.parse(process.env.WATCHED_BOOKS ?? '[]');
const PREFERRED_FORVO_USERNAMES: string[] = JSON.parse(
  process.env.PREFERRED_FORVO_USERNAMES ?? '[]'
);
const WORD_DICTIONARIES: string[] = JSON.parse(
  process.env.WORD_DICTIONARIES ?? '[]'
);
const PHRASE_DICTIONARIES: string[] = JSON.parse(
  process.env.PHRASE_DICTIONARIES ?? '[]'
);

if (!DECK_NAME) {
  throw new Error(`env var DECK_NAME is undefined`);
}

if (FORVO_KEY && (FORVO_LANGUAGE === '' || FORVO_COUNTRY === '')) {
  throw new Error(`env var FORVO_LANGUAGE or FORVO_COUNTRY is undefined`);
}

interface ICard {
  sentence: string;
  keyword: string;
  definition?: string;
  rootWord?: string;
}

const getAppleDefinition = async (word: string) => {
  const pythonChild = spawn('python3', [
    'src/models/dictionary.py',
    word.trim(),
  ]);
  let definition = '';

  for await (const chunk of pythonChild.stdout) {
    definition += chunk;
  }

  definition = definition;

  return definition;
};

const getDefinition = async ({
  keyword,
  rootWord,
}: {
  keyword: string;
  rootWord: string;
}) => {
  let definition: any;
  if (keyword.split(' ').length > 1) {
    for (const filename of PHRASE_DICTIONARIES) {
      const dictJSON: any[] = JSON.parse(
        fs.readFileSync(`src/dictionaries/${filename}`).toString()
      );
      definition = dictJSON.find(entry => entry.term === keyword);
      if (!definition) {
        definition = dictJSON.find(entry => entry.term === rootWord);
      }
    }
  } else {
    for (const filename of WORD_DICTIONARIES) {
      const dictJSON: any[] = JSON.parse(
        fs.readFileSync(`src/dictionaries/${filename}`).toString()
      );
      definition = dictJSON.find(entry => entry.term === keyword);
      if (!definition) {
        definition = dictJSON.find(entry => entry.term === rootWord);
      }
    }
  }

  if (!definition) {
    return undefined;
  }

  return definition.definition;
};

const makeCardFromAnnotation = async ({
  annotation,
}: {
  annotation: IAnnotation;
}): Promise<ICard> => {
  const reN = /\n/gi;
  const keyword = annotation.selectedText
    .replace(reN, '')
    .replace('’', "'")
    .trim();
  const sentence = annotation.representativeText
    .replace(reN, '<br>')
    .replace(keyword, `<b>${keyword}</b>`)
    .trim();
  const note = annotation.note;
  const appleDefinition = await getAppleDefinition(keyword);
  let rootWord = keyword;

  if (keyword.split(' ').length === 1) {
    rootWord = appleDefinition.split(' ')[0].replace(',', '').replace('.', '');
  }

  let definition = await getDefinition({ keyword, rootWord });
  if (definition === '' || definition === undefined) {
    definition = appleDefinition;
  }

  if (note && note !== '' && NOTE_AS_DEFINITION) {
    definition = note;
  }

  definition = definition.replace(reN, '</br>');

  const card: ICard = { sentence, definition, keyword, rootWord };

  return card;
};

const getCards = async (): Promise<ICard[]> => {
  const iBooks = new IBooks();
  const annotations: IAnnotation[] = await iBooks.listAnnotations();
  const cards: ICard[] = [];

  for (const annotation of annotations) {
    if (
      !WATCHED_BOOKS.includes(annotation.bookId) ||
      annotation.deleted === true ||
      annotation.selectedText === null
    ) {
      continue;
    }

    const card = await makeCardFromAnnotation({ annotation });
    cards.push(card);
  }

  return cards;
};

const getForvoAudio = async ({
  forvoApi,
  card,
}: {
  forvoApi: IForvoApi;
  card: ICard;
}) => {
  let word = card.keyword;
  let rootWord = card.rootWord;
  let response = await forvoApi.queryWordPronounciations({ word });
  if (response.attributes === 0) {
    if (rootWord) {
      response = await forvoApi.queryWordPronounciations({ word: rootWord });
      if (response.attributes === 0) {
        return;
      }
    }
  }

  const desiredAudio = response.items.filter((item: any) =>
    PREFERRED_FORVO_USERNAMES.includes(item.username)
  );

  if (desiredAudio.length > 0) {
    return { filename: word, mp3Url: desiredAudio[0].pathmp3 };
  }

  const sorted = response.items.sort((a: any, b: any) =>
    b.num_positive_votes > a.num_positive_votes ? 1 : -1
  );

  if (sorted.length < 1) {
    return;
  }

  return { filename: word, mp3Url: sorted[0].pathmp3 };
};

const createNote = async ({
  ankiApi,
  forvoApi,
  card,
}: {
  ankiApi: IAnkiApi;
  forvoApi: IForvoApi;
  card: ICard;
}) => {
  const ankiNote: IAnkiNote = {
    deckName: DECK_NAME,
    modelName: 'Basic',
    fields: {
      Front: card.sentence,
      Back: card.definition ?? '',
    },
    options: {
      allowDuplicate: false,
      duplicateScope: 'deck',
    },
  };

  if (FORVO_KEY) {
    const forvoAudio = await getForvoAudio({ forvoApi, card });
    if (forvoAudio) {
      ankiNote.audio = [
        {
          url: forvoAudio.mp3Url,
          filename: forvoAudio.filename,
          fields: ['Back'],
        },
      ];
    }
  }
  console.log(ankiNote);
  ankiApi.createNote(ankiNote);
};

const start = async () => {
  await displayBooks();
  const ankiApi = new AnkiApi();
  const forvoApi = new ForvoApi({
    apiKey: FORVO_KEY,
    countryCode: FORVO_COUNTRY,
    langaugeCode: FORVO_LANGUAGE,
  });
  const cards = await getCards();
  await Promise.all(
    cards.map(async card => {
      await createNote({ ankiApi, card, forvoApi });
    })
  );
};

const displayBooks = async () => {
  const iBooks = new IBooks();
  const books = await iBooks.listBooks();
  console.log(`Your books are:`);
  Object.keys(books).map((bookId: any) => {
    console.log(`ID: ${bookId} Title: ${books[bookId].title}`);
  });
  console.log(`\n\nYour Watched books are:`);
  WATCHED_BOOKS.map((bookId: any) => {
    console.log(`ID: ${bookId} Title: ${books[bookId].title}\n\n`);
  });
};

start();
