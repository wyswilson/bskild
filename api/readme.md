host: bskilddb.ciphd8suvvza.ap-southeast-1.rds.amazonaws.com
port: 3306
username: minime
password: he3k7JDmXxKD
database: bskilld

ssh -i bskild.pem ubuntu@bskild.xyz
ssh -i bskild.pem ubuntu@bskild.co

run api as service
- sudo nano /lib/systemd/system/bskild.service
- put the following in file
[Unit]
Description=bskild
After=multi-user.target
[Service]
WorkingDirectory=/home/ubuntu/bskild/api
User=ubuntu
Type=idle
ExecStart=/bin/python3 /home/ubuntu/bskild/api/api.py
Restart=always
[Install]
WantedBy=multi-user.target
- sudo systemctl daemon-reload
- sudo systemctl enable bskild.service
- sudo systemctl start bskild.service
- sudo systemctl status bskild.service

##########################################################
create new react app
- in root dir, npx create-react-app webapp
