import datetime
import flask

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

def jsonifyoutput(statuscode,message,responsetype,records):

	respobj = {}
	respobj['status'] = statuscode
	respobj['message'] = message
	respobj['count'] = len(records)
	respobj[responsetype] = records

	response = flask.jsonify(respobj),statuscode
	return response

def jsonifyskills(records):
	results = []
	occupationsbyskill = {}
	distinctskills = {}
	distinctskills_desc = {}
	distinctskills_type = {}
	distinctskills_generality = {}
	distinctskills_optionality = {}
	for record in records:
		score	  		= record[0]
		skillId  		= record[1]
		skillName		= record[2]
		skillDesc   	= record[3]
		skillType   	= record[4]			
		skillGenerality   	= record[5]			
		skillOptionality   	= record[6]			
		occupationId   	= record[7]
		occupationName  = record[8]
		occupationDesc  = record[9]

		occupationdetails = {}
		occupationdetails['id'] = occupationId
		occupationdetails['name'] = occupationName
		occupationdetails['desc'] = occupationDesc

		if skillId in occupationsbyskill:
			occupationsbyskill[skillId].append(occupationdetails)
		else:
			occupationsbyskill[skillId] = [occupationdetails]

		distinctskills[skillId] = skillName
		distinctskills_desc[skillId] = skillDesc
		distinctskills_type[skillId] = skillType
		distinctskills_generality[skillId] = skillGenerality
		distinctskills_optionality[skillId] = skillOptionality

	for skillId in distinctskills:
		skillName = distinctskills[skillId]
		skillDesc = distinctskills_desc[skillId]
		skillType = distinctskills_type[skillId]
		skillGenerality = distinctskills_generality[skillId]
		skillOptionality = distinctskills_optionality[skillId]
		occupationdetails = occupationsbyskill[skillId]

		skill = {}
		skill['id'] = skillId
		skill['name'] = skillName
		skill['desc'] = skillDesc
		skill['type'] = skillType
		skill['generality'] = skillGenerality
		skill['optionality'] = skillOptionality
		skill['occupations'] = occupationdetails

		results.append(skill)

	return results

def jsonifyoccupations(records):
	results = []
	skillsbyoccupation = {}
	distinctoccupations = {}
	distinctoccupations_desc = {}
	for record in records:
		score	  		= record[0]
		occupationId   	= record[1]
		occupationName  = record[2]
		occupationDesc	= record[3]
		skillId	   	= record[4]
		skillName	= record[5]
		skillDesc	= record[6]
		skillType	= record[7]
		skillGenerality		= record[8]
		skillOptionality	= record[9]

		skilldetails = {}
		skilldetails['id'] = skillId
		skilldetails['name'] = skillName
		skilldetails['desc'] = skillDesc
		skilldetails['type'] = skillType
		skilldetails['generality'] = skillGenerality
		skilldetails['optionality'] = skillOptionality

		if occupationId in skillsbyoccupation:
			skillsbyoccupation[occupationId].append(skilldetails)
		else:
			skillsbyoccupation[occupationId] = [skilldetails]

		distinctoccupations[occupationId] = occupationName
		distinctoccupations_desc[occupationId] = occupationDesc
	
	for occupationId in distinctoccupations:
		occupationName = distinctoccupations[occupationId]
		occupationDesc = distinctoccupations_desc[occupationId]
		skills = skillsbyoccupation[occupationId]

		occupation = {}
		occupation['id'] = occupationId
		occupation['name'] = occupationName
		occupation['desc'] = occupationDesc
		occupation['skills'] = skills

		results.append(occupation)

	return results

def searchoccupations_exact(occupationid):
	conceptUri = "%s/occupation/%s" % (idprefix,occupationid)

	query1 = """
	SELECT
		(score1 + score2*5 + score3) AS score,
		occupationId,occupationName,occupationDesc,
		skillId,skillName,skillDesc,skillType,
		skillGenerality,skillOptionality			
	FROM (
		SELECT
			o.conceptUri AS occupationId,
			o.preferredLabel AS occupationName,
			o.description AS occupationDesc,
			s.conceptUri AS skillId,
			s.preferredLabel AS skillName,
			s.description AS skillDesc,
			s.skillType AS skillType,
			s.reuseLevel AS skillGenerality,
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
	WHERE score1 > 10
	ORDER BY 1 DESC
	"""
	cursor = _execute(db,query1,(conceptUri,))
	records = cursor.fetchall()
	cursor.close()

	return records	

