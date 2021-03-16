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
import boto3
import sys

config = configparser.ConfigParser()
config.read('conf.ini')

apisecretkey	= config['auth']['secretkey']
logfile 		= config['path']['log']
idprefix 		= config['path']['idprefix']
s3region 		= config['aws']['s3_region']
s3accesskey 	= config['aws']['s3_accesskey']
s3secretkey 	= config['aws']['s3_secretkey']
mysqlhost 		= config['mysql']['host']
mysqlport 		= config['mysql']['port']
mysqluser 		= config['mysql']['user']
mysqlpassword 	= config['mysql']['password']
mysqldb 		= config['mysql']['db']
jobsource 		= config['scraper']['jobsource']
jobrooturl 		= config['scraper']['jobrooturl']
useragents 		= json.loads(config['scraper']['useragents'].replace('\n',''))

db = mysql.connector.connect(
	host = mysqlhost,
	port = mysqlport,
	user = mysqluser, passwd = mysqlpassword, database=mysqldb#,
   	)

logging.basicConfig(filename=logfile,level=logging.DEBUG)

s3 = boto3.resource(
    service_name='s3',
    region_name=s3region,
    aws_access_key_id=s3accesskey,
    aws_secret_access_key=s3secretkey
)

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

def generatehash(password):
	return werkzeug.security.generate_password_hash(password, method='sha256')

def checkpassword(passwordhashed,passwordfromauth):
	return werkzeug.security.check_password_hash(passwordhashed, passwordfromauth)

def generatejwt(userid,firstname):
	params = {'userid': userid,
				'firstname': firstname,
			'exp' : datetime.datetime.utcnow() + datetime.timedelta(minutes=1440)}
	token = jwt.encode(params, apisecretkey, algorithm='HS256')
	return token

def validatetoken(token):
	userid = None
	firstname = None
	try:
		data = jwt.decode(token, apisecretkey)
		userid = data['userid']
		firstname = data['firstname']
		return True,userid,firstname
	except:
		return False,userid,firstname

def requiretoken(f):
	@functools.wraps(f)
	def decorator(*args, **kwargs):
		headers = flask.request.headers
		if 'access-token' in headers:
			token = headers['access-token']
			valid,userid,firstname = validatetoken(token)
			if valid:
				return f(userid,token, *args, **kwargs)
			else:
				return jsonifyoutput(401,"unauthorised access - invalid token","","",[])
		else:
			return jsonifyoutput(401,"unauthorised access - missing token","","",[])

	return decorator

def basicauth():
    message = {'message': "authentication required"}
    resp = flask.jsonify(message)

    resp.status_code = 401
    resp.headers['WWW-Authenticate'] = 'Basic realm="Example"'

    return resp

def requiresbasicauth(f):
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        auth = flask.request.authorization
        if not auth: 
            return basicauth()
        elif auth.username != apiuser and auth.password != apipassword:
            return basicauth()

        return f(*args, **kwargs)
    return decorated

def saveuserroles(userid,conceptid):
	concepturi = "%s/occupation/%s" % (idprefix,conceptid)

	query1 = """
	SELECT
	  	*
	FROM careers
	WHERE userId = %s AND occupationUri = %s
	"""
	cursor = _execute(db,query1,(userid,concepturi))
	records = cursor.fetchall()
	cursor.close()

	if len(records) == 0:
		query2 = """
			REPLACE INTO careers (userId,occupationUri)
			VALUES (%s,%s)
		"""
		cursor = _execute(db,query2,(userid,concepturi))
		db.commit()
		cursor.close()	
	else:
		query2 = """
			DELETE FROM careers
			WHERE userId = %s AND occupationUri = %s
		"""
		cursor = _execute(db,query2,(userid,concepturi))
		db.commit()
		cursor.close()			

