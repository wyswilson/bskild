import datetime
import flask
import func

import time
import functools
import mysql.connector
import hashlib
import urllib
import urllib.parse
import logging
import simplejson as json
import requests
import random
import bs4
import re
import configparser
import werkzeug.security
import jwt
import string
import math
import boto3

config = configparser.ConfigParser()
config.read('conf.ini')

logfile 		= config['path']['log']
idprefix 		= config['path']['idprefix']
mysqlhost 		= config['mysql']['host']
mysqlport 		= config['mysql']['port']
mysqluser 		= config['mysql']['user']
mysqlpassword 	= config['mysql']['password']
mysqldb 		= config['mysql']['db']
useragents 		= json.loads(config['scraper']['useragents'].replace('\n',''))

db = mysql.connector.connect(
	host = mysqlhost,
	port = mysqlport,
	user = mysqluser, passwd = mysqlpassword, database=mysqldb#,
    #pool_name='sqlpool',
    #pool_size = 6, pool_reset_session = True
   	)
#cursor = db.cursor()

logging.basicConfig(filename=logfile,level=logging.DEBUG)

def _execute(db,query,params):
	cursor_ = None
	try:
		cursor_ = db.cursor()
		if type(params) is tuple:
			cursor_.execute(query,params)
		else:
			cursor_.execute(query)
	except mysql.connector.Error as e:
		db.reconnect(attempts=3, delay=0)
		cursor_ = db.cursor()
		if type(params) is tuple:
			cursor_.execute(query,params)
		else:
			cursor_.execute(query)

	return cursor_

def jsonifyoutput(statuscode,message,primaryresp,secondaryresp,records):

	respobj = {}
	respobj['status'] = statuscode
	respobj['message'] = message
	if secondaryresp != "":
		respobj['count'] = len(records[0][secondaryresp])
	else:
		respobj['count'] = len(records)
	respobj[primaryresp] = records

	response = flask.jsonify(respobj),statuscode
	return response

def jsonifyskillswithoccupations(records):
	results = []
	occupationsbyskill = {}
	distinctskills 				= {}
	distinctskills_desc 		= {}
	distinctskills_type 		= {}
	distinctskills_reusability 	= {}
	distinctskills_optionality 	= {}
	distinctskills_alt 			= {}
	for record in records:
		score       = record[0]
		skillId		= record[1]
		skillName  	= record[2]
		skillDesc  	= record[3]
		skillType  	= record[4]
		skillAlt  	= record[5]
		skillReusability  	= record[6]
		skillOptionality	= record[7]
		occupationId 		= record[8]
		occupationName 		= record[9]
		occupationDesc		= record[10] 
		alts = skillAlt.split("\n")

		occupationId_ = occupationId.split("/occupation/")[1]
		skillId_ = skillId.split("/skill/")[1]

		occupationdetails = {}
		occupationdetails['id'] = occupationId_
		occupationdetails['name'] = occupationName
		occupationdetails['desc'] = occupationDesc

		if skillId_ in occupationsbyskill:
			occupationsbyskill[skillId_].append(occupationdetails)
		else:
			occupationsbyskill[skillId_] = [occupationdetails]

		distinctskills[skillId_] = skillName
		distinctskills_desc[skillId_] = skillDesc
		distinctskills_type[skillId_] = skillType
		distinctskills_reusability[skillId_] = skillReusability
		distinctskills_alt[skillId_] = alts

	for skillId__ in distinctskills:
		skillName = distinctskills[skillId__]
		skillDesc = distinctskills_desc[skillId__]
		skillType = distinctskills_type[skillId__]
		skillReusability = distinctskills_reusability[skillId__]
		alts = distinctskills_alt[skillId__]
		occupations = occupationsbyskill[skillId__]

		skill = {}
		skill['id'] = skillId_
		skill['name'] = skillName
		skill['desc'] = skillDesc
		skill['type'] = skillType
		skill['reusability'] = skillReusability
		skill['alternatives'] = alts
		skill['occupations'] = occupations

		results.append(skill)	

	return results

