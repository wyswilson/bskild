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

@app.route('/skills/occupation/<occupation>', methods=['GET'])
def getskillsbyoccupation(occupation):
	print('hit [getskillsbyoccupation]')

	status = ""
	statuscode = 200
	records = func.searchskillsbyoccupation(occupation)
	if len(records) > 0:
		status = "The skills for the occupations that matched the query found"
	else:
		status = "No occupations matched the query"

	return func.jsonifyoutput(statuscode,status,"occupations",func.jsonifyskillsbyoccupation(records))

@app.route('/skills/<skill>', methods=['GET'])
def getskills(skill):
	print('hit [getskills]')

	status = ""
	statuscode = 200
	records = func.searchskills(skill)
	if len(records) > 0:
		status = "The skills that matched the query found"
	else:
		status = "No skills matched the query"

	return func.jsonifyoutput(statuscode,status,"skills",func.jsonifyskills(records))


if __name__ == "__main__":
	app.run(debug=True,host='0.0.0.0',port=8888)
	#waitress.serve(app, host="0.0.0.0", port=8888)