def deletecareerinstance(userid,occupationid,instanceid):
	concepturi = "%s/occupation/%s" % (idprefix,occupationid)

	query1 = """
	SELECT
	  	count(*)
	FROM careers
	WHERE userId = %s AND occupationUri = %s
	"""
	cursor = _execute(db,query1,(userid,concepturi))
	records = cursor.fetchall()
	cursor.close()

	instancecnt = records[0][0]
	if instancecnt > 1:
		query2 = """
			DELETE FROM careers 
			WHERE userId = %s AND occupationUri = %s AND instanceId = %s
		"""
		cursor = _execute(db,query2,(userid,concepturi,instanceid))
		db.commit()
		cursor.close()
	else:
		query2 = """
			UPDATE careers SET company = '', dateFrom = '0000-00-00', dateTo = '0000-00-00'
			WHERE userId = %s AND occupationUri = %s AND instanceId = %s
		"""
		cursor = _execute(db,query2,(userid,concepturi,instanceid))
		db.commit()
		cursor.close()

def updatecareerinstances(userid,occupationid,instances):
	concepturi = "%s/occupation/%s" % (idprefix,occupationid)

	for instance in instances:
		instanceid 	= instance['instanceid']
		company 	= instance['company']
		datefrom 	= instance['datefrom']
		dateto 		= instance['dateto']

		if instanceid != '0':
			query2 = """
				UPDATE careers SET company = %s, dateFrom = %s, dateTo = %s
				WHERE userId = %s AND occupationUri = %s AND instanceId = %s
			"""
			cursor = _execute(db,query2,(company,datefrom,dateto,userid,concepturi,instanceid))
			db.commit()
			cursor.close()
		else:
			query3 = """
				INSERT INTO careers (userId,occupationUri,company,dateFrom,dateTo)
				VALUES (%s,%s,%s,%s,%s)
			"""
			cursor = _execute(db,query3,(userid,concepturi,company,datefrom,dateto))
			db.commit()
			cursor.close()	

def validateemail(email):
	if re.match("^.+@(\[?)[a-zA-Z0-9-.]+.([a-zA-Z]{2,3}|[0-9]{1,3})(]?)$", email) != None:
		return True
	else:
		return False

def updateuserinfo(userid,firstname,lastname,countrycode,statename):
	query2 = """
		UPDATE users
		SET firstName = %s, lastName = %s,
		countryCode = %s, stateName = %s
		WHERE userid = %s
	"""
	cursor = _execute(db,query2,(firstname,lastname,countrycode,statename,userid))
	db.commit()
	cursor.close()

def jsonifyusers(records):
	results = []
	occupationsbyuser = []
	firstnames 		= {}
	lastnames 		= {}
	emails 			= {}
	passwordshashed = {}
	countrycodes 	= {}
	countrynames 	= {}
	statenames 		= {}
	occupations 	= {}
	for record in records:	
		userid 		= record[0]
		firstname 	= record[1]
		lastname 	= record[2]
		email 		= record[3]
		#passwordhashed = record[4]
		countrycode = record[5]
		countryname = record[6]
		statename 	= record[7]
		occupationuri 	= record[8]
		occupationname 	= record[9]
		occupationdesc 	= record[10]
		instanceid 		= record[11]
		company 		= record[12]
		datefrom 		= record[13]
		dateto 			= record[14]

		try:
			datefrom = datefrom.strftime("%Y-%m-%d")
			dateto = dateto.strftime("%Y-%m-%d")
		except:
			pass

		occupationid = occupationuri.split("/occupation/")[1]

		occupationdetails = {}
		occupationdetails['occupationid'] = occupationid
		occupationdetails['name'] = occupationname
		occupationdetails['desc'] = occupationdesc
		occupationdetails['instanceid'] = instanceid
		occupationdetails['company'] = company
		occupationdetails['datefrom'] = datefrom
		occupationdetails['dateto'] = dateto

		occupationsbyuser.append(occupationdetails)
		
		firstnames[userid] = firstname
		lastnames[userid] = lastname
		emails[userid] = email
		#passwordshashed[userid] = passwordhashed
		countrycodes[userid] = countrycode
		countrynames[userid] = countryname
		statenames[userid] = statename
		occupations[userid] = occupationsbyuser

	for userid in firstnames:
		firstname = firstnames[userid]
		lastname = lastnames[userid]
		email = emails[userid]
		#passwordhashed = passwordshashed[userid]
		countrycode = countrycodes[userid]
		countryname = countrynames[userid]
		statename = statenames[userid]
		occupationsbyuser = occupations[userid]

		user = {}
		user['userid'] = userid
		user['firstname'] = firstname
		user['lastname'] = lastname
		user['email'] = email
		#user['passwordhashed'] = passwordhashed
		user['countrycode'] = countrycode
		user['countryname'] = countryname
		user['statename'] = statename
		user['occupations'] = occupationsbyuser

		results.append(user)	

	return results

