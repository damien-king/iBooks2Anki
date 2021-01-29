import * as fs from 'fs';
import * as os from 'os';
import * as sqlite3 from 'sqlite3';

const HOMEDIR = os.homedir();

const getBooksDbPath = () => {
  const path = `${HOMEDIR}/Library/Containers/com.apple.iBooksX/Data/Documents/BKLibrary`;
  const files = fs.readdirSync(path);
  const file = files.filter(file => file.endsWith('.sqlite'))[0];
  if (!file) {
    throw new Error(`DB file not found at ${path}`);
  }
  return `${path}/${file}`;
};

const getAnnotationsDbPath = () => {
  const path = `${HOMEDIR}/Library/Containers/com.apple.iBooksX/Data/Documents/AEAnnotation`;
  const files = fs.readdirSync(path);
  const file = files.filter(file => file.endsWith('.sqlite'))[0];
  if (!file) {
    throw new Error(`DB file not found at ${path}`);
  }
  return `${path}/${file}`;
};

const conn = (err: any) => {
  if (err) {
    console.log('Failed to connect to DB');
    return console.error(err.message);
  }
};

const closeConn = (err: any) => {
  if (err) {
    console.log('Failed to close DB connection');
    return console.error(err.message);
  }
};

export interface IBooksList {
  [bookId: string]: IBook;
}

export interface IBook {
  title: string;
  author: string;
  filePath: String;
}

export interface IAnnotation {
  selectedText: string;
  representativeText: string;
  note: string;
  chapter: string;
  deleted: boolean;
  bookId: string;
  createdAt: string;
  updatedAt: string;
  book?: IBook;
}

export class IBooks {
  public async listBooks(): Promise<IBooksList> {
    const query = 'SELECT * FROM zbklibraryasset';
    const dbPath = getBooksDbPath();
    const bookDb = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, conn);

    return new Promise((resolve, reject) => {
      bookDb.all(query, (err, books) => {
        if (err) {
          reject(err);
        } else {
          const formattedBooks: IBooksList = books.reduce((prev, curr) => {
            prev[curr.ZASSETID] = {
              title: curr.ZTITLE,
              author: curr.ZAUTHOR,
              filePath: curr.ZPATH,
            };
            return prev;
          }, {});
          resolve(formattedBooks);
        }
      });
      bookDb.close(closeConn);
    });
  }

  public async listAnnotations(): Promise<IAnnotation[]> {
    const query =
      'SELECT *, datetime(zannotationcreationdate + strftime("%s", "2001-01-01"), "unixepoch") as CREATED_ON, datetime(zannotationmodificationdate + strftime("%s", "2001-01-01"), "unixepoch") as UPDATED_ON FROM zaeannotation ORDER BY created_on DESC';

    const dbPath = getAnnotationsDbPath();
    const annotationDb = new sqlite3.Database(
      dbPath,
      sqlite3.OPEN_READONLY,
      conn
    );

    const books = await this.listBooks();

    return new Promise((resolve, reject) => {
      annotationDb.all(query, (err, annotations) => {
        if (err) {
          reject(err);
        } else {
          const formattedAnnotations = annotations.map(annotation => {
            const bookId = annotation.ZANNOTATIONASSETID;

            const formattedAnnotation: IAnnotation = {
              representativeText: annotation.ZANNOTATIONREPRESENTATIVETEXT,
              selectedText: annotation.ZANNOTATIONSELECTEDTEXT,
              createdAt: annotation.CREATED_ON,
              updatedAt: annotation.UPDATED_ON,
              note: annotation.ZANNOTATIONNOTE,
              chapter: annotation.ZFUTUREPROOFING5,
              bookId,
              deleted: annotation.ZANNOTATIONDELETED === 1 ? true : false,
            };
            if (books[bookId]) {
              formattedAnnotation.book = books[bookId];
            }
            return formattedAnnotation;
          });
          resolve(formattedAnnotations);
        }
      });
      annotationDb.close(closeConn);
    });
  }
}
