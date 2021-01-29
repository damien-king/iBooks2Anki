# iBooks2Anki

Automatically create Anki cards from iBooks annotations with optional Forvo support. You will need a
forvo API key to use the integration. You can get one from https://api.forvo.com for a reasonable
(imo) price.

This script automatically fetches definitions based on a few conditions as detailed below so please
read the Dictionaries section first to see if it will suit your needs.

# Usage

Usage is pretty simple, simply run `yarn start` from the root directory of iBooks2Anki once you have
completed all the setup. It is important to note that iBooks automatically returns the setence of
the highlight word so this package expects that all your highlights represent either a single word,
or a specific phrase. This is important because it determines which dictionaries are used when
searching. A single word will search in single word dictionary while multiple highlighted words will
be treated as a phrase.

Right now only the basic card type is supported with fields `Front` and `Back`. The sentence of the
highlighted word or phrase is added to the front with the key word or phrase in bold and the
definition is added to the back

Example:

Front: Le visage de Tobias avait beau être pâle **depuis** le début du cataclysme, cette fois Matt
le vit devenir crayeux.

Back: 1. Indique le début, le point de départ dans le temps d'une action, d'un état qui dure
jusqu'au moment où l'on parle : Depuis son accident, il boite. [sound:depuis]

## Requirements:

#### Anki Connect

https://github.com/FooSoft/anki-connect

1.  Open the `Install Add-on` dialog by selecting `Tools` | `Add-ons` | `Get Add-ons...` in Anki.
2.  Input [2055492159](https://ankiweb.net/shared/info/2055492159) into the text box labeled `Code`
    and press the `OK` button to proceed.
3.  Restart Anki when prompted to do so in order to complete the installation of AnkiConnect.

Starting with [Mac OS X Mavericks](https://en.wikipedia.org/wiki/OS_X_Mavericks), a feature named
_App Nap_ has been introduced to the operating system. This feature causes certain applications
which are open (but not visible) to be placed in a suspended state. As this behavior causes
AnkiConnect to stop working while you have another window in the foreground, App Nap should be
disabled for Anki:

1.  Start the Terminal application.
2.  Execute the following commands in the terminal window:
    - `defaults write net.ankiweb.dtop NSAppSleepDisabled -bool true`
    - `defaults write net.ichi2.anki NSAppSleepDisabled -bool true`
    - `defaults write org.qt-project.Qt.QtWebEngineCore NSAppSleepDisabled -bool true`
3.  Restart Anki.

#### Node

Node v10.13.0 (LTS) or higher Yarn is preferred, you can install by

```
npm install --global yarn
```

#### Python

3.6 or higher is required. You will also need to install the below additional packages. Depending on
your setup you may need to use pip3 instead.

```
pip install pyobjc
```

```
pip3 install pyobjc-framework-CoreServices
```

## Installation / Setup

1. Clone or download the repo
2. Run `yarn install`
3. Rename .env.example to just .env and populate the desired variables. More information on specific
   variables below.
4. Add any desired additional dictionaries to src/dictionaries folder.
5. yarn start from the root of the iBooks2Anki directory.
6. For each book you want to make cards from, add the `ID` to the WATCHED_BOOKS env variable as per
   below.

## Env Variables

1. DECK_NAME - the name of the deck. Subdecks are double colon separated
   - Some::Deck
2. FORVO_KEY - should be in the form of a lower case UUID copied from Forvo API site (after you've
   paid)
   - `681b3df6a446cad132484d43c162d18d` (note this is completely fake)
3. WATCHED_BOOKS - a list of ID's as taken from the screen printout that should have annotations
   converted to cards.
   - `["681B3DF6A446CAD132484D43C162D18D"]`
4. PREFERRED_FORVO_USERNAMES - A list of forvo users you want to preference when adding forvo text.
   If empty it will sort by most positive votes.
   - `["gwen_bzh"]`
5. NOTE_AS_DEFINITION - true or false. When true, this will use all text in the note field of an
   annotation as the definition. If the note is empty it will fall back to dictionaries.
   - `true` or `false`
6. WORD_DICTIONARIES - a list of filenames found in src/dictionaries. See dictionaries below for
   more info.
   - `["larousse.json"]`
7. PHRASE_DICTIONARIES - a list of filenames found in src/dictionaries. See dictionaries below for
   more info.
   - `["wiktionary.json"]`
8. FORVO_LANGUAGE=fr FORVO_COUNTRY=FRA

## Dictionaries

Dictionary support is pretty basic, essentially it needs to have the following format to work:

- be a JSON document
- be a list of objects with the following format (additional keys are fine but ignored)

```
[
    {
        term: string,
        definition: string,
    }
]
```

There are 2 types of dictionary, phrase and word.

The built in apple dictionary, is unfortunately limited in such that the API will only return
results for the top priority book. You can configure which dictionary this is by

1. Opening dictionaries.app
2. Clicking the Dictionaries menu > Preferences.
3. Dragging the dictionary you want to search at the top.

The apple dictionary (for French at least) is good at returning the root of a conjugation, as such
the word is queried first in apple dictionary to get the root word, the root word is later used for
forvo and dictionary definition lookups only if the selected keyword is not found first.

#Acknowledgements

This package was heavily inspired by the following:

1. https://github.com/xieweizhi/ibooks_anki for the idea in general
2. https://github.com/solean/ibooks-highlights - for how to get the data out of iBooks
3. https://github.com/alichtman/scripts/blob/master/dictionary.py - for how to query the native
   apple dictionary
