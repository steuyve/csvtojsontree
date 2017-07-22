/**
 * @package csvtojsontree
 * @module index 
 * @author Stephen Liu
 * @date July 2017
 * @desc Parses a csv file representing a conversation into a conversation tree.
 */

// ================================================== Imports
// Utils
const fs = require('fs');
// CSV to JSON converter
const csvtojson = require('csvtojson');

/**
 * findLevel - Return which level the current row is at.
 *
 * @desc Returns the level a given row is at based on its indentation (ie, how
* many blank cells there are at the beginning of the row.)
 *
 * @param  {array} row  row to find out the level of.
 * @return {int}        the level of the row.
 */
function findLevel(row) {
  let level = 0;
  while (row[level] === '') {
    level += 1;
  }
  return level;
}

/**
 * rowEmpty - Check if a row is empty.
 *
 * @desc Checks whether all the cells in a given row are empty.
 *
 * @param  {array}    row row to check.
 * @return {boolean}      true if row is empty, false otherwise.
 */
function rowEmpty(row) {
  let empty = true;
  row.forEach((entry) => {
    if (entry !== '') {
      empty = false;
    }
  });

  return empty;
}

/**
 * objectify - Turn each row in an array of rows into an object.
 *
 * @desc If a row is empty, replace it with the object { empty: true }, otherwise,
 * if a row contains two non-empty cells with values [value1, value2] at a certain
 * level l, replace it with the object { level: l, children: '', value1: value2 }.
 * Lastly, if a row contains a single non-empty cell with values [value1] at a
 * certain level l, replace it with the object { level: l, children: value1, value1: '' }.
 *
 * @param  {array} rows array of rows to transform into array of objects.
 * @return {array}      array of objects.
 */
function objectify(rows) {
  const result = [];
  rows.forEach((row) => {
    // push { empty: true }
    if (rowEmpty(row)) {
      result.push({
        empty: true,
      });
    } else {
      // annotate each row object with its level and its children field (empty if none).
      const level = findLevel(row);
      let children = '';
      if (row[level + 1] === '') {
        children = `${row[level]}`;
      }
      // if a data cell has a string of comma separated words, then replace it
      // with an array.
      if (row[level + 1].search(',') !== -1) {
        const words = [];
        const lst = row[level + 1].split(',');
        lst.forEach((entry) => {
          words.push(entry.trim());
        });
        result.push({
          level,
          children,
          [row[level]]: words,
        });
      } else {
        result.push({
          level,
          children,
          [row[level]]: row[level + 1],
        });
      }
    }
  });

  return result;
}

/**
 * group - Groups row objects deliminated by empty row objects into single objects.
 *
 * @desc Given an array of row objects, as long as any consecutive row objects are
 * not empty, merge them into one object and push to object array. When encountering
 * an empty row object, push the current object onto the array and start with a new
 * object.
 *
 * @param  {array} rowObjs  array of row objects.
 * @return {array}          array of grouped row objects.
 */
function group(rowObjs) {
  const result = [];
  let body = {};

  for (let i = 0; i < rowObjs.length; i += 1) {
    const rowEntry = rowObjs[i];
    if (rowEntry.empty === true) {  // Start over.
      result.push(body);
      body = {};
    } else {
      // body accumulates the objects as key value pairs.
      body = Object.assign(body, rowEntry);
    }
  }

  result.push(body);
  return result;
}

/**
 * makeTree - Turn an array of grouped row objects into a tree based on each object's
 * level and children fields.
 *
 * @desc Starts with a root element given by annotatedRows[begin] with level l, checks
 * through annotatedRows[begin] - annotatedRows[end] for any elements that have
 * level l + 1 (ie, they are one level down from the root) and pushes them onto
 * the children field of the root specified by root.children. At the same time,
 * whenever two elements one level down are encountered, save their positions as
 * a new (begin, end) range. Finally, recursively call makeTree on each saved
 * (begin, end) pair.
 *
 * @param  {array}  annotatedRows array of row objects where each object has annotations
 * added by objectify(): level and children fields.
 * @param  {int}    begin
 * @param  {int}    end           begin and end indicate which section of the array
 * to check.
 * @return {object}               the root object.
 */
function makeTree(annotatedRows, begin, end) {
  // annotatedRows[begin] is root.
  const root = annotatedRows[begin];
  const level = root.level;
  const childrenField = root.children;
  if (childrenField === '') {
    return null;
  }

  const children = [];
  const pairs = [];

  // find all elements one level down and save their (begin, end) pairs.
  let newBegin = begin;
  let newEnd = begin;
  for (let i = begin; i < end; i += 1) {
    if (annotatedRows[i].level === (level + 1)) {
      const child = annotatedRows[i];
      children.push(child);
      const tmp = newEnd;
      newEnd = i;
      newBegin = tmp;
      const pair = {
        begin: newBegin,
        end: newEnd,
      };
      pairs.push(pair);
    }
  }

  // push each child onto children array.
  root[childrenField] = children;

  // delete first one as it contains the range (begin, first newBegin) which is useless.
  pairs.shift();
  // make sure we also include range (last newEnd, end) which we do need
  const lastone = {
    end,
    begin: newEnd,
  };
  pairs.push(lastone);

  // for each (begin, end) pair, recursively call makeTree with appropriate arguments.
  pairs.forEach((pair) => {
    makeTree(annotatedRows, pair.begin, pair.end);
  });

  return root;
}

/**
 * cleanTree - Removes properties of each object in the tree added by objectify.
 *
 * @desc Recursively removes level and children field of tree.
 *
 * @param  {object} root root node of tree to clean.
 * @return {object}      root node of cleaned tree.
 */
function cleanTree(root) {
  const newRoot = root;
  delete newRoot.level;
  if (newRoot.children !== '') {
    newRoot[newRoot.children].forEach((child) => {
      cleanTree(child);
    });
  }
  delete newRoot.children;

  return newRoot;
}

/**
 * parse - Parse a given csv file into a conversation tree.
 *
 * @desc Parse a given csv file into a conversation tree.
 *
 * @param  {string}   filepath path of given csv file.
 * @return {promise}           promise with resulting conversation tree.
 */
function parse(filepath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    csvtojson()
      .fromFile(filepath)
      .on('csv', (csvRow) => {
        rows.push(csvRow);
      })
      .on('done', (error) => {
        if (error) {
          reject(error);
        }

        fs.unlink(filepath, (fserr) => {
          if (fserr) {
            reject(fserr);
          }
        });

        const annotatedRows = group(objectify(rows));
        const tree = cleanTree(makeTree(annotatedRows, 0, annotatedRows.length));

        resolve(tree);
      });
  });
}

module.exports = {
  parse,
};
