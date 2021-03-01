import React from 'react';
import axios from 'axios';
import { isMobile } from 'react-device-detect';
import { getToken, setUserSession, removeUserSession } from './utils/common';

import { Message, Button, Icon, Label, Image, Grid, Input } from 'semantic-ui-react'

class Login extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      apihost: 'http://bskild.xyz/v1',
      //apihost: 'http://127.0.0.1:8888/v1',      
      token: getToken(),
      email: '',
      password: '',
      loginmsg: ''
    };
  }

  async validatetoken(){
    if(this.state.token){
      try{
        const requeststr = this.state.apihost + '/users/' + this.state.token
        const response = await axios.get(requeststr);
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

  render() {
    
    return (
      <div>
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
            <Grid doubling stackable>
              <Grid.Row columns={1}>
                <Grid.Column width={10}>
                  <Input id="email" labelPosition='left' fluid
                    type='text' placeholder='' size='large'
                    onChange={this.setemail.bind(this)}
                  >
                    <Label basic>Email&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</Label>
                    <input />
                  </Input>
                </Grid.Column>
              </Grid.Row>
              <Grid.Row columns={1}>
                <Grid.Column width={10}>
                  <Input id="password" labelPosition='left' fluid
                    type='password' placeholder='' size='large'
                    onChange={this.setpassword.bind(this)}
                  >
                    <Label basic>Password</Label>
                    <input />
                  </Input>
                </Grid.Column>          
              </Grid.Row>
              <Grid.Row columns={2}>
                <Grid.Column width={3}>
                  <Button className='action'
                    onClick={this.login.bind(this)}
                  >
                    <Icon name='caret square right' />&nbsp;&nbsp;&nbsp;&nbsp;LOG IN
                  </Button>
                </Grid.Column>
                <Grid.Column width={7} textAlign='left'>
                  {
                    this.state.loginmsg !== '' &&
                    <Message negative size='small' compact
                      style={{paddingTop:'0.65em',paddingBottom:'0.65em'}}
                    >
                      <Message.Content>
                        {this.state.loginmsg}
                      </Message.Content>
                    </Message>
                  }
                </Grid.Column>          
              </Grid.Row>
            </Grid>
        </div>

      </div>
    )
  }
}
export default Login;
