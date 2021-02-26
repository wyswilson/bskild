import React from 'react';
import axios from 'axios';
import { isMobile } from 'react-device-detect';
import { getToken, removeUserSession } from './utils/common';

import { Dropdown, Input, Segment, Image, Grid, Icon } from 'semantic-ui-react'

class Profile extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      apihost: 'http://bskild.xyz/v1',
      token: getToken(),
      email: '',
      firstname: '',
      lastname: '',
      countries: [],
      citiesforselectedcountry: []
    };
  }

  logout(){
    removeUserSession();
    this.props.history.push('/home');
  }

  async validateusertoken(){
    try{
      const requeststr = this.state.apihost + '/users/' + this.state.token
      const response = await axios.get(requeststr);
      console.log('validate user [' + response.data['message'] + ']');
      this.setState({email: response.data['users'][0]['email']})
      this.setState({firstname: response.data['users'][0]['firstname']})
      this.setState({lastname: response.data['users'][0]['lastname']})
    }
    catch(err){
      console.log('validate user [' + err + ']');     
    }  
  }

  async loadlocationdata(){
    try{
      const requeststr = this.state.apihost + '/gazetteer/countries'
      const response = await axios.get(requeststr);
      console.log('get countries [' + response.data['message'] + ']');
      this.setState({countries: response.data['countries']});
    }
    catch(err){
      console.log('validate user [' + err + ']');     
    }  
  }

  componentDidMount() {
    this.validateusertoken();
    this.loadlocationdata();
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
                <span className="menulink">
                  <a href="/home" onClick={this.logout.bind(this)}>
                    LOGOUT
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
          <Grid columns='equal' doubling stackable>
            <Grid.Row columns={2}>
              <Grid.Column>
                <Segment raised>
                Pellentesque habitant morbi tristique senectus
                </Segment>
              </Grid.Column>
              <Grid.Column>
                <Segment raised>
                  <Grid columns='equal' doubling stackable>
                    <Grid.Row columns={2}>
                      <Grid.Column width={4}>
                        Name
                      </Grid.Column>
                      <Grid.Column>
                        <Input transparent
                          value={this.state.firstname}
                        />
                        <Input transparent
                          value={this.state.lastname} 
                        />
                      </Grid.Column>
                    </Grid.Row>
                    <Grid.Row columns={2}>
                      <Grid.Column width={4}>
                        Email
                      </Grid.Column>
                      <Grid.Column>
                        <Input transparent
                          value={this.state.email} 
                        />
                      </Grid.Column>
                    </Grid.Row>
                    <Grid.Row columns={2}>
                      <Grid.Column width={4}>
                        Location
                      </Grid.Column>
                      <Grid.Column>
                        <Dropdown 
                        placeholder='State' 
                        search selection 
                        options={this.state.countries} />

                      </Grid.Column>
                    </Grid.Row>
                  </Grid>
                </Segment>
              </Grid.Column>
            </Grid.Row>
            <Grid.Row columns={2}>
              <Grid.Column>
                <Segment raised>
                Pellentesque habitant morbi tristique senectus
                </Segment>
              </Grid.Column>
              <Grid.Column>
                <Segment raised>
                Pellentesque habitant morbi tristique senectus
                </Segment>
              </Grid.Column>
            </Grid.Row>
          </Grid>
        </div>
      </div>
    )
  }
}
export default Profile;
