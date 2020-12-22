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

@app.route('/skills/<skill>/alternative', methods=['GET'])
def getaltskills(skill):
	print('hit [getaltskills]')

	status = ""
	statuscode = 200
	records = []

	id_,conceptype = func.isExact(skill)
	if conceptype == 'skill' and id_ != '':
		records = func.searchskillalt_exact(id_)
		status = "Exact skill lookup"
	else:
		status = "Exact skill id or name required"

	return func.jsonifyoutput(statuscode,status,"skills",func.jsonifyskillsnooccupations(records))

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

@app.route('/occupations/<occupation>/alternative', methods=['GET'])
def getaltoccupations(occupation):
	print('hit [getaltoccupations]')

	status = ""
	statuscode = 200
	records = []

	id_,conceptype = func.isExact(occupation)
	if conceptype == 'occupation' and id_ != '':
		records = func.searchoccupationalt_exact(id_)
		status = "Exact occupation lookup"
	else:
		status = "Exact occupation id or name required"

	return func.jsonifyoutput(statuscode,status,"occupations",func.jsonifyoccupationsnoskills(records))

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

	return func.jsonifyoutput(statuscode,status,"occupations",func.jsonifyoccupationsnoskills(records))

	
if __name__ == "__main__":
	#app.run(debug=True,host='0.0.0.0',port=8888)
	waitress.serve(app, host="0.0.0.0", port=8888)