def finduserbyid(emailoruserid,mode):
	if mode != 'lite':
		query1 = """
		SELECT
		  	u.userId,u.firstName,u.lastName,u.email,u.pwdHashed,
		  	gc.countryCode,gc.countryName,u.stateName,
		  	o.conceptUri,o.preferredLabel,o.description,
		  	uf.instanceId,uf.company,uf.dateFrom,uf.dateTo
		FROM users as u
		JOIN geo_countries as gc
		ON u.countryCode = gc.countryCode
		JOIN careers AS uf
		ON u.userId = uf.userId
		JOIN occupations AS o
		ON uf.occupationUri = o.conceptUri
		WHERE u.email = %s OR u.userId = %s
		ORDER BY uf.dateFrom DESC
		"""
		cursor = _execute(db,query1,(emailoruserid,emailoruserid))
		records = cursor.fetchall()
		cursor.close()

		return records
	else:
		query1 = """
		SELECT
		  	u.userId,u.firstName,u.pwdHashed
		FROM users as u
		WHERE u.email = %s OR u.userId = %s
		"""
		cursor = _execute(db,query1,(emailoruserid,emailoruserid))
		records = cursor.fetchall()
		cursor.close()

		userid = ''
		fname = ''
		pwdhashed = ''
		if records:
			userid = records[0][0]
			fname = records[0][1]
			pwdhashed = records[0][2]

		return userid,fname,pwdhashed

def computeusercompetency(userid):
	query1 = """
	SELECT
		tenureDays*instanceCnt AS score,
		skillUri,skillName,skillDesc,
		skillType,skillReusability,tenureDays,instanceCnt
	FROM(
		SELECT
			s.conceptUri AS skillUri, s.preferredLabel AS skillName, s.description AS skillDesc,
			s.skillType AS skillType, s.reuseLevel AS skillReusability,
			SUM(
			case 
				when DATEDIFF(c.dateTo, c.dateFrom) then DATEDIFF(c.dateTo, c.dateFrom)
				when DATEDIFF(CURDATE(), c.dateFrom) then DATEDIFF(CURDATE(), c.dateFrom) 
				ELSE 0
			END) AS tenureDays,
			COUNT(DISTINCT(c.instanceId)) AS instanceCnt
		FROM careers AS c
		JOIN occupations AS o
		ON c.occupationUri = o.conceptUri
		JOIN occupations_skills AS os
		ON c.occupationUri = os.occupationUri
		JOIN skills AS s
		ON os.skillUri = s.conceptUri
		WHERE c.userId = %s
		GROUP BY 1,2,3,4
	) AS competence
	ORDER BY 1 DESC
	LIMIT 50
	"""
	cursor = _execute(db,query1,(userid,))
	records = cursor.fetchall()
	cursor.close()

	return records

def addnewuser(email,fname,lname,pwdHashed):
	userid = hashlib.md5(email.encode('utf-8')).hexdigest()
	query1 = "INSERT INTO users (userId,email,firstName,lastName,pwdHashed) VALUES (%s,%s,%s,%s,%s)"
	cursor = _execute(db,query1,(userid,email,fname,lname,pwdHashed))
	db.commit()
	cursor.close()

def registerinterest(clientip,fname,lname,email,company,occupationid,skillid):
	occupationUri = "%s/occupation/%s" % (idprefix,occupationid)
	skillUri = ''

	if skillid != '':
		skillUri = "%s/skill/%s" % (idprefix,skillid)

	inquirydate = datetime.datetime.today().strftime('%Y-%m-%d %H:%M:%S')

	query1 = "INSERT INTO inquiries (inquiryDate,clientIp,firstname,lastname,email,company,occupationUri,skillUri) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)"
	cursor = _execute(db,query1,(inquirydate,clientip,fname,lname,email,company,occupationUri,skillUri))
	db.commit()
	cursor.close()

