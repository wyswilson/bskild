
# About bSkild and API Documentation

## Overview
We have adopted the [ESCO](https://ec.europa.eu/esco/portal) standard and ontology for occupations and skills. We have downloaded and manages our own local copy of the ontology and will be making customisation of the data model as well as the actual data. The original data model can be found [here](https://ec.europa.eu/esco/portal/document/en/87a9f66a-1830-4c93-94f0-5daa5e00507e)

The idea is to use the occupations and skills data to build out an offering that allows direct and enterprise users to understand where and how they're positioned in their (or their teams') careers and the skills gap that need to be filled.

## Core Resources (API v1)

### Occupations
An [occupation](https://en.wikipedia.org/wiki/Job) or job is one's role in the labour market or economy, often a regular or principal activity performed for payment. Each `occupation` object has the following attributes.
- `id` : A globally unique identifier for the occupation.
- `name` : The name of the occupation.
- `desc` : A human-readable description of the high level responsibilities of the occupation.
- `alternatives` : A list of other names that the occupation is also known by.

An example response of an `occupation` object:

```
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
```

You can retrieve an `occupation` by the `id` or the exact `name` (if known), both of which will return the "data scientist" `occupation` object:

`GET /v1/occupations/258e46f9-0075-4a2e-adae-1ff0477e0f30` [[try here]](http://bskild.xyz/v1/occupations/258e46f9-0075-4a2e-adae-1ff0477e0f30)

`GET /v1/occupations/data%20scientist` [[try here]](http://bskild.xyz/v1/occupations/data%20scientist)

You can perform a fuzzy look-up on the `name` or `alternatives` attributes and the response will return the top occupations matching the input term. Below is an example using the term "data scientists" (note that it is in the plural form):

`GET /v1/occupations/data%20scientists` [[try here]](http://bskild.xyz/v1/occupations/data%20scientists)

You can also find out related occupations. Below is an example request and the response containing occupations related to "data scientist" based on the skills overlap.

`GET /v1/occupations/data%20scientist/related` [[try here]](http://bskild.xyz/v1/occupations/data%20scientist/related)

```
"occupations": [
   {
      "id": "d3edb8f8-3a06-47a0-8fb9-9b212c006aa2",
      "name": "data analyst",
      "desc": "Data analysts import, inspect, clean, transform, validate, model, or interpret collections of data with regard to the business goals of the company. They ensure that the data sources and repositories provide consistent and reliable data. Data analysts use different algorithms and IT tools as demanded by the situation and the current data. They might prepare reports in the form of visualisations such as graphs, charts, and dashboards.",
      "alternatives": [
         "data analysts",
         "data warehousing analyst",
         "data storage analyst",
         "data warehouse analyst"
      ]
   },
   {
      "id": "e297ec12-4712-40a4-ad98-ba004cacb205",
      "name": "chief data officer",
      "desc": "Chief data officers manage companies' enterprise-wide data administration and data mining functions. They ensure data are used as a strategic business asset at the executive level and implement and support a more collaborative and aligned information management infrastructure for the benefit of the organisation at large.",
      "alternatives": [
         "chief analytics officer",
         "CDO",
         "chief data officers"
      ]
   },
   ...
```

### Skills
A [skill](https://en.wikipedia.org/wiki/Skill) is the learned ability to perform an action with determined results with good execution often within a given amount of time, energy, or both. Skills can often be divided into domain-general and domain-specific skills. Each `skill` object has the following attributes:
- `id`: A globally unique identifier for the skill.
- `name`: The name of the skill.
- `desc`: A human readable description of what the skill entails.
- `type`: A value to indicate whether the skill is a `skill/competence` or `knowledge`. A `knowledge` [refers to](https://ec.europa.eu/esco/portal/document/en/87a9f66a-1830-4c93-94f0-5daa5e00507e) the body of facts, principles, theories and practices that is related to a field of work or study. Knowledge is described as theoretical and/or factual, and is the outcome of the assimilation of information through learning. As for `skill/competence`, it's the ability to apply knowledge and use know-how to complete tasks and solve problems. Skills are described as cognitive (involving the use of logical,
intuitive and creative thinking) or practical (involving manual dexterity and the use of methods, materials, tools and instruments).
- `reusability`: A value to refer to how widely a knowledge, skill or competence concept can be applied. A skill can either be `sector-specific`, `occupation-specific`, `cross-sector` or `transversal`. Transversal skills are relevant to a broad range of occupations and sectors. They are also known as “core skills”, “basic skills” or “soft skills”, and are not usually related directly to occupations. The rest are as the values imply.
- `alternatives` : A list of other names that the skill is also known by.

An example response of a `skill` object:

```
{
   "id": "da56feea-941c-4ff6-b573-bb16ccbde670",
   "name": "communicate production plan",
   "desc": "Communicates production plan to all levels in a way that targets, processes, and requirements are clear. Ensures that information is passed to everyone involved in the process assuming their responsibility for overall success.",
   "type": "skill/competence",
   "reusability": "cross-sector",
   "alternatives": [
      "communicate preparation plan",
      "communicate the production plan",
      "communicate strategic plan",
      "communicate fabrication plan",
      "communicate a production plan",
      "communicate manufacturing plan",
      "communicate production plans"
   ]
},
```

You can look up a skill by `id` as such, which will return the "communicate production plan" `skill` object:

`GET /v1/skills/da56feea-941c-4ff6-b573-bb16ccbde670` [[try here]](http://bskild.xyz/v1/skills/da56feea-941c-4ff6-b573-bb16ccbde670)

`GET /v1/skills/communicate%20production%20plan` [[try here]](http://bskild.xyz/v1/skills/communicate%20production%20plan)

If you are uncertain of the exact wording of the skill's `name` or the `id`, you can perform a fuzzy look-up and the response will return all the skills that contain the word "communicate" in the `name` or the `alternatives` attributes:

`GET /v1/skills/communicate` [[try here]](http://bskild.xyz/v1/skills/communicate)


You can also find out the skills required for an occupation. This only works if the parameter used to retrieve the `occupation` object is either an exact `name` or the `id` of the occupation:

`GET /v1/occupations/data%20scientist/skills` [[try here]](http://bskild.xyz/v1/occupations/data%20scientist/skills)


If you retrieve skills via an `occupation` object, you will get the skills as a list and each nested `skill` object will have an additional attribute called `optionality` to indicate whether the corresponding skill is `essential` or `optional` for that occupation. Below is an example response of the skills list for the "data scientist" occupation.

```
"skills": [
   {
      "id": "03a74eee-2dc6-4147-8667-5cdeb65f122d",
      "name": "manage ICT data classification",
      "desc": "Oversee the classification system an organisation uses to organise its data. Assign an owner to each data concept or bulk of concepts and determine the value of each item of data.",
      "type": "skill/competence",
      "reusability": "sector-specific",
      "optionality": "optional"
   },
   {
      "id": "07889c08-7220-47c8-96f7-6068fbea00dc",
      "name": "normalise data",
      "desc": "Reduce data to their accurate core form (normal forms) in order to achieve such results as minimisation of dependency, elimination of redundancy, increase of consistency.",
      "type": "skill/competence",
      "reusability": "sector-specific",
      "optionality": "essential"
   },
   ...
```
