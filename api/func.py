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

apisecretkey	= config['auth']['secretkey']
logfile 		= config['path']['log']
productdir 		= config['path']['products']
imagepath 		= config['path']['images']
mysqlhost 		= config['mysql']['host']
mysqlport 		= config['mysql']['port']
mysqluser 		= config['mysql']['user']
mysqlpassword 	= config['mysql']['password']
mysqldb 		= config['mysql']['db']
defaultbrandid 		= config['default']['brandid']
defaultbrandname 	= config['default']['brandname']
defaultretailercity = config['default']['retailercity']
defaultdateexpiry 	= config['default']['dateexpiry']
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

def jsonifyskillsbyoccupation(records):
	results = []
	skillsbyoccupation = {}
	distinctoccupations = {}
	distinctoccupations_desc = {}
	for record in records:
		score	  		= record[0]
		groupId  		= record[1]
		groupName		= record[2]
		occupationId   	= record[3]
		occupationName  = record[4]
		occupationAlt	= record[5]
		occupationDesc	= record[6]
		skillId	   	= record[7]
		skillName	= record[8]
		skillDesc	= record[9]
		skillType	= record[10]
		skillReuse	= record[11]

		skilldetails = {}
		skilldetails['id'] = skillId
		skilldetails['name'] = skillName
		skilldetails['desc'] = skillDesc
		skilldetails['type'] = skillType
		skilldetails['generality'] = skillReuse

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

def searchskills(skill):
	query1 = """
		SELECT
			(score1 + score2) AS score,
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
		WHERE (score1 + score2) > 10
		ORDER BY 1 DESC
	"""
	skillwordwildcard = "%s*" % skill
	cursor = _execute(db,query1,(skillwordwildcard,skillwordwildcard,skillwordwildcard))
	records = cursor.fetchall()
	cursor.close()

	return records	

def searchskillsbyoccupation(occupation):
	query1 = """
		SELECT         
			(o.score1 + o.score2*5) AS score,
			og.code AS groupId, og.preferredLabel as groupName,
			o.conceptUri AS `id`, o.preferredLabel AS `name`, o.altLabels AS syns, o.description AS `desc`,
			os.skillUri AS skillId, s.preferredLabel AS skillName, s.description AS skillDesc, s.skillType, s.reuseLevel AS skillGenerality
		FROM (         
			SELECT conceptUri,iscoGroup,preferredLabel,altLabels,description,
			MATCH (preferredLabel,altLabels) AGAINST (%s IN BOOLEAN MODE) aS score1,
			MATCH (preferredLabel,altLabels,description) AGAINST (%s IN BOOLEAN MODE) aS score2
			FROM occupations
			WHERE MATCH (preferredLabel,altLabels) AGAINST (%s IN BOOLEAN MODE)
			ORDER BY 6 desc
			LIMIT 10    
		) AS o         
		JOIN occupations_skills AS os
		ON o.conceptUri = os.occupationUri
		JOIN skills AS s
		ON os.skillUri = s.conceptUri
		JOIN occupations_groups AS og
		ON o.iscoGroup = og.code
		WHERE score1 > 10
		ORDER BY 1 desc
	"""
	occwordwildcard = "%s*" % occupation
	occwordprox = "\"%s\" @3" % occupation
	cursor = _execute(db,query1,(occwordwildcard,occwordprox,occwordwildcard))
	records = cursor.fetchall()
	cursor.close()

	return records