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

jobadid = "963b443050d047d0fbecd136369c85ce"
s3file = "jobpostings/%s" % (jobadid)
obj = s3.Object("bskild",s3file)
html = obj.get()['Body'].read()

soup = bs4.BeautifulSoup(html, 'html.parser')
results = soup.find('span',{'class':'indeed-apply-widget'})
print(results)

#for result in results:
#	listhead = result.find('h3')
#	if listhead:
#		resulttitle = listhead.text
#		resultlink  = result.find('a').get('href', '')
#<span class=indeed-apply-widget id="indeedApplyWidget" data-indeed-apply-apiToken='157465e9e096e75e9a43d44e5bd3e64f8ec8480ca66ea14a5578cc9948b58c13' data-indeed-apply-jobTitle='Civil Engineering Technician' data-indeed-apply-jobId='1097880' data-indeed-apply-jobLocation='AU New South Wales Sydney ' data-indeed-apply-jobCompanyName='ConsultANZ' 