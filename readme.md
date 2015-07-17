# OpmlParser

OpmlParser is a node.js script to convert [OmniOutliner](https://www.omnigroup.com/omnioutliner) outlines to CSV and Markdown files, and to automatically load tasks to a [Trello](https://trello.com) board.

It basically requires you to export an outline to an [OPML](https://en.wikipedia.org/wiki/OPML) file, and then uses this XML file to export data to multiple formats.

Please see my [Blog post](http://trapias.github.io/blog/my-presales-workflow-with-omnioutliner/) for further details.

## How to install
Download or clone this repository to a local folder, then open a terminal there and run:

	npm install
	
This will install necessary node.js modules.

## Configure
Edit the configuration file (config.js) 

## How to use

Run program with:

	./oop.js [COMMAND] [ARGS]

### COMMANDS

#### OUTLINE - Export OutLine to csv and markdown

	./oop.js outline PATH-TO-FILE.opml

Transforms an OmniOutlineer .opml file (export .oo3 to .opml) to both:

- a comma-separated-values (.csv) file
- a markdown (.md) document

The CSV is intended to be used in a spreadsheet such as Numbers, in order to do sums and any calculations about estimates.
The MD would be the basis to write a document, for example with Pages. You might open the MD with any editor (e.g. MacDown for Mac) and export to Html for convenience.

#### SETUP - Export tasks to a Trello board

	./oop.js setup PATH-TO-FILE.opml

Populates a Trello lists in a board of choice, creating cards with data from the outline.

## Credits
Partially inspired by [node-opmlparser](https://github.com/danmactough/node-opmlparser).

