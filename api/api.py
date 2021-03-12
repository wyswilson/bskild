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

	clientip = flask.request.access_route[0]

	func.registerinterest(clientip,fname,lname,email,company,occupationid,skillid);

	return func.jsonifyoutput(statuscode,status,"","",[])

@app.route('/v1/users/career/<occupationid>/<instanceid>', methods=['DELETE'])
@func.requiretoken
def deleteusercareerinstance(userid,token,occupationid,instanceid):
	print('hit [deleteusercareerinstance]')
	
	status = "User career instance deleted"
	statuscode = 200
	
	func.deletecareerinstance(userid,occupationid,instanceid)

	return func.jsonifyoutput(statuscode,status,"","",[])

@app.route('/v1/users/career/<occupationid>', methods=['POST'])
@func.requiretoken
def updateusercareer(userid,token,occupationid):
	print('hit [updateusercareer]')
	
	status = "User career updated"
	statuscode = 200

	jsondata = json.loads(flask.request.get_data().decode('UTF-8'))
	instances = jsondata[0]['instances']
	
	func.updatecareerinstances(userid,occupationid,instances)

	return func.jsonifyoutput(statuscode,status,"","",[])

@app.route('/v1/users/career', methods=['PUT'])
@func.requiretoken
def setusercareer(userid,token):
	print('hit [setusercareer]')

	status = "New role added to user profile"
	statuscode = 200

	jsondata 	= json.loads(flask.request.get_data().decode('UTF-8'))
	occupationid= jsondata["occupationId"]

	func.saveuserroles(userid,occupationid)

	return func.jsonifyoutput(statuscode,status,"","",[])

@app.route('/v1/users/competence', methods=['GET'])
@func.requiretoken
def getusercompetence(userid,token):
	print('hit [getusercompetence]')

	status = "User competence fetched"
	statuscode = 200

	records = func.computeusercompetence(userid)

	return func.jsonifyoutput(statuscode,status,"competence","",func.jsonifycompetence(records))

@app.route('/v1/users', methods=['POST'])
@func.requiretoken
def updateuser(userid,token):
	print('hit [userupdate]')

	status = "User information updated"
	statuscode = 200

	jsondata = json.loads(flask.request.get_data().decode('UTF-8'))
	firstname	= jsondata["firstname"]
	lastname	= jsondata["lastname"]	
	countrycode	= jsondata["countrycode"]
	statename 	= jsondata["statename"]

	func.updateuserinfo(userid,firstname,lastname,countrycode,statename)

	return func.jsonifyoutput(statuscode,status,"","",[])

@app.route('/v1/users/auth', methods=['PUT'])
def registeruser(userid,token):
	print('hit [registeruser]')

	jsondata = json.loads(flask.request.get_data().decode('UTF-8'))
	email 		= jsondata["email"]
	password 	= jsondata["password"]
	firstname	= jsondata["firstname"]
	lastname	= jsondata["lastname"]

	#,use_blacklist=True check_mx=True, from_address='wyswilson@live.com', helo_host='my.host.name', smtp_timeout=10, dns_timeout=10, 
	#if validate_email.validate_email(email_address=email):
	if func.validateemail(email) and firstname != '' and lastname != '':
		userid,firstname,passwordhashed = func.finduserbyid(email,'lite')
		if userid == '':
			try:
				func.addnewuser(email,firstname,lastname,func.generatehash(password))
				return func.jsonifyoutput(200,"user registered","","",[])
			except:
				return func.jsonifyoutput(403,"user already exists","","",[])
		else:
			return func.jsonifyoutput(412,"user account already exists","","",[])
	elif firstname == '' or lastname == '':
		return func.jsonifyoutput(412,"invalid user name - try again","","",[])
	else:
		return func.jsonifyoutput(412,"invalid user email - try again","","",[])

@app.route('/v1/users/auth', methods=['GET'])
@func.requiretoken
def uservalidate(userid,token):
	print('hit [uservalidate] with [%s]' % (userid))

	records = func.finduserbyid(userid,'full')

	return func.jsonifyoutput(200,"identity verified","users","",func.jsonifyusers(records),{'Access-Token': token, 'Name': records[0][1]})

@app.route('/v1/users/auth', methods=['POST'])
def loginuser():
	print('hit [loginuser]')

	auth 		= flask.request.authorization
	email 		= auth.username
	password 	= auth.password

	if not email or not password:
		return func.jsonifyoutput(401,"unable to verify identity","","",[],{'WWW.Authentication': 'Basic realm: "login required"'})	
	else:
		userid,firstname,passwordhashed = func.finduserbyid(email,'lite')
		if userid != "" and func.checkpassword(passwordhashed,password):
			token = func.generatejwt(userid,firstname)
			tokenstr = token.decode('UTF-8')
			return func.jsonifyoutput(200,"login successful","","",[],{'Access-Token': tokenstr, 'Name': firstname})
		else:
			return func.jsonifyoutput(401,"unable to verify identity","","",[],{'WWW.Authentication': 'Basic realm: "login required"'})	
		
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