def jsonifyoutput(statuscode,message,primaryresp,secondaryresp,records,auth=None):
	respobj = {}
	respobj['status'] = statuscode
	respobj['message'] = message
	if secondaryresp != "":
		try:
			respobj['count'] = len(records[0][secondaryresp])
		except:
			respobj['count'] = 0
	else:
		respobj['count'] = len(records)
	if primaryresp != "":
		respobj[primaryresp] = records

	if isinstance(auth, dict):
		response = flask.jsonify(respobj),statuscode,auth
	else:
		response = flask.jsonify(respobj),statuscode

	return response

def jsonifycompetency(records):
	results = []
	for record in records:
		score       	= record[0]
		skillUri		= record[1]
		skillName  		= record[2]
		skillDesc  		= record[3]
		skillType  		= record[4]
		skillReusability= record[5]
		tenureDays  	= record[6]
		instanceCnt  	= record[7]

		skillId = skillUri.split("/skill/")[1]

		skilldetails = {}
		skilldetails['id'] = skillId
		skilldetails['name'] = skillName
		skilldetails['desc'] = skillDesc
		skilldetails['type'] = skillType
		skilldetails['reusability'] = skillReusability	
		skilldetails['experiencedIn'] = instanceCnt		

		results.append(skilldetails)
		
	return results

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
		occupationdetails['optionality'] = skillOptionality

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
		#occupation['confidence'] = score
		occupation['skills'] = skills

		results.append(occupation)

	return results

def jsonifyoccupations(records,liteornot):
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
		if liteornot != 'lite':
			occupation['alternatives'] = alts

		results.append(occupation)

	return results

def jsonifyskills(records,liteornot):
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
		skill['id'] = skillId__
		skill['name'] = skillName
		skill['desc'] = skillDesc
		if liteornot != 'lite':
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
		scrapeDate		= record[4]
		sourceurl		= record[5]
		rawTitle		= record[6]
		rawLocation		= record[7]
		rawCompany		= record[8]

		occupationId_ = occupationId.split("/occupation/")[1]

		jobpostings = {}
		if jobpostingid != None:
			jobpostings['id'] = jobpostingid
			jobpostings['scrapedate'] = scrapeDate
			jobpostings['sourceurl'] = sourceurl
			jobpostings['title'] = rawTitle
			jobpostings['location'] = rawLocation
			jobpostings['company'] = rawCompany


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
		if len(jobpostings) > 1:
			occupation['job-postings'] = jobpostings
		else:
			occupation['job-postings'] = []

		results.append(occupation)

	return results

def jsonifygeo(records,geotype):
	results = []
	for record in records:
		code = record[0]
		name = record[1]
		population = record[2]

		place = {}
		place['id'] = code
		place['name'] = name
		place['population'] = population
		if geotype == 'country':
			continent = record[3]
			place['continent'] = continent

		results.append(place)

	return results

def searchstatesprovinces(countrycode):

	query1 = """
	SELECT stateId, district, totalPopulation
	FROM (
		SELECT 
			district,
			GROUP_CONCAT(cityId
	     	ORDER BY cityId ASC
	     	SEPARATOR '-') AS stateId,
		  	SUM(population) AS totalPopulation
		FROM geo_cities
		WHERE countryCode = %s
		GROUP BY 1
	) as x
	ORDER BY 3 desc
	"""
	cursor = _execute(db,query1,(countrycode,))
	records = cursor.fetchall()
	cursor.close()

	return records	

