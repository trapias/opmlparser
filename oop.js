#!/usr/bin/env node

/*
  =*==*==*==*==*==*=
  =*= OpmlParser =*=
  =*==*==*==*==*==*=

https://github.com/trapias/opmlparser

OpmlParser is a node.js script to convert OmniOutliner outlines to CSV and Markdown files, and to automatically load tasks to a Trello board.

1. manually export .oo3 to .opml
2. oo3 MUST have 2 columns: topic (richtext) and duration (duration, named "EH")
3. use the .opml as input for this script
4. generate .csv (saved as input_filename.opml.csv) and .md (saved as input_filename.opml.md) output files with the OUTLINE command
5. generate Trello cards by running the TRELLO command.

  [1] OUTLINE
  USAGE: ./oop.js outline PATH-TO-FILE.opml
  Export OmniOutliner to csv and markdown
  
  [2] SETUP TRELLO
  USAGE: ./oop.js trello PATH-TO-FILE.opml
  Creates cards for tasks on specified List (listID in config)
*/

var fs = require('fs'),
  xml2js = require('xml2js'),
  juration = require('juration'),
  Trello = require("node-trello"),
  config = require('./config.js'),
  http = require('https');

/* global vars, to be moved in scope */
var counter = 0;
var outlineRows = []; //new Array();
var outlineJSON = {};

/* Functions */

/* 
  Setup juration to use work hours instead of normal time
*/
function setupJuration()
{
  // console.log('Configuring juration...');
  juration.UNITS.days.value = 28800; // 8h vs default 24h
  juration.UNITS.weeks.value = 144000; // 1w = 5 working days
  juration.UNITS.months.value = 576000; // 1 month = 4 working weeks
  // years?
}

/*
  parse outline children items
*/
function _ParseChild(item, level, parent) {
  var myLevel = level + 1;
  var x;

  // console.log('PARENT = ' + JSON.stringify(parent));

  if (item.outline) {
    for (x = 0; x < item.outline.length; x++) {
      var childOutline = item.outline[x];

      if (childOutline.$ === undefined) {
        continue;
      }

      var o = {}; //new Object();
      o.n = counter++;
      o.level = myLevel;
      o.text = childOutline.$.text;
      if (childOutline.$._note !== undefined) {
        o.note = childOutline.$._note;
      } else {
        o.note = null;
      }

      // a column named "EH", of type "Duration", MUST be present to get estimates
      if (childOutline.$.EH !== undefined) {
        o.EH = childOutline.$.EH;
        var jh = juration.parse(childOutline.$.EH.toString().replace(',', '.'));
        o.EstimatedHours = jh / 3600;
      } else {
        o.EH = 0;
        o.EstimatedHours = 0;
      }

      if (item.outline[x].outline && item.outline[x].outline.length > 0) {
        o.HasChildren = true;
        outlineRows.push(o);
        if (parent.Tasks === undefined) {
          parent.Tasks = [];
          parent.Tasks.push(o);
        } else {

          parent.Tasks.push(o);
        }
        _ParseChild(item.outline[x], myLevel, o);
      } else {
        o.HasChildren = false;
        outlineRows.push(o);
        if (parent.Tasks === undefined) {
          parent.Tasks = [];
          parent.Tasks.push(o);
        } else {
          parent.Tasks.push(o);
        }
      }
    }

    // console.log('PARENT AFTER = ' + JSON.stringify(parent));
  }
}

