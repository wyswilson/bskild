import React from 'react';
import axios from 'axios';
import { isMobile } from 'react-device-detect';
import { getToken, setUserSession } from './utils/common';

import { Button, Icon, Label, Image, Grid, Input } from 'semantic-ui-react'

class Login extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      rootendpoint: 'http://127.0.0.1:8888/v1',
      token: getToken(),
      email: '',
      password: ''
    };
  }


  componentDidMount() {
    
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
    var requeststr = this.state.rootendpoint + '/users/login'
    try{
      const response = await axios.post(requeststr, {},
        {
         auth: {
          username: this.state.email,
          password: this.state.password
        }
      });
      console.log('login [' + response.data['message'] + ']');
      setUserSession(response.headers['access-token'],response.headers['name']);
        this.props.history.push({
          pathname: '/profile',
          state: { sessionid: 'xxxxxxxxxx' }
        });
    }
    catch(err){
      console.log('login error [' + err + ']');     
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
              <Grid.Column width={8} verticalAlign='middle' textAlign='left'
                style={{ paddingTop: '0.6em'}}
              >
                <span style={{ paddingLeft: '0.2em'}}></span>
                <Image as='a' spaced='left' inline
                href='./' size='tiny' src='./logo_small.png'/>
                <span className="menulink">
                  <a href="/home" >
                    <Icon name='caret square left'/>BACK HOME
                  </a>
                </span>
                
              </Grid.Column>
              <Grid.Column verticalAlign='middle'>
                
              </Grid.Column>
            </Grid.Row>
          </Grid>
        </div>

        <div
          className={isMobile ? "bodymain mobile" : "bodymain"} 
        > 
            <Grid doubling stackable>
              <Grid.Row columns={1} divided>
                <Grid.Column>
                  <Input id="email" labelPosition='right' 
                    type='text' placeholder='' size='large'
                    onChange={this.setemail.bind(this)}
                  >
                    <Label basic>Email&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</Label>
                    <input />
                  </Input>
                </Grid.Column>
              </Grid.Row>
              <Grid.Row columns={1} divided>
                <Grid.Column>
                  <Input id="password" labelPosition='right' 
                    type='password' placeholder='' size='large'
                    onChange={this.setpassword.bind(this)}
                  >
                    <Label basic>Password</Label>
                    <input />
                  </Input>
                </Grid.Column>          
              </Grid.Row>
              <Grid.Row columns={1} divided>
                <Grid.Column>
                  <Button className='action'
                    onClick={this.login.bind(this)}
                  >
                    <Icon name='caret square right' />&nbsp;&nbsp;&nbsp;&nbsp;LOG IN
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