def searchcountries():
	query1 = """
	SELECT 
		countryCode,countryName,population,continent
	FROM geo_countries
	ORDER BY population desc 
	"""
	cursor = _execute(db,query1,None)
	records = cursor.fetchall()
	cursor.close()

	return records	

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
		WHERE score1 >= 5
		ORDER BY 1 DESC
	"""
	skillwordwildcard = "%s*" % skill
	skillwordprox = "\"%s\" @3" % skill
	cursor = _execute(db,query1,(skillwordwildcard,skillwordprox,skillwordwildcard,skillwordwildcard))
	records = cursor.fetchall()
	cursor.close()

	return records	

def searchoccupationrelated_exact(occupationid,count):
	conceptUri = "%s/occupation/%s" % (idprefix,occupationid)

	topn = 5
	try:
		topn = int(count) 
	except:
		pass

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
		LIMIT %s
	"""
	cursor = _execute(db,query1,(conceptUri,topn))
	records = cursor.fetchall()
	cursor.close()

	return records	

def searchoccupations_exact(occupationid,count):
	conceptUri = "%s/occupation/%s" % (idprefix,occupationid)

	topn = 10
	try:
		topn = int(count) 
	except:
		pass

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
	WHERE score1 >= 5
	ORDER BY 11 ASC
	LIMIT %s
	"""
	cursor = _execute(db,query1,(conceptUri,topn))
	records = cursor.fetchall()
	cursor.close()

	return records	

def searchjobpostings_exact(occupationid,canonicalname):
	conceptUri = "%s/occupation/%s" % (idprefix,occupationid)

	query1 = """
	SELECT
		conceptUri,preferredLabel,description,
		postingId,scrapeDate,sourceUri,rawTitle,rawLocation,rawCompany,
		(score1 + score2) AS score
	FROM (
		SELECT
			o.conceptUri, o.preferredLabel, o.description,
			jp.postingId, jp.scrapeDate, jp.sourceUri, jp.rawTitle, jp.rawLocation, jp.rawCompany,
			MATCH(jp.rawTitle) AGAINST(%s IN BOOLEAN MODE ) AS score1,
			MATCH(jp.rawTitle) AGAINST (%s IN BOOLEAN MODE) aS score2
		FROM occupations AS o
		LEFT JOIN jobpostings AS jp
		ON o.conceptUri = jp.occupationUri
		WHERE o.conceptUri = %s
	) AS tmp
	ORDER BY 10 desc
	"""
	occwordprox = "\"%s\" @3" % canonicalname
	cursor = _execute(db,query1,(canonicalname,occwordprox,conceptUri))
	records = cursor.fetchall()
	cursor.close()

	return records

def fetchpopularoccupations(count):
	topn = 3
	try:
		topn = int(count) 
	except:
		pass

	query1 = """
	SELECT
		COUNT(DISTINCT(jobId)) AS score,
		occupationId, occupationName, occupationDesc, occupationAlt
	FROM (
		SELECT
			o.conceptUri AS occupationId, o.preferredLabel AS occupationName, o.description AS occupationDesc,
			o.altLabels AS occupationAlt,
			jp.postingId AS jobId
		FROM occupations AS o
		LEFT JOIN jobpostings AS jp
		ON o.conceptUri = jp.occupationUri
		WHERE DATE_SUB(CURDATE(), INTERVAL 7 DAY) < jp.scrapeDate
	) AS tmp
	GROUP BY 2,3,4,5
	ORDER BY 1 DESC
	limit %s
	"""
	cursor = _execute(db,query1,(topn,))
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
	WHERE score1 >= 5
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
		SELECT conceptUri,preferredLabel,'occupation' AS entitytype FROM occupations
		WHERE conceptUri = %s OR preferredLabel = %s
		UNION
		SELECT conceptUri,preferredLabel,'skill' AS entitytype FROM skills
		WHERE conceptUri = %s OR preferredLabel = %s
	"""
	cursor = _execute(db,query1,(idtest1,idstr,idtest2,idstr))
	records = cursor.fetchall()
	cursor.close()

	concepttype 	= ''
	id_ 			= ''
	preferredname 	= ''
	if records:
		idresolved = records[0][0]
		preferredname = records[0][1]
		concepttype = records[0][2]

		id_ = idresolved.split("/%s/" % concepttype)[1]

	return id_,preferredname,concepttype