function OpmlToCsvAndMd(opmlSource) {
  console.log('OpmlToCsvAndMd ' + opmlSource);
  var outFileName;
  var parser = new xml2js.Parser();
  parser.addListener('end', function(result) {

    var strOut = '', m;
    // var csvOut = 'N;Level;Task;Description;Duration;Estimate\r\n';
    var csvOut = 'N;Level;Task;Duration;Estimate\r\n';

    for (m = 0; m < result.opml.body[0].outline.length; m++) {
      console.log('TOPIC: ' + result.opml.body[0].outline[m].$.text);

      var o = {}; //new Object();
      o.n = counter++;
      o.level = 0;
      o.text = result.opml.body[0].outline[m].$.text;
      o.note = result.opml.body[0].outline[m].$._note;
      o.EH = result.opml.body[0].outline[m].$.EH;
      var jh = juration.parse(result.opml.body[0].outline[m].$.EH.toString().replace(',', '.'));
      o.EstimatedHours = jh / 3600;
      o.HasChildren = true;
      outlineRows.push(o);
      outlineJSON.Project = o;
      _ParseChild(result.opml.body[0].outline[m], 0, outlineJSON.Project);
    }

     var h1s=0, h2s = 0, h3s = 0;

    outlineRows.forEach(function(entry) {

      var t = '\r\n#', i;
      for (i = 0; i < entry.level; i++) {
        t += '#';
      }

      var csvPrefix = '';
      for (i = 1; i < entry.level; i++) {
        csvPrefix += '   '; //use tabs to indent
      }

      var pr='';
      switch(entry.level)
      {
        case 1:
          h1s++;
          h2s=0;
          h3s=0;
          pr = h1s + ') ';
          break;

        case 2:
          h2s++;
          h3s=0;
          pr = h1s + '.' + h2s + ') ';
          break;

        case 3:
          h3s++;
          pr = h1s + '.' + h2s + '.' + h3s + ') ';
          break;

          default:
          break;
      }
      csvPrefix += pr;

      if(entry.EH !== '')
      {
        strOut += t + pr + entry.text + ' (' + entry.EH + ')\r\n';
      }
      else{
        strOut += t + pr + entry.text + '\r\n';  
      }
      
      if (entry.note !== null && entry.note !== undefined) {
        strOut += entry.note + '\r\n';

        csvOut += entry.n + ';' + entry.level + ';' + csvPrefix + entry.text + ';' + entry.EH + ';' + entry.EstimatedHours + '\r\n';

        csvOut += ';;' + entry.note.toString().replace('\n', '').replace('\r\n', '').replace(';', ',') + '\r\n';
      }
      else
      {
         csvOut += entry.n + ';' + entry.level + ';' + csvPrefix + entry.text + ';' + entry.EH + ';' + entry.EstimatedHours + '\r\n';
      }

    });

    outFileName = opmlSource + '.md';
    fs.writeFile(outFileName, strOut);
    console.log('Saved file ' + outFileName);

    outFileName = opmlSource + '.csv';
    fs.writeFile(outFileName, csvOut);
    console.log('Saved file ' + outFileName);

    console.log("Done.");

  });

  fs.readFile(opmlSource, function(err, data) {
    if (err !== null) {
      console.log('ERR ' + err);
    }
    // console.log('DATA ' + data);
    parser.parseString(data);
  });
}

function SetupTrelloBoard(opmlSource) {
    console.log('SetupTrelloBoard ' + opmlSource);
    var trello = new Trello(config.key, config.token);

    var parser = new xml2js.Parser(),
      m;
    parser.addListener('end', function(result) {

        for (m = 0; m < result.opml.body[0].outline.length; m++) {
          console.log('TOPIC: ' + result.opml.body[0].outline[m].$.text);
          var o = {}; //new Object();
          o.n = counter++;
          o.level = 0;
          o.text = result.opml.body[0].outline[m].$.text;
          o.note = result.opml.body[0].outline[m].$._note;
          o.EH = result.opml.body[0].outline[m].$.EH;
          var jh = juration.parse(result.opml.body[0].outline[m].$.EH.toString().replace(',', '.'));
          o.EstimatedHours = jh / 3600;
          o.HasChildren = true;
          outlineRows.push(o);
          outlineJSON.Project = o;
          _ParseChild(result.opml.body[0].outline[m], 0, outlineJSON.Project);
        }

        outlineRows.forEach(function(entry) {
            //tasks are only outline elements without children 
            if (entry.HasChildren === false) {
              var t = '\r\n',
                i;
              for (i = 0; i < entry.level; i++) {
                t += '  ';
              }
              // console.log(t + 'L' + entry.level + ' - ' + entry.text + ': ' + entry.EstimatedHours);

              newCard = {};
              newCard.name = entry.text + ' (0/' + entry.EstimatedHours + ')'; // put estimate in title as (spent/estimate), like Plus for Trello
              if (entry.note !== null) {
                newCard.desc = entry.note;
              }
              newCard.due = null;
              newCard.idList = config.idList;
              newCard.idLabels = config.idLabel;
              newCard.urlSource = null;
              console.log('NEW CARD: ' + JSON.stringify(newCard));

              trello.post('/1/cards', newCard, function(err, data) {

                  if (err) {
                    console.log('Error creating card: ' + err);
                  } else {
                    console.log('CARD created: ' + JSON.stringify(data));
                    }
              });


              } else {
                // console.log('=== ' + entry.text + ' ===');
              }
            });

          console.log("Done.");

        });

      fs.readFile(opmlSource, function(err, data) {
        if (err !== null) {
          console.log('ERR ' + err);
        }
        // console.log('DATA ' + data);
        parser.parseString(data);

      });
    }

/*
  MAIN PROCESS 
*/
setupJuration();

switch (process.argv[2]) {
  case 'outline':
    console.log('Export Outline to csv and markdown');
    if (!process.argv[3]) {
      console.log('USAGE: ./oop.js outline PATH-TO-FILE.opml');
      return;
    }
    OpmlToCsvAndMd(process.argv[3]);
    break;

  case 'trello':
    console.log('Setup Trello board');
    if (!process.argv[3]) {
      console.log('USAGE: ./oop.js trello PATH-TO-FILE.opml');
      return;
    }
    SetupTrelloBoard(process.argv[3]);
    break;

  default:
    console.log('Unknown command');
    console.log('USAGE: ./oop.js cmd args');
    console.log('COMMANDS: outline, trello');
    console.log('ARGS: PATH-TO-FILE.opml');
    break;
}