def jsonifyoccupationswithskills(records):
	results = []
	skillsbyoccupation = {}
	distinctoccupations = {}
	distinctoccupations_desc = {}
	confidencescore = {}
	for record in records:
		score	  		= record[0]
		occupationId   	= record[1]
		occupationName  = record[2]
		occupationDesc	= record[3]
		occupationAlt	= record[4]
		skillId	   	= record[5]
		skillName	= record[6]
		skillDesc	= record[7]
		skillType	= record[8]
		skillReusability	= record[9]
		skillOptionality	= record[10]

		occupationId_ = occupationId.split("/occupation/")[1]
		skillId_ = skillId.split("/skill/")[1]

		skilldetails = {}
		skilldetails['id'] = skillId_
		skilldetails['name'] = skillName
		skilldetails['desc'] = skillDesc
		skilldetails['type'] = skillType
		skilldetails['reusability'] = skillReusability
		skilldetails['optionality'] = skillOptionality

		if occupationId_ in skillsbyoccupation:
			skillsbyoccupation[occupationId_].append(skilldetails)
		else:
			skillsbyoccupation[occupationId_] = [skilldetails]

		distinctoccupations[occupationId_] = occupationName
		distinctoccupations_desc[occupationId_] = occupationDesc
		confidencescore[occupationId_] = score
	
	for occupationId__ in distinctoccupations:
		occupationName = distinctoccupations[occupationId__]
		occupationDesc = distinctoccupations_desc[occupationId__]
		score = confidencescore[occupationId__]
		skills = skillsbyoccupation[occupationId__]

		occupation = {}
		occupation['id'] = occupationId__
		occupation['name'] = occupationName
		occupation['desc'] = occupationDesc
		occupation['confidence'] = score
		occupation['skills'] = skills

		results.append(occupation)

	return results

def jsonifyoccupations(records):
	results = []
	distinctoccupations 		= {}
	distinctoccupations_desc 	= {}	
	distinctoccupations_alt 	= {}	
	for record in records:
		score 			= record[0]
		occupationId	= record[1]
		occupationName  = record[2]
		occupationDesc  = record[3]
		occupationAlt  	= record[4]
		alts = occupationAlt.split("\n")

		occupationId_ = occupationId.split("/occupation/")[1]
		
		distinctoccupations[occupationId_] = occupationName
		distinctoccupations_desc[occupationId_] = occupationDesc
		distinctoccupations_alt[occupationId_] = alts

	for occupationId__ in distinctoccupations:
		occupationName = distinctoccupations[occupationId__]
		occupationDesc = distinctoccupations_desc[occupationId__]
		alts = distinctoccupations_alt[occupationId__]

		occupation = {}
		occupation['id'] = occupationId__
		occupation['name'] = occupationName
		occupation['desc'] = occupationDesc
		occupation['alternatives'] = alts

		results.append(occupation)

	return results

def jsonifyskills(records):
	results = []
	distinctskills 				= {}
	distinctskills_desc 		= {}
	distinctskills_type 		= {}
	distinctskills_reusability 	= {}
	distinctskills_optionality 	= {}
	distinctskills_alt 			= {}
	for record in records:
		score       = record[0]
		skillId		= record[1]
		skillName  	= record[2]
		skillDesc  	= record[3]
		skillType  	= record[4]
		skillAlt  	= record[5]
		skillReusability  	= record[6]

		alts = skillAlt.split("\n")

		skillId_ = skillId.split("/skill/")[1]

		distinctskills[skillId_] = skillName
		distinctskills_desc[skillId_] = skillDesc
		distinctskills_type[skillId_] = skillType
		distinctskills_reusability[skillId_] = skillReusability
		distinctskills_alt[skillId_] = alts

	for skillId__ in distinctskills:
		skillName = distinctskills[skillId__]
		skillDesc = distinctskills_desc[skillId__]
		skillType = distinctskills_type[skillId__]
		skillReusability = distinctskills_reusability[skillId__]
		alts = distinctskills_alt[skillId__]

		skill = {}
		skill['id'] = skillId_
		skill['name'] = skillName
		skill['desc'] = skillDesc
		skill['type'] = skillType
		skill['reusability'] = skillReusability
		skill['alternatives'] = alts

		results.append(skill)

	return results

def jsonifyjobpostings(records):
	results = []
	jobpostingsbyoccupation = {}
	distinctoccupations = {}
	distinctoccupations_desc = {}
	for record in records:
		occupationId	= record[0]
		occupationName  = record[1]
		occupationDesc  = record[2]
		jobpostingid	= record[3]
		scrapedate		= record[4]
		sourceurl		= record[5]
		htmlloc			= record[6]

		occupationId_ = occupationId.split("/occupation/")[1]

		jobpostings = {}
		jobpostings['id'] = jobpostingid
		jobpostings['scrapedate'] = scrapedate
		jobpostings['sourceurl'] = sourceurl
		jobpostings['htmlloc'] = htmlloc

		if occupationId_ in jobpostingsbyoccupation:
			jobpostingsbyoccupation[occupationId_].append(jobpostings)
		else:
			jobpostingsbyoccupation[occupationId_] = [jobpostings]

		distinctoccupations[occupationId_] = occupationName
		distinctoccupations_desc[occupationId_] = occupationDesc

	for occupationId__ in distinctoccupations:
		occupationName = distinctoccupations[occupationId__]
		occupationDesc = distinctoccupations_desc[occupationId__]
		jobpostings = jobpostingsbyoccupation[occupationId__]

		occupation = {}
		occupation['id'] = occupationId__
		occupation['name'] = occupationName
		occupation['desc'] = occupationDesc
		occupation['job-postings'] = jobpostings

		results.append(occupation)

	return results