def fetchHtml(url):
	html = ""
	urlresolved = ""
	try:
		session = requests.Session()
		randagent = random.choice(useragents)
		headers = {'User-Agent': randagent}
		r = session.get(url, headers=headers, timeout=10)
		#cookie = dict(r.cookies)
		#print(cookie)
		#r = session.get(url, cookies=cookie)
		
		urlresolved = r.url
		html = r.content.decode('utf-8')
		if html == '':
			errstr = "fetchHtml: [error-empty-page] [%s]" % (url)
			logging.debug(errstr)

	except requests.ConnectionError as e:
		errstr = "fetchHtml: [error-connection] [%s] [%s]" % (url,str(e))
		logging.debug(errstr)
	except requests.Timeout as e:
		errstr = "fetchHtml: [error-timeout] [%s] [%s]" % (url,str(e))
		logging.debug(errstr)
	except requests.RequestException as e:
		errstr = "fetchHtml: [error-request] [%s] [%s]" % (url,str(e))
		logging.debug(errstr)
	except BaseException as e:
		errstr = "fetchHtml: [error-unknown] [%s] [%s]" % (url,str(e))
		logging.debug(errstr)

	return html,urlresolved

def extractJobDetails(html):
	soup = bs4.BeautifulSoup(html, 'html.parser')
	matchobj = soup.find("span", {"class": "indeed-apply-widget", "data-indeed-apply-jobtitle": True})
	
	jobloc = ""
	jobcomp = ""
	jobtitle = ""		
	if matchobj:
		jobtitle 	= matchobj['data-indeed-apply-jobtitle']
		jobloc 		= ""
		jobcomp 	= ""
		try:
			jobloc = matchobj['data-indeed-apply-joblocation']
			jobcomp = matchobj['data-indeed-apply-jobcompanyname']
		except:
			pass

		jobtitle 	= jobtitle.strip()
		jobloc 		= jobloc.strip()
		jobcomp 	= jobcomp.strip()
	else:
		titlematchedobj = soup.find("title")
		if titlematchedobj:
			titlematched = titlematchedobj.text
			print("\t%s" % titlematched)
			if titlematched != "hCaptcha solve page":
				matchobj = re.search('^(.+?)\-([^\-]+?)\-\sIndeed.com$', titlematched, re.IGNORECASE)
				if matchobj:
					jobtitle 	= matchobj.group(1).strip()
					jobloc 		= matchobj.group(2).strip()
			else:
				jobtitle = "TERMINATE"

	return(jobtitle,jobloc,jobcomp)

def saveToS3(id,html):
	bytehtml = html.encode()
	s3file = "jobpostings/%s" % (id)
	s3obj = s3.Object("bskild",s3file)
	s3obj.put(Body=bytehtml)

def downloadJobPostings(joburi,source,serplinks):
	jobcnt = 0
	for serplink in serplinks:
		url  = serplink.find('a').get('href', '')
		jobadlink = "%s%s%s" % (jobrooturl,url,"&vjs=3")#the last suffix ensures the jobdetaipage remains on indeed
		jobadid = hashlib.md5(jobadlink.encode('utf-8')).hexdigest()

		jobpagehtml,tmp = fetchHtml(jobadlink)
		print("\tjobad fetched [%s]" % (jobadlink))

		jobtitle,jobloc,jobcomp = extractJobDetails(jobpagehtml)
		print("\tjobad details extracted [%s][%s][%s]" % (jobtitle,jobloc,jobcomp))
		
		if jobtitle != "TERMINATE" and jobtitle != '':
			saveToS3(jobadid,jobpagehtml)		

			scrapedate = datetime.datetime.today().strftime('%Y-%m-%d %H:%M:%S')

			query1 = "REPLACE INTO jobpostings (occupationUri,postingId,scrapeDate,source,sourceUri,rawTitle,rawLocation,rawCompany) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)"
			cursor = _execute(db,query1,(joburi,jobadid,scrapedate,source,jobadlink,jobtitle,jobloc,jobcomp))
			db.commit()
			cursor.close()

			print("\tjobad stored")
			jobcnt += 1
		else:
			print("\tjobad not stored. invalid jobad")
			jobcnt = 0

	return jobcnt

def getS3():
	return s3