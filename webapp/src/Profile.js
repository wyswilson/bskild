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
      countrycode: '',
      citycode: '',
      countries: [],
      states: []
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

  async updatestatesdata(countrycode){
    try{
      const requeststr = this.state.apihost + '/gazetteer/states/' + countrycode
      const response = await axios.get(requeststr);
      console.log('get states [' + response.data['message'] + ']');
      const rawstates = response.data['states'];
      const states = rawstates.map((item) => (
        {
          key: item.id,
          text: item.name,
          value: item.name
        }
      ));

      this.setState({states: states});
    }
    catch(err){
      console.log('get states [' + err + ']');     
    }  
  }

  selectgeo(event,data){
    const field = data.name;
    if(field === 'country'){
      const selectedcountry = data.value;
      let selectedarr = this.state.countries.filter(suggest => suggest.value.includes(selectedcountry))[0];
      const selectedcountrycode = selectedarr.key
      this.setState({countrycode: selectedcountrycode});
      this.updatestatesdata(selectedcountrycode);
    }
    else if(field === 'state'){
      const selectedstate = data.value;
      console.log(selectedstate);
    }
  }

  async loadlocationdata(){
    try{
      const requeststr = this.state.apihost + '/gazetteer/countries'
      const response = await axios.get(requeststr);
      console.log('get countries [' + response.data['message'] + ']');
      const rawcountries = response.data['countries'];
      const countries = rawcountries.map((item) => (
        {
          key: item.id,
          text: item.name,
          value: item.name
        }
      ));

      this.setState({countries: countries});
    }
    catch(err){
      console.log('get countries [' + err + ']');     
    }  
  }

  async preloadData(){
    await this.validateusertoken();
    await this.loadlocationdata();

  }

  componentDidMount() {
    this.preloadData();
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
                    <Grid.Row columns={3}>
                      <Grid.Column width={4} verticalAlign='middle'>
                        <b>Full name</b>
                      </Grid.Column>
                      <Grid.Column>
                        <Input transparent fluid
                          value={this.state.firstname}
                        />
                      </Grid.Column>
                      <Grid.Column>
                        <Input transparent fluid
                          value={this.state.lastname} 
                        />
                      </Grid.Column>
                    </Grid.Row>
                    <Grid.Row columns={2}>
                      <Grid.Column width={4} verticalAlign='middle'>
                        <b>Email</b>
                      </Grid.Column>
                      <Grid.Column>
                        <Input transparent fluid
                          value={this.state.email} 
                        />
                      </Grid.Column>
                    </Grid.Row>
                    <Grid.Row columns={2}>
                      <Grid.Column width={4} verticalAlign='middle'>
                        <b>Location</b>
                      </Grid.Column>
                      <Grid.Column>
                        <Dropdown fluid
                          placeholder='Country'
                          name='country' 
                          search selection 
                          options={this.state.countries}
                          onChange={this.selectgeo.bind(this)}
                          noResultsMessage='Nothing found'
                        />
                        <Dropdown fluid
                          placeholder='State'
                          name='state' 
                          search selection 
                          options={this.state.states}
                          onChange={this.selectgeo.bind(this)}
                          noResultsMessage='Select country'
                        />
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
