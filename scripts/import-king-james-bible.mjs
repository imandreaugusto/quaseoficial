import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, '..');
const sourcePath = process.argv[2];
const outputPath = resolve(projectRoot, 'public', 'bible', 'king-james-version.json');
const sourceUrl = 'https://www.gutenberg.org/cache/epub/10/pg10.txt';

const bookHeadings = new Map([
  ['The First Book of Moses: Called Genesis', 'Genesis'],
  ['The Second Book of Moses: Called Exodus', 'Exodus'],
  ['The Third Book of Moses: Called Leviticus', 'Leviticus'],
  ['The Fourth Book of Moses: Called Numbers', 'Numbers'],
  ['The Fifth Book of Moses: Called Deuteronomy', 'Deuteronomy'],
  ['The Book of Joshua', 'Joshua'],
  ['The Book of Judges', 'Judges'],
  ['The Book of Ruth', 'Ruth'],
  ['The First Book of the Kings', '1 Samuel'],
  ['The Second Book of the Kings', '2 Samuel'],
  ['The Third Book of the Kings', '1 Kings'],
  ['The Fourth Book of the Kings', '2 Kings'],
  ['The First Book of the Chronicles', '1 Chronicles'],
  ['The Second Book of the Chronicles', '2 Chronicles'],
  ['Ezra', 'Ezra'],
  ['The Book of Nehemiah', 'Nehemiah'],
  ['The Book of Esther', 'Esther'],
  ['The Book of Job', 'Job'],
  ['The Book of Psalms', 'Psalms'],
  ['The Proverbs', 'Proverbs'],
  ['The Preacher', 'Ecclesiastes'],
  ['The Song of Solomon', 'Song of Solomon'],
  ['The Book of the Prophet Isaiah', 'Isaiah'],
  ['The Book of the Prophet Jeremiah', 'Jeremiah'],
  ['The Lamentations of Jeremiah', 'Lamentations'],
  ['The Book of the Prophet Ezekiel', 'Ezekiel'],
  ['The Book of Daniel', 'Daniel'],
  ['Hosea', 'Hosea'],
  ['Joel', 'Joel'],
  ['Amos', 'Amos'],
  ['Obadiah', 'Obadiah'],
  ['Jonah', 'Jonah'],
  ['Micah', 'Micah'],
  ['Nahum', 'Nahum'],
  ['Habakkuk', 'Habakkuk'],
  ['Zephaniah', 'Zephaniah'],
  ['Haggai', 'Haggai'],
  ['Zechariah', 'Zechariah'],
  ['Malachi', 'Malachi'],
  ['The Gospel According to Saint Matthew', 'Matthew'],
  ['The Gospel According to Saint Mark', 'Mark'],
  ['The Gospel According to Saint Luke', 'Luke'],
  ['The Gospel According to Saint John', 'John'],
  ['The Acts of the Apostles', 'Acts'],
  ['The Epistle of Paul the Apostle to the Romans', 'Romans'],
  ['The First Epistle of Paul the Apostle to the Corinthians', '1 Corinthians'],
  ['The Second Epistle of Paul the Apostle to the Corinthians', '2 Corinthians'],
  ['The Epistle of Paul the Apostle to the Galatians', 'Galatians'],
  ['The Epistle of Paul the Apostle to the Ephesians', 'Ephesians'],
  ['The Epistle of Paul the Apostle to the Philippians', 'Philippians'],
  ['The Epistle of Paul the Apostle to the Colossians', 'Colossians'],
  ['The First Epistle of Paul the Apostle to the Thessalonians', '1 Thessalonians'],
  ['The Second Epistle of Paul the Apostle to the Thessalonians', '2 Thessalonians'],
  ['The First Epistle of Paul the Apostle to Timothy', '1 Timothy'],
  ['The Second Epistle of Paul the Apostle to Timothy', '2 Timothy'],
  ['The Epistle of Paul the Apostle to Titus', 'Titus'],
  ['The Epistle of Paul the Apostle to Philemon', 'Philemon'],
  ['The Epistle of Paul the Apostle to the Hebrews', 'Hebrews'],
  ['The General Epistle of James', 'James'],
  ['The First Epistle General of Peter', '1 Peter'],
  ['The Second General Epistle of Peter', '2 Peter'],
  ['The First Epistle General of John', '1 John'],
  ['The Second Epistle General of John', '2 John'],
  ['The Third Epistle General of John', '3 John'],
  ['The General Epistle of Jude', 'Jude'],
  ['The Revelation of Saint John the Divine', 'Revelation'],
]);

const source = sourcePath
  ? await readFile(resolve(sourcePath), 'utf8')
  : await fetch(sourceUrl).then(async (response) => {
    if (!response.ok) throw new Error(`Could not download KJV source (${response.status}).`);
    return response.text();
  });

const startMarker = '*** START OF THE PROJECT GUTENBERG EBOOK';
const endMarker = '*** END OF THE PROJECT GUTENBERG EBOOK';
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start);
if (start < 0 || end < 0) throw new Error('The downloaded file is missing the expected ebook markers.');

const contentStart = source.indexOf('\n', start);
const content = source.slice(contentStart + 1, end);
const books = [];
let currentBookName;
let currentBook;
let currentChapter;
let currentVerse;

for (const rawLine of content.split(/\r?\n/)) {
  const line = rawLine.trim();
  const bookName = bookHeadings.get(line);
  if (bookName) {
    currentBookName = bookName;
    currentBook = undefined;
    currentChapter = undefined;
    currentVerse = undefined;
    continue;
  }

  const verseMarkers = [...line.matchAll(/\b(\d+):(\d+)(?=\s|$)\s*/g)];
  if (verseMarkers.length && currentBookName) {
    for (let index = 0; index < verseMarkers.length; index += 1) {
      const marker = verseMarkers[index];
      const textStart = marker.index + marker[0].length;
      const textEnd = verseMarkers[index + 1]?.index ?? line.length;
      const text = line.slice(textStart, textEnd).trim();
      const chapterNumber = Number(marker[1]);
      const verseNumber = Number(marker[2]);

      if (!currentBook) {
        currentBook = { name: currentBookName, chapters: [] };
        books.push(currentBook);
      }
      currentChapter = currentBook.chapters.at(-1);
      if (!currentChapter || currentChapter.number !== chapterNumber) {
        currentChapter = { number: chapterNumber, verses: [] };
        currentBook.chapters.push(currentChapter);
      }
      currentVerse = { number: verseNumber, text };
      currentChapter.verses.push(currentVerse);
    }
    continue;
  }

  if (line && currentVerse && !/^(?:The (?:Old|New) Testament|The King James Version)/.test(line)) {
    currentVerse.text += ` ${line}`;
  }
}

const verseCount = books.reduce(
  (total, book) => total + book.chapters.reduce((count, chapter) => count + chapter.verses.length, 0),
  0,
);
const parsedBookNames = new Set(books.map((book) => book.name));
const missingBooks = [...new Set(bookHeadings.values())].filter((name) => !parsedBookNames.has(name));
if (books.length !== 66 || verseCount !== 31102) {
  throw new Error(
    `Parsed an unexpected Bible structure: ${books.length} books, ${verseCount} verses. Missing: ${missingBooks.join(', ') || 'none'}.`,
  );
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify({ books }, null, 0)}\n`, 'utf8');
console.log(`Wrote ${books.length} books and ${verseCount} verses to ${outputPath}`);