def searchskills_exact(skillid):
	conceptUri = "%s/skill/%s" % (idprefix,skillid)

	query1 = """
		SELECT
			(score1*1.5 + score2*3 + score2) AS score,
			skillId,skillName,skillDesc,skillType,skillAlt,
			skillReusability,skillOptionality,
			occupationId,occupationName,occupationDesc
		FROM (
			SELECT
				s.conceptUri AS skillId,
				s.preferredLabel AS skillName,
				s.description AS skillDesc,
				s.altLabels AS skillAlt,
				s.skillType AS skillType,
				s.reuseLevel AS skillReusability,
				os.relationType AS skillOptionality,
				o.conceptUri AS occupationId,
				o.preferredLabel AS occupationName,
				o.description AS occupationDesc,
				100 aS score1,
				100 aS score2,
				100 aS score3
			FROM skills AS s
			JOIN occupations_skills AS os
			ON s.conceptUri = os.skillUri
			JOIN occupations AS o
			ON os.occupationUri = o.conceptUri
			WHERE s.conceptUri = %s
		) AS innertmp 
	"""
	cursor = _execute(db,query1,(conceptUri,))
	records = cursor.fetchall()
	cursor.close()

	return records	

def searchskills_fuzzy(skill):
	query1 = """
		SELECT
			(score1*1.5 + score2*3 + score2) AS score,
			skillId,skillName,skillDesc,skillType,skillAlt,
			skillReusability,skillOptionality,
			occupationId,occupationName,occupationDesc
		FROM (
			SELECT
				s.conceptUri AS skillId,
				s.preferredLabel AS skillName,
				s.description AS skillDesc,
				s.altLabels AS skillAlt,
				s.skillType AS skillType,
				s.reuseLevel AS skillReusability,
				os.relationType AS skillOptionality,
				o.conceptUri AS occupationId,
				o.preferredLabel AS occupationName,
				o.description AS occupationDesc,
				MATCH (s.preferredLabel,s.altLabels) AGAINST (%s IN BOOLEAN MODE) aS score1,
				MATCH (s.preferredLabel,s.altLabels) AGAINST (%s IN BOOLEAN MODE) aS score2,
				MATCH (s.description) AGAINST (%s IN BOOLEAN MODE) aS score3
			FROM skills AS s
			JOIN occupations_skills AS os
			ON s.conceptUri = os.skillUri
			JOIN occupations AS o
			ON os.occupationUri = o.conceptUri
			WHERE MATCH (s.preferredLabel,s.altLabels) AGAINST (%s IN BOOLEAN MODE)
		) AS innertmp 
		WHERE score1 > 5
		ORDER BY 1 DESC
	"""
	skillwordwildcard = "%s*" % skill
	skillwordprox = "\"%s\" @3" % skill
	cursor = _execute(db,query1,(skillwordwildcard,skillwordprox,skillwordwildcard,skillwordwildcard))
	records = cursor.fetchall()
	cursor.close()

	return records	

def searchoccupationrelated_exact(occupationid):
	conceptUri = "%s/occupation/%s" % (idprefix,occupationid)

	query1 = """  
		SELECT 
			skillOverlapCnt,occupationId,occupationName,occupationDesc,occupationAlt
		FROM (
			SELECT
				o2.conceptUri AS occupationId,
				o2.preferredLabel AS occupationName,
				o2.description AS occupationDesc,
				o2.altLabels AS occupationAlt,
				count(os2.skillUri) as skillOverlapCnt
			FROM occupations AS o
			JOIN occupations_skills AS os1
			ON o.conceptUri = os1.occupationUri
			JOIN occupations_skills AS os2
			ON os1.skillUri = os2.skillUri AND os2.occupationUri != o.conceptUri
			JOIN occupations AS o2
			ON os2.occupationUri = o2.conceptUri
			WHERE o.conceptUri = %s
			GROUP BY 1,2,3,4
			ORDER BY 5 desc
		) as innerTmp
		WHERE skillOverlapCnt > 10
	"""
	cursor = _execute(db,query1,(conceptUri,))
	records = cursor.fetchall()
	cursor.close()

	return records	

