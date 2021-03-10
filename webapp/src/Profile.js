import React from 'react';
import axios from 'axios';
import { isMobile } from 'react-device-detect';
import { getToken, removeUserSession } from './utils/common';

import { Popup, Item, Message, Button, Dropdown, Input, Segment, Image, Grid, Icon } from 'semantic-ui-react';
import _ from 'lodash';
import validator from 'validator';

class Profile extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      apihost: 'http://bskild.xyz/v1',
      //apihost: 'http://127.0.0.1:8888/v1',      
      token: getToken(),
      userid: '',
      email: '',
      firstname: '',
      lastname: '',
      countrycode: '',
      countryname: '',
      statename: '',
      countries: [],
      states: [],
      isfirstnamevalid: true,
      islastnamevalid: true,
      userinfoupdatemsg: '',
      userinfoupdateok: true,
      userprofile: [],
      usercareer: {},
      savepopupmsgs: {}
    };
  }

  logout(){
    removeUserSession();
    this.props.history.push('/home');
  }

  async validateusertoken(){
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
      this.setState({userid: response.data['users'][0]['userid']})
      this.setState({email: response.data['users'][0]['email']})
      this.setState({firstname: response.data['users'][0]['firstname']})
      this.setState({lastname: response.data['users'][0]['lastname']})
      await this.setState({countryname: response.data['users'][0]['countryname']})
      await this.setState({countrycode: response.data['users'][0]['countrycode']})
      await this.filterstatesdata(this.state.countrycode);
      await this.setState({statename: response.data['users'][0]['statename']})
      await this.setState({userprofile: response.data['users'][0]['occupations']})
      
      let occupations = [];
      let occupationexisted = [];
      await _.each(this.state.userprofile, (item, i) => {
        const occid = item.occupationid;        
        let careerinstance = {};
        careerinstance['instanceid'] = item.instanceid;
        careerinstance['company'] = item.company;
        careerinstance['datefrom'] = item.datefrom;
        careerinstance['dateto'] = item.dateto;

        if(occupationexisted.includes(occid)){
          let obj = occupations.find(o => o.id === occid);
          obj['instances'].push(careerinstance);
          occupations = occupations.filter(function( obj ) {
            return obj.id !== occid;
          });
          occupations.push(obj);
        }
        else{
          let occupation = {}
          occupation['id'] = occid;
          occupation['name'] = item.name;
          occupation['instances'] = [careerinstance];
          occupations.push(occupation);

          occupationexisted.push(occid);
          let savemsgs = this.state.savepopupmsgs;
          savemsgs[occid] = 'Save your changes';
          this.setState({savepopupmsgs: savemsgs});
        }
        
      });
      console.log(occupations);
      this.setState({usercareer: occupations});
    }
    catch(err){
      if(err.response){
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

  async handledatechange(datetype,occupationid,instanceid){
    const datefromfieldid = datetype + '-' + occupationid + '-' + instanceid;
    let datefrom = document.getElementById(datefromfieldid).value;
    console.log(datefrom);

    if(/^[\d]{0,4}(?:-\d{0,2}){0,2}$/.test(datefrom)){
      let careerobj = this.state.usercareer;

      if(/^\d{4}-\d{2}$/.test(datefrom)){
        datefrom = datefrom + '-01';
      }
      else if(/^\d{4}-\d{2}-$/.test(datefrom)){
        datefrom = datefrom + '01';
      }
      else if(/^\d{4}-\d{2}-0$/.test(datefrom)){
        datefrom = datefrom + '1';
      }

      careerobj[occupationid]['instances'][instanceid][datetype] = datefrom;
      await this.setState({usercareer: careerobj});
      console.log(this.state.usercareer);
      console.log("isdate");
    }
  }
  
  async updatecareerdata(occupationid){
    const occupationtoupdate = this.state.usercareer.filter(function( obj ) {
      return obj.id === occupationid;
    });
    
    try{
      const requeststr = this.state.apihost + '/users/career/' + occupationid
      const response = await axios.put(requeststr,
        occupationtoupdate, 
        {
          headers: {
            'crossDomain': true,
            "content-type": "application/json",
            "access-token": this.state.token
          }
        }
      );
      console.log('update user career [' + response.data['message'] + ']');
      console.log('savepopup-' + occupationid);
      let savemsgs = this.state.savepopupmsgs;
      savemsgs[occupationid] = 'Changes was saved';
      this.setState({savepopupmsgs: savemsgs});
    }
    catch(err){
      console.log('update user career [' + err + ']');     
      let savemsgs = this.state.savepopupmsgs;
      savemsgs[occupationid] = 'Unable to save changes';
      this.setState({savepopupmsgs: savemsgs});
    }  
  }

  async deletecareerrow(occupationid,instanceid){
    try{
      const requeststr = this.state.apihost + '/users/career/' + occupationid + '/' + instanceid
      const response = await axios.delete(requeststr,
        {
          headers: {
            'crossDomain': true,
            "content-type": "application/json",
            "access-token": this.state.token
          }
        }
      );
      console.log('delete user career instance [' + response.data['message'] + ']');
    }
    catch(err){
      console.log('delete user career instance [' + err + ']');     
     }  
  }

  async handlecompanychange(occupationid,instanceid){
    const companyfieldid = 'company-' + occupationid + '-' + instanceid;
    const companyname = document.getElementById(companyfieldid).value;
    let careerobj = this.state.usercareer;
    careerobj[occupationid]['instances'][instanceid]['company'] = companyname;
    await this.setState({usercareer: careerobj});
    console.log(this.state.usercareer);
  }

  renderusercareer(){
    let usercareerpanel = [];

    _.each(this.state.usercareer, (item, i) => {
      usercareerpanel.push(
          <Item key={item.id}>
            <Item.Content>
              <Item.Header>
                <span className='actionlink'>
                  <a href={'/home?q=' + item.id + '&m=o'}>
                  {item.name}
                  </a>
                </span>
                { ' ' }
                <Popup className='popup' inverted flowing hoverable
                  trigger={
                    <Icon name='save' size='small' link
                      color='green'
                      onClick={this.updatecareerdata.bind(this,item.id)}
                    />
                  }
                >{this.state.savepopupmsgs[item.id]}
                </Popup>

              </Item.Header>
              <Item.Extra>
                {
                  item.instances.map((instance, j) =>
                    <div>
                      <Input size='mini' style={{width:'8em'}}
                        iconPosition='left'
                        icon='at' placeholder='Company'
                        onChange={this.handlecompanychange.bind(this,i,j)}
                        id={'company-' + i + '-' + j} value={!instance.company ? '' : instance.company}
                       />
                      <Input size='mini' style={{width:'7.5em'}} placeholder='yyyy-mm'
                        onChange={this.handledatechange.bind(this,'datefrom',i,j)}
                        id={'datefrom-' + i + '-' + j}
                        value={!instance.datefrom ? '' : instance.datefrom}
                      />
                      <Input size='mini' style={{width:'7.5em'}} placeholder='yyyy-mm'
                        onChange={this.handledatechange.bind(this,'dateto',i,j)}
                        id={'dateto-' + i + '-' + j}
                        value={!instance.dateto ? '' : instance.dateto}
                      />
                      { ' '}
                      <Popup className='popup' inverted flowing hoverable
                        trigger={
                          <Icon name='delete' size='small' link
                            inverted
                            color='green'
                            onClick={this.deletecareerrow.bind(this,item.id,instance.instanceid)}
                          />
                        }
                      >{this.state.savepopupmsgs[item.id]}
                      </Popup>
                    </div>
                  )
                }
              </Item.Extra>
            </Item.Content>
          </Item>
        )
    });

    return (
      <Item.Group divided>
      {usercareerpanel}
      </Item.Group>
    );
  }

  async filterstatesdata(countrycode){
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
      this.setState({countryname: selectedcountry});
      this.setState({countrycode: selectedcountrycode});
      this.filterstatesdata(selectedcountrycode);
    }
    else if(field === 'state'){
      const selectedstate = data.value;
      console.log(selectedstate);
      this.setState({statename: selectedstate});
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

  updatename(event,data){
    const value = data.value;
    if(data.name === 'firstname'){
      this.setState({firstname: value});
      if(!validator.isAlpha(value) || value === ''){
        this.setState({isfirstnamevalid: false});
      }
      else{
        this.setState({isfirstnamevalid: true});        
      }
    }
    else if(data.name === 'lastname'){
      this.setState({lastname: value});
      if(!validator.isAlpha(value) || value === ''){
        this.setState({islastnamevalid: false});
      }
      else{
        this.setState({islastnamevalid: true});        
      }
    }
  }

  async updateuserinfo(event){
    if(this.state.isfirstnamevalid && this.state.islastnamevalid){
      console.log('VALID');

      try{
        const requeststr = this.state.apihost + '/users'
        const response = await axios.put(requeststr,
          {
            firstname:this.state.firstname,
            lastname:this.state.lastname,
            countrycode:this.state.countrycode,
            statename:this.state.statename
          }, 
          {
            headers: {
              'crossDomain': true,
              "content-type": "application/json",
              "access-token": this.state.token
            }
          }
        );
        console.log('update user info [' + response.data['message'] + ']');
        this.setState({userinfoupdateok: true});
        this.setState({userinfoupdatemsg: 'Update successful'});
      }
      catch(err){
        console.log('update user info [' + err + ']');     
        this.setState({userinfoupdateok: false});
        this.setState({userinfoupdatemsg: 'Update error'});
      }  
    }
    else{
      console.log('INVALID');
      this.setState({userinfoupdateok: false});
      this.setState({userinfoupdatemsg: 'Incomplete information'});
    }
  }

  async componentDidMount() {
    await this.loadlocationdata();
    await this.validateusertoken();
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
                {this.renderusercareer()}
                </Segment>
              </Grid.Column>
              <Grid.Column>
                <Segment raised>
                  <Grid columns='equal' doubling stackable>
                    <Grid.Row columns={3}>
                      <Grid.Column width={4} verticalAlign='middle'>
                        <b>Full name</b>
                      </Grid.Column>
                      <Grid.Column width={6}>
                        <Input fluid placeholder='First name'
                          name='firstname'
                          value={this.state.firstname}
                          onChange={this.updatename.bind(this)}
                          error={!this.state.isfirstnamevalid}
                        />
                      </Grid.Column>
                      <Grid.Column width={6}>
                        <Input fluid placeholder='Last name'
                          name='lastname'
                          value={this.state.lastname} 
                          onChange={this.updatename.bind(this)}
                          error={!this.state.islastnamevalid}
                        />
                      </Grid.Column>
                    </Grid.Row>
                    <Grid.Row columns={2}>
                      <Grid.Column width={4} verticalAlign='middle'>
                        <b>Email</b>
                      </Grid.Column>
                      <Grid.Column width={12}>
                        <Input fluid disabled
                          name='email'
                          value={this.state.email} 
                        />
                      </Grid.Column>
                    </Grid.Row>
                    <Grid.Row columns={2}>
                      <Grid.Column width={4} verticalAlign='middle'>
                        <b>Location</b>
                      </Grid.Column>
                      <Grid.Column width={6}>
                        <Dropdown fluid
                          placeholder='Country'
                          name='country' 
                          search selection 
                          value={this.state.countryname}
                          options={this.state.countries}
                          onChange={this.selectgeo.bind(this)}
                          noResultsMessage='Nothing found'
                          selectOnBlur={false}
                        />
                      </Grid.Column>
                      <Grid.Column width={6}>
                        <Dropdown fluid
                          placeholder='State'
                          name='state' 
                          search selection 
                          value={this.state.statename}
                          options={this.state.states}
                          onChange={this.selectgeo.bind(this)}
                          noResultsMessage='Select country'
                          selectOnBlur={false}
                        />
                      </Grid.Column>
                    </Grid.Row>
                    <Grid.Row columns={2}>
                      <Grid.Column width={6}>
                        <Button className='action'
                          onClick={this.updateuserinfo.bind(this)}
                        >
                          <Icon name='save' />UPDATE
                        </Button>
                      </Grid.Column>
                      <Grid.Column width={10} textAlign='left'>
                      {
                        this.state.userinfoupdatemsg !== '' &&
                        <Message size='small' compact
                          negative={!this.state.userinfoupdateok}
                          positive={this.state.userinfoupdateok}
                          style={{paddingTop:'0.7em',paddingBottom:'0.7em'}}
                        >
                          <Message.Content>
                            {this.state.userinfoupdatemsg}
                          </Message.Content>
                        </Message>
                      }
                      </Grid.Column>
                    </Grid.Row>
                  </Grid>
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
