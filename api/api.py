import datetime
import flask

import func
import flask_cors
import json
import waitress
#import validate_email

app = flask.Flask(__name__)#template_dir = os.path.abspath(flasktemplatedir) <=> static_url_path='',static_folder=template_dir,template_folder=template_dir
app.config['JSON_SORT_KEYS'] = False
flask_cors.CORS(app,
	resources={r"*": {"origins": "*"}},
	expose_headers=['Access-Token','Name'],
	support_credentials=True)

#403#Forbidden
#404#Not Found
#412#Precondition Failed
#503#Service Unavailable
#501#Not Implemented
#401#Unauthorized


@app.route("/")
@app.route("/v1")
@app.route("/v1/")
def main():
	print('hit [undefmain]')

	status = "Endpoint is not implemented"
	statuscode = 501#Not Implemented

	return func.jsonifyoutput(statuscode,status,"results","",[])

@app.route("/v1/inquiries", methods=['POST'])
def registerinquiry():
	print('hit [registerinquiry]')

	status = "Inquiry registered"
	statuscode = 200

	data = json.loads(flask.request.get_data().decode('UTF-8'))
	fname = data["fname"]
	lname = data["lname"]
	email = data["email"]
	company = data["company"]
	occupationid = data["occupation"]
	skillid = data["skill"]

	func.registerinterest(fname,lname,email,company,occupationid,skillid);

	return func.jsonifyoutput(statuscode,status,"","",[])

@app.route('/v1/users/<token>', methods=['GET'])
def uservalidate(token):
	print('hit [uservalidate] with [%s]' % (token))

	valid, userid, firstname = func.validatetoken(token)
	userid,firstname,lastname,email,passwordhashed = func.finduserbyid(userid)
	
	userrecords = []
	user = {}
	user['userid'] = userid
	user['firstname'] = firstname
	user['lastname'] = lastname
	user['email'] = email

	userrecords.append(user)

	if valid:
		return func.jsonifyoutput(200,"identity verified. hello %s" % firstname,"users","",userrecords,{'Access-Token': token, 'Name': firstname})
	else:
		return func.jsonifyoutput(401,"unable to verify identity","","",[],{'WWW.Authentication': 'Basic realm: "login required"'})			

@app.route('/v1/users/<userid>', methods=['POST'])
def userupdate(userid):
	print('hit [userupdate]')

	return func.jsonifyoutput(501,"endpoint not implemented","","",[])

@app.route('/v1/users', methods=['POST'])
def useraddorlogin():
	print('hit [useraddorlogin]')

	auth = flask.request.authorization
	if auth is not None:
		email = auth.username
		password = auth.password
		if not email or not password:
			return func.jsonifyoutput(401,"unable to verify identity","","",[],{'WWW.Authentication': 'Basic realm: "login required"'})	
		else:
			userid,firstname,lastname,email,passwordhashed = func.finduserbyid(email)
			if userid != "" and func.checkpassword(passwordhashed,password):
				token = func.generatejwt(userid,firstname)
				tokenstr = token.decode('UTF-8')
				return func.jsonifyoutput(200,"login successful","","",[],{'Access-Token': tokenstr, 'Name': firstname})
			else:
				return func.jsonifyoutput(401,"unable to verify identity","","",[],{'WWW.Authentication': 'Basic realm: "login required"'})	
	else:
		jsondata = json.loads(flask.request.get_data().decode('UTF-8'))
		email 		= jsondata["email"]
		password 	= jsondata["password"]
		firstname	= jsondata["firstname"]
		lastname	= jsondata["lastname"]

		#,use_blacklist=True check_mx=True, from_address='wyswilson@live.com', helo_host='my.host.name', smtp_timeout=10, dns_timeout=10, 
		#if validate_email.validate_email(email_address=email):
		if func.validateemail(email) and firstname != '' and lastname != '':
			try:
				func.addnewuser(email,firstname,lastname,func.generatehash(password))
				return func.jsonifyoutput(200,"user registered","","",[])
			except:
				return func.jsonifyoutput(403,"user already exists","","",[])
		elif fullname == '':
			return func.jsonifyoutput(412,"invalid fullname - try again","","",[])
		else:
			return func.jsonifyoutput(412,"invalid user email - try again","","",[])

@app.route("/v1/gazetteer/states/<countrycode>", methods=['GET'])
def getstates(countrycode):
	print('hit [getstates]')

	status = "States or provinces found for query"
	statuscode = 200
	records = func.searchstatesprovinces(countrycode);

	return func.jsonifyoutput(statuscode,status,"states","",func.jsonifygeo(records,'state'))

@app.route("/v1/gazetteer/countries", methods=['GET'])
def getcountries():
	print('hit [getcountries]')

	status = "All countries returned"
	statuscode = 200
	records = func.searchcountries();

	return func.jsonifyoutput(statuscode,status,"countries","",func.jsonifygeo(records,'country'))

