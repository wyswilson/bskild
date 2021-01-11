
Core Resources
- Occupations
This is an object representing occupations. Each object has the following attributes.

{
"id": "258e46f9-0075-4a2e-adae-1ff0477e0f30",
"name": "data scientist",
"desc": "Data scientists find and interpret rich data sources, manage large amounts of data, merge data sources, ensure consistency of data-sets, and create visualisations to aid in understanding data. They build mathematical models using data, present and communicate data insights and findings to specialists and scientists in their team and if required, to a non-expert audience, and recommend ways to apply the data.",

"alternatives": [
"data research scientist",
"research data scientist",
"data scientists",
"data expert",
"data engineer"
]
}

You can retrieve by the id of the occupation if known or as a fuzzy lookup with keywords, as such:

GET /v1/occupations/258e46f9-0075-4a2e-adae-1ff0477e0f30
which will return the "data scientist" occupation object 

GET /v1/occupations/data%20scientist
which will return the same "data scientist" occupation object since there's an exact match on the "name" attribute of the object

GET /v1/occupations/data%20scientists
which will return the top occupations matching the keyword "data scientists" (note the plural "s").




- Skills