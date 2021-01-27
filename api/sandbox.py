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
	user = mysqluser, passwd = mysqlpassword, database=mysqldb#,
   	)

logging.basicConfig(filename=logfile,level=logging.DEBUG)

s3 = boto3.resource(
    service_name='s3',
    region_name=s3region,
    aws_access_key_id=s3accesskey,
    aws_secret_access_key=s3secretkey
)

query1 = """
SELECT postingId,sourceUri FROM jobpostings
WHERE sourceUri NOT LIKE '%&vjs=3'
"""
cursor = func._execute(db,query1,None)
records = cursor.fetchall()
cursor.close()
for record in records:
	jobadid = record[0]
	sourceUri = record[1]
	jobadlink = "%s%s" % (sourceUri,"&vjs=3")
	print("\t%s" % (jobadid))
	print("\tjobad [%s]" % (jobadlink))
	jobpagehtml,tmp = func.fetchHtml(jobadlink)

	byte_jobpagehtml = jobpagehtml.encode()
	s3file = "jobpostings/%s" % (jobadid)
	obj = s3.Object("bskild",s3file)
	obj.put(Body=byte_jobpagehtml)

	query2 = "UPDATE jobpostings SET sourceUri = %s WHERE postingId = %s"
	cursor = func._execute(db,query2,(jobadlink,jobadid))
	db.commit()
	cursor.close()