def searchoccupations_fuzzy(occupation):
	query1 = """
	SELECT
		(score1 + score2*5 + score3) AS score,
		occupationId,occupationName,occupationDesc,
		skillId,skillName,skillDesc,skillType,
		skillGenerality,skillOptionality			
	FROM (
		SELECT
			o.conceptUri AS occupationId,
			o.preferredLabel AS occupationName,
			o.description AS occupationDesc,
			s.conceptUri AS skillId,
			s.preferredLabel AS skillName,
			s.description AS skillDesc,
			s.skillType AS skillType,
			s.reuseLevel AS skillGenerality,
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
	WHERE score1 > 10
	ORDER BY 1 DESC
	"""
	occwordwildcard = "%s*" % occupation
	occwordprox = "\"%s\" @3" % occupation
	cursor = _execute(db,query1,(occwordwildcard,occwordprox,occwordwildcard,occwordwildcard))
	records = cursor.fetchall()
	cursor.close()

	return records	

def searchskills_exact(skillid):
	conceptUri = "%s/skill/%s" % (idprefix,skillid)

	query1 = """
		SELECT
			(score1*1.5 + score2) AS score,
			skillId,skillName,skillDesc,skillType,
			skillGenerality,skillOptionality,
			occupationId,occupationName,occupationDesc
		FROM (
			SELECT
				s.conceptUri AS skillId,
				s.preferredLabel AS skillName,
				s.description AS skillDesc,
				s.skillType AS skillType,
				s.reuseLevel AS skillGenerality,
				os.relationType AS skillOptionality,
				o.conceptUri AS occupationId,
				o.preferredLabel AS occupationName,
				o.description AS occupationDesc,
				100 aS score1,
				100 aS score2
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
			(score1*1.5 + score2) AS score,
			skillId,skillName,skillDesc,skillType,
			skillGenerality,skillOptionality,
			occupationId,occupationName,occupationDesc
		FROM (
			SELECT
				s.conceptUri AS skillId,
				s.preferredLabel AS skillName,
				s.description AS skillDesc,
				s.skillType AS skillType,
				s.reuseLevel AS skillGenerality,
				os.relationType AS skillOptionality,
				o.conceptUri AS occupationId,
				o.preferredLabel AS occupationName,
				o.description AS occupationDesc,
				MATCH (s.preferredLabel,s.altLabels) AGAINST (%s IN BOOLEAN MODE) aS score1,
				MATCH (s.description) AGAINST (%s IN BOOLEAN MODE) aS score2
			FROM skills AS s
			JOIN occupations_skills AS os
			ON s.conceptUri = os.skillUri
			JOIN occupations AS o
			ON os.occupationUri = o.conceptUri
			WHERE MATCH (s.preferredLabel,s.altLabels) AGAINST (%s IN BOOLEAN MODE)
		) AS innertmp 
		WHERE score1 > 10
		ORDER BY 1 DESC
	"""
	skillwordwildcard = "%s*" % skill
	cursor = _execute(db,query1,(skillwordwildcard,skillwordwildcard,skillwordwildcard))
	records = cursor.fetchall()
	cursor.close()

	return records	

def isId(idstr):
	idtest1 = "%s/occupation/%s" % (idprefix,idstr)
	idtest2 = "%s/skill/%s" % (idprefix,idstr)
	query1 = """
		SELECT conceptUri,'occupation' AS entitytype FROM occupations
		WHERE conceptUri = %s
		UNION
		SELECT conceptUri,'skill' AS entitytype FROM skills
		WHERE conceptUri = %s
	"""
	cursor = _execute(db,query1,(idtest1,idtest2))
	records = cursor.fetchall()
	cursor.close()

	concepttype = ''
	if records:
		idresolved = records[0][0]
		concepttype = records[0][1]

	return concepttype