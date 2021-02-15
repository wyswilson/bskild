import React from 'react';
import axios from 'axios';
import { Image, Input, Modal, Checkbox, Table, Popup, List, Button, Label, Icon, Dropdown, Header, Grid, Card } from 'semantic-ui-react'
import _ from 'lodash'
import {isMobile} from 'react-device-detect';
import scrollToComponent from 'react-scroll-to-component';

class App extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      searchendpoint: 'http://bskild.xyz/v1',
      searchquery: '',
      selectedid: '',
      selectedtype: '',
      selectedvalue: '',
      dropdownoptions: [],
      rawresponse:[],
      serp:'',
      activeaccordion: 1,
      selectedoccupationskills: [],
      selectedskilloccupations: [],
      selectedoccupationrelated: [],
      helpwithskill1: '',
      helpwithskill2: '',
      helpwithskill3: '',
      helpwithskills: [],
      helpwithoccupation: '',
      focusdropdown: false,
      inquireroleopen: false,
      inquirecustommessage: '',
      formforwardloading: false,
      confirmformforwarded:false
    };
  }

  scrollto(event){
    this.setState({focusdropdown: true});
    scrollToComponent(this.trynowpanel);
  }

  async searchskills(query,mode){
    let suggestions = [];

    var skillrequeststr = this.state.searchendpoint + '/skills/' + query + '?' + mode
    console.log('search skills [' + skillrequeststr + ']');
    try{
      const response = await axios.get(skillrequeststr);
      console.log('search skills [' + response.data['message'] + ']');
      suggestions = response.data['skills'];
    }
    catch(err){
      console.log('search skills [' + err + ']');     
    }
    return suggestions;
  }

  async searchoccupations(query,mode){
    let suggestions = [];

    var occupationrequeststr = this.state.searchendpoint + '/occupations/' + query + '?' + mode
    console.log('search occupations [' + occupationrequeststr + ']');
    try{
      const response = await axios.get(occupationrequeststr);
      console.log('search occupations [' + response.data['message'] + ']');
      suggestions = response.data['occupations'];
    }
    catch(err){
      console.log('search occupations [' + err + ']');     
    }
    return suggestions;
  }

  async searchboth(query){
    const options1 = await this.searchoccupations(query,'lite');
    await this.updatesuggestions(options1,'occupations');
    const options2 = await this.searchskills(query,'lite');
    await this.updatesuggestions(options2,'skills');
    await this.refreshresults('lite');
  }

  searchkeywords(event, data){
    this.setState({focusdropdown: false});

    this.resetsuggestions();
    const keywords = data.searchQuery;
    console.log("search keywords [" + keywords + "]");
    this.setState({searchquery: keywords});
    if(keywords.length > 3){
      this.searchboth(keywords);
    }
  }

  updatesuggestions(suggestions,type){
    const updatedsuggestions = _.map(suggestions, (item) => (
      {
        key: item.id,
        text: item.name,
        value: item.name,
        desc: item.desc,
        alts: item.alternatives ? item.alternatives : [],
        content: (
          <Header size='small' icon={type === 'occupations' ? 'user outline'  : 'list'} content={item.name} subheader={item.desc.split(" ").splice(0,20).join(" ") + '...'} />
        ),
        type: type
      }
    ));
    this.setState({rawresponse: this.state.rawresponse.concat(suggestions)});
    this.setState({dropdownoptions: this.state.dropdownoptions.concat(updatedsuggestions)});
  }

  resetsuggestions(){
    this.setState({rawresponse: []});
    this.setState({dropdownoptions: []});
    this.setState({serp: ''});
    this.setState({helpwithskill1: ''});
    this.setState({helpwithskill2: ''});
    this.setState({helpwithskill3: ''});
    this.setState({helpwithskills: []});
    this.setState({helpwithoccupation: ''});
    this.setState({inquireroleopen: false});
  }

  async selectsuggestion(event, data){
    const fieldname = data.name;
    if(fieldname === 'keywords'){
      const keywords = data.value;
      this.setState({searchquery: keywords});
      const suggestions = this.state.dropdownoptions;

      let selectedarr = suggestions.filter(suggest => suggest.value.includes(keywords))[0];
      const selectedid = selectedarr.key;
      const selectedtype = selectedarr.type;
      const selectedvalue = selectedarr.value;
      console.log("selected [" + selectedtype + "][" + selectedid + "][" + selectedvalue + "]");

      this.suggestionselected(selectedtype,selectedid,selectedvalue);
    }
  }

  async suggestionselected(type,id,value){
    this.setState({selectedid: id});
    this.setState({selectedtype: type});
    this.setState({selectedvalue: value});
    this.setState({searchquery: value});

    if(type === 'skills'){
      const options = await this.searchskills(id,'full');
      await this.resetsuggestions();
      await this.updatesuggestions(options,'skills');
      await this.lookupoccupationsforskill(id);
      await this.refreshresults('full');

    }
    else if(type === 'occupations'){
      const options = await this.searchoccupations(id,'full');
      await this.resetsuggestions();
      await this.updatesuggestions(options,'occupations');
      await this.lookupskillsforoccupation(id);
      await this.lookuprelatedoccupations(id);
      await this.refreshresults('full');
    }
  }

  async lookupoccupationsforskill(id){
    var requeststr = this.state.searchendpoint + '/skills/' + id + '/occupations'
    console.log('search skill occupations [' + requeststr + ']');
    try{
      const response = await axios.get(requeststr);
      console.log('search skill occupations [' + response.data['message'] + ']');
      const occupations = response.data['skills'][0]['occupations'];
      this.setState({selectedskilloccupations: occupations});
    }
    catch(err){
      console.log('search skill occupations [' + err + ']');     
    }
  }

  async lookupskillsforoccupation(id){
    var requeststr = this.state.searchendpoint + '/occupations/' + id + '/skills'
    console.log('search occupation skills [' + requeststr + ']');
    try{
      const response = await axios.get(requeststr);
      console.log('search occupation skills [' + response.data['message'] + ']');
      const skills = response.data['occupations'][0]['skills'];
      this.setState({selectedoccupationskills: skills});
    }
    catch(err){
      console.log('search occupation skills [' + err + ']');     
    }
  }

  async lookuprelatedoccupations(id){
    var requeststr = this.state.searchendpoint + '/occupations/' + id + '/related'
    console.log('search related occupations [' + requeststr + ']');
    try{
      const response = await axios.get(requeststr);
      console.log('search related occupations [' + response.data['message'] + ']');
      const occupations = response.data['occupations'];
      this.setState({selectedoccupationrelated: occupations});
    }
    catch(err){
      console.log('search related occupations [' + err + ']');     
    }
  }

  async setskillsneedhelp(selectedskillid){

    if( this.state.helpwithskill1 === selectedskillid){
      await this.setState({helpwithskill1: ''});  
      document.getElementById('check_' + selectedskillid).checked = false;
    }
    else if( this.state.helpwithskill2 === selectedskillid){
      await this.setState({helpwithskill2: ''});  
      document.getElementById('check_' + selectedskillid).checked = false;
    }
    else if( this.state.helpwithskill3 === selectedskillid){
      await this.setState({helpwithskill3: ''});  
      document.getElementById('check_' + selectedskillid).checked = false;
    }
    else{
      if(this.state.helpwithskill1 === ''){
        await this.setState({helpwithskill1: selectedskillid});  
        document.getElementById('check_' + selectedskillid).checked = true;
      }
      else if(this.state.helpwithskill2 === ''){
        await this.setState({helpwithskill2: selectedskillid});  
        document.getElementById('check_' + selectedskillid).checked = true;
      }
      else if(this.state.helpwithskill3 === ''){
        await this.setState({helpwithskill3: selectedskillid});  
        document.getElementById('check_' + selectedskillid).checked = true;
      }
      else{
        document.getElementById('check_' + selectedskillid).checked = false;
      }
    }

    await this.setState({helpwithskills: []});
    await this.setState({
      helpwithskills: this.state.helpwithskills.concat(this.state.helpwithskill1,this.state.helpwithskill2,this.state.helpwithskill3)
    });

    if(this.state.helpwithskill1 !== '' &&
      this.state.helpwithskill2 !== '' &&
      this.state.helpwithskill3 !== ''
    ){
      await this.inquirehelpmodalskills(true,this.state.selectedid,this.state.selectedvalue);
    }
    
    console.log("selected skills");
    console.log(this.state.helpwithskills);
  }

  async inquirehelpmodalskills(state,occupationid,name){
    await this.setState({helpwithoccupation: occupationid});

    const custommessage = 'I need help with upskilling for ' + name;

    this.inquirehelpmodal(custommessage,state);
  }

  async inquirehelpmodaloccupation(state,occupationid,name){
    if(this.state.helpwithskill1 !== ''){
      document.getElementById('check_' + this.state.helpwithskill1).checked = false;
    }
    if(this.state.helpwithskill2 !== ''){
      document.getElementById('check_' + this.state.helpwithskill2).checked = false;
    }
    if(this.state.helpwithskill3 !== ''){
      document.getElementById('check_' + this.state.helpwithskill3).checked = false;
    }

    await this.setState({helpwithoccupation: occupationid});
    await this.setState({helpwithskill1: ''});
    await this.setState({helpwithskill2: ''});
    await this.setState({helpwithskill3: ''});
    await this.setState({helpwithskills: []});   

    const custommessage = 'I need help with progression from ' + this.state.selectedvalue + ' to ' + name;
    this.inquirehelpmodal(custommessage,state);
  }

  async inquirehelpmodal(message,state){
    await this.setState({inquirecustommessage: message});
    await this.setState({inquireroleopen: state});
    console.log(this.state.helpwithoccupation);
  }

  async inquiryforwardedmodal(state){
    await this.setState({inquirecustommessage: ''});
    await this.setState({confirmformforwarded: state});
  }

  forwardinquiry(){
    this.setState({formforwardloading: true});
    const fname = document.getElementById('inquirynamefirst').value;
    const lname = document.getElementById('inquirynamelast').value;
    const email = document.getElementById('inquiryemail').value;
    const company = document.getElementById('inquirycomp').value;

    console.log("forward inquiry");
    this.setState({formforwardloading: false});
    this.setState({inquireroleopen: false});
    this.setState({confirmformforwarded: true});

    this.submitinquiry(fname,lname,email,company,this.state.helpwithoccupation,this.state.helpwithskills);

    const custommessage = 'Thank you. We\'ll reach out to you within 6 hours.';
    this.setState({inquirecustommessage: custommessage});
  }

  async submitinquiry(fname,lname,email,company,occupation,skills){

    try{
      const response = await axios.post(this.state.searchendpoint + '/inquiries', 
        {
          fname:fname,
          lname:lname,
          email:email,
          company:company,
          occupation:occupation,
          skills:skills
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
  
  requestdemo(){
    const custommessage = 'I need help with general upskilling or progression';
    this.inquirehelpmodal(custommessage,true);
  }

  renderextracontent(mode,type,id,value){
    let render = ''; 
    if(mode === 'full' && type === 'occupations'){
      let renderskills = this.state.selectedoccupationskills.map((skillitem) => (
            <Table.Row key={'row' + skillitem.id}>
              <Table.Cell key={'row.cell1' + skillitem.id} selectable onClick={this.suggestionselected.bind(this,'skills',skillitem.id,skillitem.name)}>
                <a href='/#'><Popup content={skillitem.optionality + ' skill'}
                  trigger={<Icon name='list' color={skillitem.optionality !== 'optional' ? 'red'  : 'green'}/>}
                />
                {skillitem.name}</a>
              </Table.Cell>
              <Table.Cell key={'row.cell2' + skillitem.id}>
                {skillitem.reusability} {skillitem.type}
              </Table.Cell>
              <Table.Cell key={'row.cell3' + skillitem.id}>
                <Checkbox toggle id={'check_' + skillitem.id}
                  key={'check_' + skillitem.id}
                  onChange={this.setskillsneedhelp.bind(this,skillitem.id)}
                  checked={false}
                />
              </Table.Cell>
            </Table.Row>     
        ));

      let renderroles = this.state.selectedoccupationrelated.map((occupationitem) => (
            <Table.Row key={'row' + occupationitem.id}>
              <Table.Cell key={'row.cell1' + occupationitem.id} selectable onClick={this.suggestionselected.bind(this,'occupations',occupationitem.id,occupationitem.name)}>
                <a href='/#'><Icon name='user outline'/>{occupationitem.name}</a>
              </Table.Cell>
              <Table.Cell key={'row.cell2' + occupationitem.id}>
                <Button icon='bell' content='INQUIRE NOW'
                  className='action'
                  onClick={this.inquirehelpmodaloccupation.bind(this,true,occupationitem.id,occupationitem.name)}
                />
              </Table.Cell>
            </Table.Row>          
      ));

      render = (
      <div>
        <Table celled striped compact>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell colSpan='1'><Header as='h4'>Related roles:</Header></Table.HeaderCell>
              <Table.HeaderCell colSpan='1' color='red' width={6}>
                <Header as='h4'>Need help with progression to this role?</Header>
              </Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {renderroles}
          </Table.Body>         
        </Table>
        <Table celled striped compact>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell colSpan='2'><Header as='h4'>Skills and knowledge to perform in this role:</Header></Table.HeaderCell>
              <Table.HeaderCell colSpan='1' color='red' width={6}>
                <Header as='h4'>Need help with training for this skill?
                <br/>(select any 3)
                </Header>
              </Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {renderskills}
          </Table.Body>         
        </Table>
      </div>
      );
            
    }
    else if(mode === 'full' && type === 'skills'){
      let renderroles = this.state.selectedskilloccupations.map((occupationitem) => (
            <Table.Row key={'row' + occupationitem.id}>
              <Table.Cell key={'row.cell1' + occupationitem.id} selectable onClick={this.suggestionselected.bind(this,'occupations',occupationitem.id,occupationitem.name)}>
                <a href='/#'><Icon name='user outline'/>{occupationitem.name}</a>
              </Table.Cell>
              <Table.Cell key={'row.cell2' + occupationitem.id}>
                {occupationitem.optionality}
              </Table.Cell>
            </Table.Row> 
             ));

      render = (
        <Table celled striped compact>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell colSpan='2'><Header as='h4'>Roles that require this skill or knowledge:</Header></Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {renderroles}
          </Table.Body>    
        </Table>
      );
    }
    else{
      render = (
          ''
        );
    }
    return render;
  }

  refreshresults(mode){
    console.log("refreshing results");
    let serprefreshed = [];
    console.log(this.state.dropdownoptions);
    this.state.dropdownoptions.forEach(function(item) {
      serprefreshed.push(
             <Card key={item.key} raised
              fluid={mode !== 'lite' ? true : false}
             >
              <Card.Content>
                <Label corner='right'>
                  <Icon
                    name={item.type === 'occupations' ? 'user outline'  : 'list'}
                  />
                </Label>
                <Card.Header as='a' onClick={this.suggestionselected.bind(this,item.type,item.key,item.value)}>{item.value}</Card.Header>
                <Card.Meta>
                  {item.type === 'occupations' ? 'role'  : 'skill'}
                </Card.Meta>
              </Card.Content>
              <Card.Content style = {mode !== 'lite' ? { paddingLeft: 0, paddingRight: 0 } : {}}>
              {
                mode !== 'lite' && 
                <Table celled striped>
                  <Table.Header>
                    <Table.Row key='descriptionheader'>
                      <Table.HeaderCell>
                        <Header as='h4'>
                          { item.type === 'occupations' ? 'Description:'  : 'Description:'}
                        </Header>
                      </Table.HeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    <Table.Row key='descriptionrow'>
                      <Table.Cell key='descriptioncell'>
                      {item.desc}
                      <br/><br/>
                      <b>Also know as:</b>{ ' ' }
                      {
                        mode !== 'lite' && item.alts[0] !== '' &&
                        
                        item.alts.map(alt => (
                          <span key={'alt_' + alt}>{alt}, </span>
                        ))
                      }
                      </Table.Cell>
                    </Table.Row>
                  </Table.Body>
                </Table>
              }
              {
                mode === 'lite' &&
                item.desc.split(" ").splice(0,20).join(" ") + '...'
              }
              { 
                this.renderextracontent(mode,item.type,item.key,item.value) 
              }
              </Card.Content>
            </Card>
        );
    },this);
    this.setState({serp: serprefreshed});
  }

  render() {
    let results = ''; 
    if(this.state.serp !== ''){
      results = (
        <div
          className={isMobile ? "bodymain mobile" : "bodymain"}
        >
          <Grid celled='internally' columns='equal' doubling stackable>
            <Grid.Column>
              <Card.Group>{this.state.serp}</Card.Group>
            </Grid.Column>
          </Grid>
        </div>
      );
    }
    else{
      results = (
      <div>
        <div
          className={isMobile ? "bodyrest2 mobile" : "bodyrest2"}
        >
          <Grid celled='internally' columns='equal' doubling stackable>
            <Grid.Row textAlign='left'>
              <Grid.Column>
                <Header as='h4' style={{ fontSize: '22px' }} className="fontdark">
                Supporting your employees' skill development and career progression is critical for retention and efficiency
                </Header>
              </Grid.Column>
              <Grid.Column verticalAlign="middle">
                <List key='problemstat' floated="left" className="fontdark" style={{ fontSize: '15px' }}>

                  <List.Item key='problemstat1'>
                    <List.Icon name='check circle' />
                    <List.Content>
                      The average cost of losing an employee is <a href='https://www.benefitnews.com/news/avoidable-turnover-costing-employers-big' target="_blank" rel="noreferrer">about 33% of their annual salary</a>.
                    </List.Content>
                  </List.Item>

                  <List.Item key='problemstat2'>
                    <List.Icon name='check circle' />
                    <List.Content>
                      Organisations who are committed to talent mobility <a href='https://hbr.org/2016/05/dont-underestimate-the-power-of-lateral-career-moves-for-professional-growth' target="_blank" rel="noreferrer">performs better financially</a>.
                    </List.Content>
                  </List.Item>

                  <List.Item key='problemstat3'>
                    <List.Icon name='check circle' />
                    <List.Content>
                      Employees who don't see a clear progression from their current roles are <a href='https://hbr.org/2017/03/why-do-employees-stay-a-clear-career-path-and-good-pay-for-starters' target="_blank" rel="noreferrer">more likely to leave</a>.
                    </List.Content>
                  </List.Item>

                </List>
              </Grid.Column>
            </Grid.Row>
          </Grid>
        </div>
        <div
          className={isMobile ? "bodyrest1 mobile" : "bodyrest1"}
        >
          <Grid celled='internally' columns='equal' doubling stackable>
            <Grid.Row textAlign='left'>
              <Grid.Column>
                <Header as='h4' style={{ fontSize: '22px' }} className="fontlight">
                  We help you uncover development and progression opportunities in your workforce and realise them in a few ways
                </Header>
              </Grid.Column>
              <Grid.Column verticalAlign="middle">
                <List key='valueprop' floated="left" className="fontlight" style={{ fontSize: '15px' }}>
                  <List.Item key='valueprop1'>
                    <List.Icon name='check circle' />
                    <List.Content>
                     Understand the skills profile of your workforce and the critical areas in terms of hard to fill roles.
                    </List.Content>
                  </List.Item>

                  <List.Item key='valueprop2'>
                    <List.Icon name='check circle' />
                    <List.Content>
                      Recommend opportunities to upskill based on the profile and follow up with options to fullfill the training needs.
                    </List.Content>
                  </List.Item>

                  <List.Item key='valueprop3'>
                    <List.Icon name='check circle' />
                    <List.Content>
                      Identify opportunities for lateral moves to put existing skills to good use and introduce new challenges to employees.
                    </List.Content>
                  </List.Item>
                </List>
              </Grid.Column>
            </Grid.Row>
          </Grid>
        </div>
        <div
          className={isMobile ? "bodyrest2 mobile" : "bodyrest2"}
        >

          <Grid celled='internally' columns='equal' doubling stackable>
            <Grid.Column>
              <Header as='h4' style={{ fontSize: '22px' }} className="fontdark">
                Interested in finding out more?
              </Header>
              <p className="fontdark" style={{ fontSize: '15px' }}>
                Do you want to improve your organisation's ability 
                in managing and retaining talent but not sure where to begin?
              </p>
            </Grid.Column>
            <Grid.Column verticalAlign="middle">
              <Grid columns={1} doubling stackable>
                <Grid.Column textAlign="left">
                  <Button 
                    className='action'
                    size='large' onClick={this.requestdemo.bind(this)}>
                    REACH OUT FOR DEMO
                  </Button> 
                  <Button
                    className='action'
                    size='large' onClick={this.scrollto.bind(this)}>
                    TRY IT OUT NOW
                  </Button>

                </Grid.Column>
              </Grid>
            </Grid.Column>
          </Grid>
        </div>
      </div>
      );

    }

    return (
      <div>
        <Modal
          basic
          onClose={this.inquirehelpmodal.bind(this,'',false)}
          open={this.state.inquireroleopen}
          size='small'
        >
          <Header textAlign='left'>
            {this.state.inquirecustommessage}
          </Header>
          <Modal.Content>
            <Grid doubling stackable>
              <Grid.Row columns={2} divided>
                <Grid.Column>
                  <Input id="inquirynamefirst" label='First name' placeholder='First name...' fluid />
                </Grid.Column>
                <Grid.Column>
                  <Input id="inquirynamelast" label='Last name' placeholder='Last name...' fluid />
                </Grid.Column>
              </Grid.Row>
              <Grid.Row columns={2} divided>
                <Grid.Column>
                  <Input id="inquiryemail" label='Email' placeholder='Email address...' fluid />
                </Grid.Column>
                <Grid.Column>
                  <Input id="inquirycomp" label='Company' placeholder='Company name' fluid />
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
              loading={this.state.formforwardloading}
            >
              <Icon name='checkmark' />SUBMIT
            </Button>
          </Modal.Actions>
        </Modal>

        <Modal
          basic 
          onClose={this.inquiryforwardedmodal.bind(this,false)}          
          open={this.state.confirmformforwarded}
          size='small'
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
          ref={(div) => { this.trynowpanel = div; }}           
        >
          <Grid columns={2} doubling stackable>
            <Grid.Column width={2}>
              <Image as='a' spaced='right'
              href='./' verticalAlign='middle' size='small'
              src='./logo_small.png'/>
            </Grid.Column>
            <Grid.Column stretched 
              className="fontlight" width={12}>
                <Dropdown name="keywords" 
                  className = { this.state.focusdropdown ? 'action' : ''}
                  style={ { width: '100%' } }
                  floating inline
                  search compact
                  selection allowAdditions
                  additionLabel='Search with '
                  minCharacters={2}
                  selectOnBlur={false}
                  searchQuery={this.state.searchquery}
                  value={this.state.searchquery}
                  options={this.state.dropdownoptions}
                  noResultsMessage = "No results found"
                  onSearchChange={this.searchkeywords.bind(this)}
                  onChange={this.selectsuggestion.bind(this)}
                  placeholder='Find role or skill'
                  onAddItem={this.searchkeywords.bind(this)}
                />
            </Grid.Column>
          </Grid>
        </div>
        {results}
        <div
          className={isMobile ? "navfooter mobile" : "navfooter"}
        >
          <List key='footer' horizontal verticalAlign="middle">
            <List.Item className="footheader" style={{ fontSize: '15px' }}>
              Copyright © 2021 bSkild. All Rights Reserved.
            </List.Item>
            <List.Item className="footheader">

            </List.Item>
          </List>
        </div>
      </div>
    )
  }
}
export default App;