@app.route("/v1/occupations/highdemand", methods=['GET'])
def getpopularoccupations():
	print('hit [getpopularoccupations]')

	count = flask.request.query_string.decode('UTF-8')

	status = "High demand occupations found"
	statuscode = 200
	records = func.fetchpopularoccupations(count);

	return func.jsonifyoutput(statuscode,status,"occupations","",func.jsonifyoccupations(records,'lite'))

@app.route("/v1/occupations")
@app.route("/v1/occupations/")
def undefoccupations():
	print('hit [undefoccupations]')

	status = "Occupation id or name is missing"
	statuscode = 501#Not Implemented

	return func.jsonifyoutput(statuscode,status,"occupations","",[])

@app.route('/v1/occupations/<occupation>', methods=['GET'])
def getoccupations(occupation):
	print('hit [getoccupations]')

	status = ""
	statuscode = 200
	records = []

	liteornot = flask.request.query_string.decode('UTF-8')

	id_,canonicalname,conceptype = func.isExact(occupation)
	if conceptype == 'occupation' and id_ != '':
		records = func.searchoccupations_exact(id_,10)
		status = "Occupation is found with exact lookup"
	else:
		records = func.searchoccupations_fuzzy(occupation)
		status = "Multiple occupations found with fuzzy lookup"

	return func.jsonifyoutput(statuscode,status,"occupations","",func.jsonifyoccupations(records,liteornot))

@app.route('/v1/occupations/<occupation>/skills', methods=['GET'])
def getskillsbyoccupation(occupation):
	print('hit [getskillsbyoccupation]')

	status = ""
	statuscode = 200
	records = []

	count = flask.request.query_string.decode('UTF-8')

	id_,canonicalname,conceptype = func.isExact(occupation)
	if conceptype == 'occupation' and id_ != '':
		records = func.searchoccupations_exact(id_,count)
		status = "Multiple skills found for an exact occupation"
	else:
		status = "Exact occupation id or name required for skill lookup"

	return func.jsonifyoutput(statuscode,status,"occupations","skills",func.jsonifyoccupationswithskills(records))

@app.route('/v1/occupations/<occupation>/related', methods=['GET'])
def getrelatedoccupations(occupation):
	print('hit [getrelatedoccupations]')

	status = ""
	statuscode = 200
	records = []

	count = flask.request.query_string.decode('UTF-8')

	id_,canonicalname,conceptype = func.isExact(occupation)
	if conceptype == 'occupation' and id_ != '':
		records = func.searchoccupationrelated_exact(id_,count)
		status = "Related occupations found for an exact occupation"
	else:
		status = "Exact occupation id or name required for related occupations lookup"

	return func.jsonifyoutput(statuscode,status,"occupations","",func.jsonifyoccupations(records,'full'))

@app.route('/v1/occupations/<occupation>/job-postings', methods=['GET'])
def getjobposting(occupation):
	print('hit [getjobposting]')

	status = ""
	statuscode = 200
	records = []

	id_,canonicalname,conceptype = func.isExact(occupation)
	if conceptype == 'occupation' and id_ != '':
		records = func.searchjobpostings_exact(id_,canonicalname)
		status = "Job postings found for an exact occupation"
	else:
		status = "Exact occupation id or name required for job postings lookup"

	return func.jsonifyoutput(statuscode,status,"occupations","job-postings",func.jsonifyjobpostings(records))

@app.route("/v1/skills")
@app.route("/v1/skills/")
def undefskills():
	print('hit [undefskills]')

	status = "Skill id or name is missing"
	statuscode = 501#Not Implemented

	return func.jsonifyoutput(statuscode,status,"skills","",[])

@app.route('/v1/skills/<skill>', methods=['GET'])
def getskills(skill):
	print('hit [getskills]')

	status = ""
	statuscode = 200
	records = []

	liteornot = flask.request.query_string.decode('UTF-8')

	id_,canonicalname,conceptype = func.isExact(skill)
	if conceptype == 'skill' and id_ != '':
		records = func.searchskills_exact(id_)
		status = "Skill is found with exact lookup"
	else:
		records = func.searchskills_fuzzy(skill)
		status = "Multiple skills found with fuzzy lookup"

	return func.jsonifyoutput(statuscode,status,"skills","",func.jsonifyskills(records,liteornot))

@app.route('/v1/skills/<skill>/occupations', methods=['GET'])
def getoccupationsbyskills(skill):
	print('hit [getoccupationsbyskills]')

	status = ""
	statuscode = 200
	records = []

	id_,canonicalname,conceptype = func.isExact(skill)
	if conceptype == 'skill' and id_ != '':
		records = func.searchskills_exact(id_)
		status = "Multiple occupations found for an exact skill"
	else:
		status = "Exact skill id or name required for occupations lookup"

	return func.jsonifyoutput(statuscode,status,"skills","occupations",func.jsonifyskillswithoccupations(records))

if __name__ == "__main__":
	#app.run(debug=True,host='0.0.0.0',port=8888)
	waitress.serve(app, host="0.0.0.0", port=8888)
