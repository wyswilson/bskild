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

def dbCounts():
	s3bucket = func.getS3().Bucket("bskild")
	size = sum(1 for _ in s3bucket.objects.all())
	print("files in s3: [%s]" % size)

	query1 = """
			SELECT COUNT(DISTINCT(postingId)) FROM jobpostings
	"""
	cursor = func._execute(db,query1,None)
	records = cursor.fetchall()
	uniquepostingsindb = records[0][0]
	print("postings in db: [%s]" % uniquepostingsindb)

def dbAlignment():
	postingsindb = {}
	query1 = """
		SELECT DISTINCT postingId FROM jobpostings
	"""
	cursor = func._execute(db,query1,None)
	records = cursor.fetchall()
	for record in records:
		postingid = record[0]
		postingsindb[postingid] = ""

	s3bucket = func.getS3().Bucket("bskild")
	allfiles = s3bucket.objects.all()
	for file in allfiles:
		filekey = file.key
		matchobj = re.search('^jobpostings\/(.+?)$', filekey, re.IGNORECASE)
		if matchobj:
			postingid = matchobj.group(1).strip()
			
			if postingid in postingsindb:
				print("posting [%s] exists" % postingid)
			else:
				print("posting [%s] does not exists" % postingid)
				func.getS3().Object("bskild", filekey).delete()

if __name__ == "__main__":
	#dbAlignment()
	dbCounts()
