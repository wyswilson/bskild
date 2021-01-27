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

query1 = """
SELECT postingId,rawTitle FROM jobpostings
WHERE rawTitle is NULL OR rawTitle = ''
limit 10
"""
cursor = func._execute(db,query1,None)
records = cursor.fetchall()
cursor.close()
for record in records:
	jobadid = record[0]
	s3file = "jobpostings/%s" % (jobadid)
	html = ""
	try:
		obj = s3.Object("bskild",s3file)
		html = obj.get()['Body'].read()
		print("reading html for job-posting [%s]" % (s3file))
	except:
		print("job-posting does not exists [%s]" % (s3file))

	if html != "":
		jobtitle,jobloc,jobcomp = func.extractJobDetails(html)
		print("extracted [%s] by [%s] in [%s]" % (jobtitle,jobcomp,jobloc))
	else:
		print("no html to extract from")
	print("\n")