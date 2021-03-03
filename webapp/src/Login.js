import React from 'react';
import axios from 'axios';
import { isMobile } from 'react-device-detect';
import { getToken, setUserSession, removeUserSession } from './utils/common';

import { Modal, Header, Divider, Message, Button, Icon, Label, Image, Grid, Input } from 'semantic-ui-react';
import validator from 'validator';

class Login extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      apihost: 'http://bskild.xyz/v1',
      //apihost: 'http://127.0.0.1:8888/v1',      
      token: getToken(),
      email: '',
      password: '',
      loginmsg: '',
      inquirecustommessage: '',
      inquireroleopen: false,
      isnamevalid: true,
      isemailvalid: true,
      iscompvalid: true
    };
  }

  async validatetoken(){
    if(this.state.token){
      try{
        const requeststr = this.state.apihost + '/users'
        const response = await axios.get(requeststr,
          {
            headers: {
              "content-type": "application/json",
              "access-token": this.state.token
            }
          }
        );
        console.log('validate user [' + response.data['message'] + ']');
        this.props.history.push('/profile');
      }
      catch(err){
        if(err.response.status === 401){
          removeUserSession();
          this.props.history.push('/home');
        }
        else{
          console.log('validate user [' + err.response + ']');
        }
      }  
    }
  }

  componentDidMount() {
    this.validatetoken();
  }

  setemail(event){
    const email = document.getElementById('email').value;
    this.setState({email: email});
  }

  setpassword(event){
    const password = document.getElementById('password').value;
    this.setState({password: password});
  }

  async login(event){
    var requeststr = this.state.apihost + '/users'
    try{
      const response = await axios.post(requeststr, {},
        {
         auth: {
          username: this.state.email,
          password: this.state.password
        }
      });
      console.log('login [' + response.data['message'] + ']');
      this.setState({loginmsg: ''});  
      setUserSession(response.headers['access-token'],response.headers['name']);
        this.props.history.push({
          pathname: '/profile',
          state: { sessionid: 'xxxxxxxxxx' }
        });
    }
    catch(err){
      console.log('login error [' + err + ']');   
      this.setState({loginmsg: 'Login error'});  
    }
  }

  validatename(event){
    const fname = document.getElementById('inquirynamefirst').value;
    const lname = document.getElementById('inquirynamelast').value;
    this.checkname(fname,lname);
  }

  validateemail(event){
    const email = document.getElementById('inquiryemail').value;
    this.checkemail(email);
  }

  async checkemail(email){
    if(email !== '' && validator.isEmail(email)) { 
      await this.setState({isemailvalid: true});
    }
    else{
      await this.setState({isemailvalid: false});     
    }
  }

  async checkcompany(cname){
    if(cname !== ''){
      await this.setState({iscompvalid: true});      
    }
    else{
      await this.setState({iscompvalid: false});      
    }
  }

  async inquiryforwardedmodal(state){
    await this.setState({inquirecustommessage: ''});
    await this.setState({confirmformforwarded: state});
  }

  async submitinquiry(fname,lname,email,company,occupation,skill){

    try{
      const response = await axios.post(this.state.apihost + '/inquiries', 
        {
          fname:fname,
          lname:lname,
          email:email,
          company:company,
          occupation:occupation,
          skill:skill
        }, 
        {
          headers: {
            'crossDomain': true,
            "content-type": "application/json"
          }
        }
      )
      console.log('submit inquiry [' + response.data['message'] + ']');
    }
    catch(err){
      console.log('submit inquiry [' + err + ']');     
    }
  }

  async forwardinquiry(){
    const fname = document.getElementById('inquirynamefirst').value;
    const lname = document.getElementById('inquirynamelast').value;
    const email = document.getElementById('inquiryemail').value;
    const company = document.getElementById('inquirycomp').value;

    await this.checkname(fname,lname);
    await this.checkcompany(company);
    await this.checkemail(email);
    
    if(this.state.isemailvalid && this.state.isnamevalid && this.state.iscompvalid) { 
      console.log("forward inquiry");
      this.setState({inquireroleopen: false});
      this.setState({confirmformforwarded: true});

      this.submitinquiry(fname,lname,email,company,'','');

      const custommessage = 'Thank you. We\'ll be in touch as soon as possible.';
      this.setState({inquirecustommessage: custommessage});
    }
  }

  async checkname(fname,lname){
    if(fname !== '' && lname !== '' &&  validator.isAlpha(fname) && validator.isAlpha(lname) ) { 
      await this.setState({isnamevalid: true});
    }
    else{
      await this.setState({isnamevalid: false});     
    }
  }

  requestdemo(){
    const custommessage = 'I\'m interested in finding out more about how bSkild can help me';
    this.inquirehelpmodal(custommessage,true);
  }

  async inquirehelpmodal(message,state){
    await this.setState({inquirecustommessage: message});
    await this.setState({inquireroleopen: state});
  }

  render() {
    
    return (
      <div>
        <Modal
          basic
          onClose={this.inquirehelpmodal.bind(this,'',false)}
          open={this.state.inquireroleopen}
          centered={true}
        >
          <Header textAlign='left'>
            {this.state.inquirecustommessage}
          </Header>
          <Modal.Content>
            <Grid doubling stackable>
              <Grid.Row columns={2} divided>
                <Grid.Column>
                  <Input id="inquirynamefirst" labelPosition='left' 
                    type='text' placeholder='' size='large'
                    onChange={this.validatename.bind(this)}
                    error={!this.state.isnamevalid} fluid
                  >
                    <Label basic
                      color={!this.state.isnamevalid ? 'red' : 'black'}
                    >
                    First name
                    </Label>
                    <input />
                  </Input>
                </Grid.Column>
                <Grid.Column>
                  <Input id="inquirynamelast" labelPosition='left' 
                    type='text' placeholder='' size='large'
                    onChange={this.validatename.bind(this)}
                    error={!this.state.isnamevalid} fluid
                  >
                    <Label basic
                      color={!this.state.isnamevalid ? 'red' : 'black'}
                    >
                      Last name
                    </Label>
                    <input />
                  </Input>
                </Grid.Column>
              </Grid.Row>
              <Grid.Row columns={2} divided>
                <Grid.Column>
                  <Input id="inquiryemail" labelPosition='left' 
                    type='text' placeholder='' size='large'
                    onChange={this.validateemail.bind(this)}
                    error={!this.state.isemailvalid} fluid
                  >
                    <Label basic
                      color={!this.state.isemailvalid ? 'red' : 'black'}
                    >
                      Email&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    </Label>
                    <input />
                  </Input>
                </Grid.Column>
                <Grid.Column>
                  <Input id="inquirycomp" labelPosition='left' 
                    type='text' placeholder='' size='large'
                    error={!this.state.iscompvalid} fluid
                  >
                    <Label basic
                      color={!this.state.iscompvalid ? 'red' : 'black'}
                    >
                      Company&nbsp;&nbsp;
                    </Label>
                    <input />
                  </Input>
                </Grid.Column>            
              </Grid.Row>
            </Grid>
          </Modal.Content>
          <Modal.Actions>
            <Button className='action neg'
              onClick={this.inquirehelpmodal.bind(this,'',false)}
            >
              <Icon name='remove' />CANCEL
            </Button>
            <Button className='action'
              onClick={this.forwardinquiry.bind(this)}
            >
              <Icon name='checkmark' />SUBMIT
            </Button>
          </Modal.Actions>
        </Modal>

        <Modal
          basic 
          onClose={this.inquiryforwardedmodal.bind(this,false)}          
          open={this.state.confirmformforwarded}
          size='tiny'
          centered={false}
        >
          <Header textAlign='left'>
            {this.state.inquirecustommessage}
          </Header>
          <Modal.Actions>
            <Button className='action'
              onClick={this.inquiryforwardedmodal.bind(this,false)}
            >
              <Icon name='checkmark' />OK
            </Button>
          </Modal.Actions>
        </Modal>

        <div
        className={isMobile ? "navheader mobile" : "navheader"} 
        > 
          <Grid doubling stackable>
            <Grid.Row columns={2}>
              <Grid.Column width={6} verticalAlign='middle' textAlign='left'
                style={{ paddingTop: '0.75em'}}
              >
                <span style={{ paddingLeft: '0.2em'}}></span>
                <Image as='a' spaced='left' inline
                href='./' size='tiny' src='./logo_small.png'/>
                <span className="menulink">
                  <a href="/home" >
                    <Icon name='caret square left'/>HOME
                  </a>
                </span>
              </Grid.Column>
              <Grid.Column>                
              </Grid.Column>
            </Grid.Row>
          </Grid>
        </div>

        <div
          className={isMobile ? "bodymain mobile" : "bodymain"} 
        > 
          <Grid stackable>
            <Grid.Row columns={1}>
              <Grid.Column width={8}>
                <Input id="email" labelPosition='left' fluid
                  type='text' placeholder=''
                  onChange={this.setemail.bind(this)}
                >
                  <Label basic>Email&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</Label>
                  <input />
                </Input>
              </Grid.Column>
            </Grid.Row>
            <Grid.Row columns={1}>
              <Grid.Column width={8}>
                <Input id="password" labelPosition='left' fluid
                  type='password' placeholder=''
                  onChange={this.setpassword.bind(this)}
                >
                  <Label basic>Password</Label>
                  <input />
                </Input>
              </Grid.Column>          
            </Grid.Row>
            <Grid.Row columns={2}>
              <Grid.Column width={4}>
                <Button className='action' fluid
                  onClick={this.login.bind(this)}
                >
                  <Icon name='caret square right' />&nbsp;&nbsp;&nbsp;&nbsp;LOGIN
                </Button>
              </Grid.Column>
              <Grid.Column width={4} textAlign='left'>
                {
                  this.state.loginmsg !== '' &&
                  <Message negative size='small' fluid
                    style={{paddingTop:'0.65em',paddingBottom:'0.65em'}}
                  >
                    <Message.Content>
                      {this.state.loginmsg}
                    </Message.Content>
                  </Message>
                }
              </Grid.Column>          
            </Grid.Row>

            <Grid.Row columns={1}>
              <Grid.Column width={8}>
                <Divider horizontal>OR</Divider>
                <br/>
                <Button className='action' fluid
                  onClick={this.requestdemo.bind(this)}
                >
                  <Icon name='mail' />&nbsp;&nbsp;CONTACT TO SIGNUP
                </Button>
              </Grid.Column>
            </Grid.Row>
          </Grid>
        </div>

      </div>
    )
  }
}
export default Login;
