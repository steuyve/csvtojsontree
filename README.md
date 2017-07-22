# csvtojsontree

## Description
Little utility that converts a csv file representing hierarchical data into a
nested json object.

Takes hierarchical data from a spreadsheet that is exported as a csv file like
this:

| Sample	| Input		| Table		|	|
| ------------- | ------------- | ------------- | ----- |
| File 		|	 	|		|	|
| Root 		| name 	 	|		|	|
| Children	| 	 	|		|	|
| 		|	 	|		|	|
| 		| Child1 	| name		|	|
|		| Children	|		|	|
|		| 		|		|	|
|		| 		| Child1.1	| name	|
|		| 		|		|	|
|		| 		| Child1.2	| name	|
|		| 		|		|	|
|		| 		| Child1.2	| name	|
|		|	 	|		|	|
|		| Child2	| name		|	|
|		| Children	|		|	|
|		| 		|		|	|
|		| 		| Child2.1	| name	|
|		| 		|		|	|
|		| 		| Child2.2	| name	|
|		| 		|		|	|
|		| 		| Child2.3	| name	|


with corresponding csv that looks like this:
```csv
File:,,,
Root,name,,
Children,,,
,,,
,Child1,name,
,Children,,
,,,
,,Child1.1,name
,,,
,,Child1.2,name
,,,
,,Child1.3,name
,,,
,Child2,name,
,Children,,
,,,
,,Child2.1,name
,,,
,,Child2.2,name
,,,
,,Child2.3,name
```

And creates a nested JSON object out of it:
```javascript
{
  "Root": "name",
  "Children": [
    {
      "Child1": "name",
      "Children": [
        {
          "Child1.1": "name"
        },
        {
          "Child1.2": "name"
        },
        {
          "Child1.3": "name"
        }
      ]
    },
    {
      "Child2": "name",
      "Children": [
        {
          "Child2.1": "name"
        },
        {
          "Child2.2": "name"
        },
        {
          "Child2.3": "name"
        }
      ]
    }
  ]
}
```

## Installation
```
npm install --save csvtojsontree
```

## Usage
```javascript
const csvtojsontree = require('csvtojsontree');
csvtojsontree.parse(path_to_csv_file)
.then(tree => do stuff with tree)
.catch(error => handle error);
```

## Contact
Author: Stephen Liu (stliu.webservices@gmail.com).