def searchoccupations_exact(occupationid):
	conceptUri = "%s/occupation/%s" % (idprefix,occupationid)

	query1 = """
	SELECT
		(score1*1.5 + score2*5 + score3) AS score,
		occupationId,occupationName,occupationDesc,occupationAlt,
		skillId,skillName,skillDesc,skillType,
		skillReusability,skillOptionality			
	FROM (
		SELECT
			o.conceptUri AS occupationId,
			o.preferredLabel AS occupationName,
			o.description AS occupationDesc,
			o.altLabels AS occupationAlt,
			s.conceptUri AS skillId,
			s.preferredLabel AS skillName,
			s.description AS skillDesc,
			s.skillType AS skillType,
			s.reuseLevel AS skillReusability,
			os.relationType AS skillOptionality,
			100 aS score1,
			100 aS score2,
			100 aS score3
		FROM occupations AS o
		JOIN occupations_skills AS os
		ON o.conceptUri = os.occupationUri
		JOIN skills AS s
		ON os.skillUri = s.conceptUri
		WHERE o.conceptUri = %s
	) AS innertmp 
	WHERE score1 > 5
	ORDER BY 1 DESC
	"""
	cursor = _execute(db,query1,(conceptUri,))
	records = cursor.fetchall()
	cursor.close()

	return records	

def searchjobpostings_exact(occupationid):
	conceptUri = "%s/occupation/%s" % (idprefix,occupationid)

	query1 = """
	SELECT
	o.conceptUri, o.preferredLabel, o.description,
	jp.jobAdId, jp.scrapeDate, jp.sourceUri, jp.jobAdTitle FROM occupations AS o
	JOIN jobpostings AS jp
	ON o.conceptUri = jp.occupationUri
	WHERE o.conceptUri = %s	
	"""
	cursor = _execute(db,query1,(conceptUri,))
	records = cursor.fetchall()
	cursor.close()

	return records

def searchoccupations_fuzzy(occupation):
	query1 = """
	SELECT
		(score1*1.5 + score2*5 + score3) AS score,
		occupationId,occupationName,occupationDesc,occupationAlt,
		skillId,skillName,skillDesc,skillType,
		skillReusability,skillOptionality			
	FROM (
		SELECT
			o.conceptUri AS occupationId,
			o.preferredLabel AS occupationName,
			o.description AS occupationDesc,
			o.altLabels AS occupationAlt,
			s.conceptUri AS skillId,
			s.preferredLabel AS skillName,
			s.description AS skillDesc,
			s.skillType AS skillType,
			s.reuseLevel AS skillReusability,
			os.relationType AS skillOptionality,
			MATCH (o.preferredLabel,o.altLabels) AGAINST (%s IN BOOLEAN MODE) aS score1,
			MATCH (o.preferredLabel) AGAINST (%s IN BOOLEAN MODE) aS score2,
			MATCH (o.description) AGAINST (%s IN BOOLEAN MODE) aS score3
		FROM occupations AS o
		JOIN occupations_skills AS os
		ON o.conceptUri = os.occupationUri
		JOIN skills AS s
		ON os.skillUri = s.conceptUri
		WHERE MATCH (o.preferredLabel,o.altLabels) AGAINST (%s IN BOOLEAN MODE)
	) AS innertmp 
	WHERE score1 > 5
	ORDER BY 1 DESC
	"""
	occwordwildcard = "%s*" % occupation
	occwordprox = "\"%s\" @3" % occupation
	cursor = _execute(db,query1,(occwordwildcard,occwordprox,occwordwildcard,occwordwildcard))
	records = cursor.fetchall()
	cursor.close()

	return records	

def isExact(idstr):
	idtest1 = "%s/occupation/%s" % (idprefix,idstr)
	idtest2 = "%s/skill/%s" % (idprefix,idstr)
	query1 = """
		SELECT conceptUri,'occupation' AS entitytype FROM occupations
		WHERE conceptUri = %s OR preferredLabel = %s
		UNION
		SELECT conceptUri,'skill' AS entitytype FROM skills
		WHERE conceptUri = %s OR preferredLabel = %s
	"""
	cursor = _execute(db,query1,(idtest1,idstr,idtest2,idstr))
	records = cursor.fetchall()
	cursor.close()

	concepttype = ''
	id_ = ''
	if records:
		idresolved = records[0][0]
		concepttype = records[0][1]

		id_ = idresolved.split("/%s/" % concepttype)[1]

	return id_,concepttype