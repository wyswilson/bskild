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
def main():
	print('hit [undefmain]')

	status = "invalid endpoint"
	statuscode = 501#Not Implemented

	return func.jsonifyoutput(statuscode,status,"results",[])

@app.route("/occupations")
@app.route("/occupations/")
def undefoccupations():
	print('hit [undefoccupations]')

	status = "invalid endpoint"
	statuscode = 501#Not Implemented

	return func.jsonifyoutput(statuscode,status,"occupations",[])

@app.route('/occupations/<occupation>', methods=['GET'])
def getoccupations(occupation):
	print('hit [getoccupations]')

	status = ""
	statuscode = 200
	records = []

	id_,conceptype = func.isExact(occupation)
	if conceptype == 'occupation' and id_ != '':
		records = func.searchoccupations_exact(id_)
		status = "Exact occupation lookup"
	else:
		records = func.searchoccupations_fuzzy(occupation)
		status = "Fuzzy search for occupations with query"

	return func.jsonifyoutput(statuscode,status,"occupations",func.jsonifyoccupations(records))

@app.route('/occupations/<occupation>/skills', methods=['GET'])
def getskillsbyoccupation(occupation):
	print('hit [getskillsbyoccupation]')

	status = ""
	statuscode = 200
	records = []

	id_,conceptype = func.isExact(occupation)
	if conceptype == 'occupation' and id_ != '':
		records = func.searchoccupations_exact(id_)
		status = "Exact occupation lookup"
	else:
		status = "Exact occupation id or name required"

	return func.jsonifyoutput(statuscode,status,"occupations",func.jsonifyoccupationswithskills(records))

@app.route('/occupations/<occupation>/related', methods=['GET'])
def getrelatedoccupations(occupation):
	print('hit [getrelatedoccupations]')

	status = ""
	statuscode = 200
	records = []

	id_,conceptype = func.isExact(occupation)
	if conceptype == 'occupation' and id_ != '':
		records = func.searchoccupationrelated_exact(id_)
		status = "Exact occupation lookup"
	else:
		status = "Exact occupation id or name required"

	return func.jsonifyoutput(statuscode,status,"occupations",func.jsonifyoccupations(records))

@app.route("/skills")
@app.route("/skills/")
def undefskills():
	print('hit [undefskills]')

	status = "invalid endpoint"
	statuscode = 501#Not Implemented

	return func.jsonifyoutput(statuscode,status,"skills",[])

@app.route('/skills/<skill>', methods=['GET'])
def getskills(skill):
	print('hit [getskills]')

	status = ""
	statuscode = 200
	records = []

	id_,conceptype = func.isExact(skill)
	if conceptype == 'skill' and id_ != '':
		records = func.searchskills_exact(id_)
		status = "Exact skill lookup"
	else:
		records = func.searchskills_fuzzy(skill)
		status = "Fuzzy search for skills with query"

	return func.jsonifyoutput(statuscode,status,"skills",func.jsonifyskills(records))

if __name__ == "__main__":
	#app.run(debug=True,host='0.0.0.0',port=8888)
	waitress.serve(app, host="0.0.0.0", port=8888)
