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

			serp,urlresolved = func.fetchHtml(searchurl)

			soup = bs4.BeautifulSoup(serp, 'html.parser')
			serplinks = soup.find_all('h2',{'class':'title'})
			jobcnt = func.downloadJobPosting(joburi,jobsource,serplinks)

			if jobcnt < 15:
				startat += 10000
			else:
				startat += increment
			print("[%s] jobs downloaded" % (jobcnt))

			time.sleep(7)
