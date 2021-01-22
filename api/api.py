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

	return func.jsonifyoutput(statuscode,status,"results",[])

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

	id_,conceptype = func.isExact(occupation)
	if conceptype == 'occupation' and id_ != '':
		records = func.searchoccupations_exact(id_)
		status = "Occupation is found with exact lookup"
	else:
		records = func.searchoccupations_fuzzy(occupation)
		status = "Multiple occupations found with fuzzy lookup"

	return func.jsonifyoutput(statuscode,status,"occupations","",func.jsonifyoccupations(records))

@app.route('/v1/occupations/<occupation>/skills', methods=['GET'])
def getskillsbyoccupation(occupation):
	print('hit [getskillsbyoccupation]')

	status = ""
	statuscode = 200
	records = []

	id_,conceptype = func.isExact(occupation)
	if conceptype == 'occupation' and id_ != '':
		records = func.searchoccupations_exact(id_)
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

	id_,conceptype = func.isExact(occupation)
	if conceptype == 'occupation' and id_ != '':
		records = func.searchoccupationrelated_exact(id_)
		status = "Related occupations found for an exact occupation"
	else:
		status = "Exact occupation id or name required for related occupations lookup"

	return func.jsonifyoutput(statuscode,status,"occupations","",func.jsonifyoccupations(records))

@app.route('/v1/occupations/<occupation>/job-postings', methods=['GET'])
def getjobposting(occupation):
	print('hit [getjobposting]')

	status = ""
	statuscode = 200
	records = []

	id_,conceptype = func.isExact(occupation)
	if conceptype == 'occupation' and id_ != '':
		records = func.searchjobpostings_exact(id_)
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

	id_,conceptype = func.isExact(skill)
	if conceptype == 'skill' and id_ != '':
		records = func.searchskills_exact(id_)
		status = "Skill is found with exact lookup"
	else:
		records = func.searchskills_fuzzy(skill)
		status = "Multiple skills found with fuzzy lookup"

	return func.jsonifyoutput(statuscode,status,"skills","",func.jsonifyskills(records))

@app.route('/v1/skills/<skill>/occupations', methods=['GET'])
def getoccupationsbyskills(skill):
	print('hit [getoccupationsbyskills]')

	status = ""
	statuscode = 200
	records = []

	id_,conceptype = func.isExact(skill)
	if conceptype == 'skill' and id_ != '':
		records = func.searchskills_exact(id_)
		status = "Multiple occupations found for an exact skill"
	else:
		status = "Exact skill id or name required for occupations lookup"

	return func.jsonifyoutput(statuscode,status,"skills","occupations",func.jsonifyskillswithoccupations(records))

if __name__ == "__main__":
	app.run(debug=True,host='0.0.0.0',port=8888)
	#waitress.serve(app, host="0.0.0.0", port=8888)
