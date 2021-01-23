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
import sys

config = configparser.ConfigParser()
config.read('conf.ini')

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
	user = mysqluser, passwd = mysqlpassword, database=mysqldb
   	)
s3 = boto3.resource(
    service_name='s3',
    region_name=s3region,
    aws_access_key_id=s3accesskey,
    aws_secret_access_key=s3secretkey
)

logging.basicConfig(filename=logfile,level=logging.DEBUG)


def fetchhtml(url):
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
			errstr = "fetchhtml: [error-empty-page] [%s]" % (url)
			logging.debug(errstr)

	except requests.ConnectionError as e:
		errstr = "fetchhtml: [error-connection] [%s] [%s]" % (url,str(e))
		logging.debug(errstr)
	except requests.Timeout as e:
		errstr = "fetchhtml: [error-timeout] [%s] [%s]" % (url,str(e))
		logging.debug(errstr)
	except requests.RequestException as e:
		errstr = "fetchhtml: [error-request] [%s] [%s]" % (url,str(e))
		logging.debug(errstr)
	except BaseException as e:
		errstr = "fetchhtml: [error-unknown] [%s] [%s]" % (url,str(e))
		logging.debug(errstr)

	return html,urlresolved

def downloadjobads(joburi,source,serplinks):
	jobcnt = 0
	for serplink in serplinks:
		url  = serplink.find('a').get('href', '')
		jobadlink = "%s%s" % (jobrooturl,url)
		jobadid = hashlib.md5(jobadlink.encode('utf-8')).hexdigest()
		print("\tjobad [%s]" % (jobadlink))
		jobpagehtml,tmp = fetchhtml(jobadlink)

		s3file = "jobpostings/%s" % (jobadid)
		obj = s3.Object("bskild",s3file)
		obj.put(Body=jobpagehtml)

		scrapedate = datetime.datetime.today().strftime('%Y-%m-%d %H:%M:%S')

		query1 = "REPLACE INTO jobpostings (occupationUri,jobAdId,scrapeDate,source,sourceUri,jobAdTitle) VALUES (%s,%s,%s,%s,%s,%s)"
		cursor = func._execute(db,query1,(joburi,jobadid,scrapedate,source,jobadlink,""))
		db.commit()
		cursor.close()

		jobcnt += 1

	return jobcnt

if __name__ == "__main__":
	roleseed = sys.argv[1]

	print("seed: [%s]" % roleseed)
	query1 = """
		SELECT conceptUri,preferredLabel FROM occupations
		WHERE preferredLabel LIKE %s
	"""
	roleseedfuzzy = "%%%s%%" % (roleseed)
	cursor = func._execute(db,query1,(roleseedfuzzy,))
	records = cursor.fetchall()
	for record in records:
		joburi 	= record[0]
		jobtitle= record[1]

		startat = 0
		increment = 10
		while startat <= 30:

			searchurl = "%s/jobs?q=\"%s\"&start=%s" % (jobrooturl,urllib.parse.quote(jobtitle),startat)
			print("searching at [%s]" % (searchurl))

			serp,urlresolved = fetchhtml(searchurl)

			soup = bs4.BeautifulSoup(serp, 'html.parser')
			serplinks = soup.find_all('h2',{'class':'title'})
			jobcnt = downloadjobads(joburi,jobsource,serplinks)

			if jobcnt < 15:
				startat += 10000
			else:
				startat += increment
			print("[%s] jobs downloaded" % (jobcnt))

			time.sleep(7)
