import React from 'react';
import axios from 'axios';
import { Message, Loader, Image, Input, Modal, Table, Popup, List, Button, Label, Icon, Dropdown, Header, Grid, Card } from 'semantic-ui-react'
import _ from 'lodash'
import {isMobile} from 'react-device-detect';
import scrollToComponent from 'react-scroll-to-component';
import queryString from 'query-string'
import validator from 'validator'

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
      selectedoccupationskills: [],
      selectedskilloccupations: [],
      selectedoccupationrelated: [],
      helpwithskill: '',
      helpwithoccupation: '',
      inquireroleopen: false,
      inquirecustommessage: '',
      confirmformforwarded:false,
      occupationsindemand: '',
      mainpageloading: false,
      isemailvalid: true,
      isnamevalid: true
    };
  }

  scrollto(panel){
    if(this.state.serp === ''){
      scrollToComponent(panel,{align: 'top'});
    }
    else{
      window.location.href = '/'; 
    }

  }

  componentDidMount() {
    const queryobj = queryString.parse(window.location.search);
    if(queryobj['q'] !== '' && queryobj['m'] === 's'){
      this.suggestionselected('skills',queryobj['q']);
    }
    else if(queryobj['q'] !== '' && queryobj['m'] === 'o'){
      this.suggestionselected('occupations',queryobj['q']);
    }

    this.loadhighdemandoccupations();
  }

  renderoccupationsindemand(occupations){
    const indemandrender = occupations.map((item) => (
            <Card key={item.id} raised fluid={false}>
              <Card.Content>
                <Label corner='right'>
                  <Icon name='user outline' />
                </Label>
                <Card.Header onClick={this.suggestionselected.bind(this,'occupations',item.id)}>
                  <a href={ '/?q=' + item.id + '&m=o' }>
                  {item.name}
                  </a>
                </Card.Header>
                <Card.Meta>role</Card.Meta>
              </Card.Content>
              <Card.Content>
              {
                item.desc.split(" ").splice(0,20).join(" ") + '...'
              }
              </Card.Content>
            </Card>
        ));

    this.setState({occupationsindemand: indemandrender});
  }

  async loadhighdemandoccupations(){
    var requeststr = this.state.searchendpoint + '/occupations/highdemand?3'
    //console.log('fetch indemand occupations [' + requeststr + ']');
    try{
      const response = await axios.get(requeststr);
      console.log('fetch indemand occupations [' + response.data['message'] + ']');
      const occupationsindemand = response.data['occupations'];
      this.renderoccupationsindemand(occupationsindemand);
    }
    catch(err){
      console.log('fetch indemand occupations [' + err + ']');     
    }
  }

  async searchskills(query,mode){
    let suggestions = [];

    var skillrequeststr = this.state.searchendpoint + '/skills/' + query + '?' + mode
    //console.log('search skills [' + skillrequeststr + ']');
    try{
      const response = await axios.get(skillrequeststr);
      console.log('search skills [' + response.data['message'] + ']');
      suggestions = response.data['skills'];
      if(mode === 'full'){
        const skillname = suggestions[0]['name'];
        this.setState({selectedvalue: skillname});
        this.setState({searchquery: skillname});
      }
    }
    catch(err){
      console.log('search skills [' + err + ']');     
    }
    return suggestions;
  }

  async searchoccupations(query,mode){
    let suggestions = [];

    var occupationrequeststr = this.state.searchendpoint + '/occupations/' + query + '?' + mode
    //console.log('search occupations [' + occupationrequeststr + ']');
    try{
      const response = await axios.get(occupationrequeststr);
      console.log('search occupations [' + response.data['message'] + ']');
      suggestions = response.data['occupations'];
      if(mode === 'full'){
        const occupationname = suggestions[0]['name'];
        this.setState({selectedvalue: occupationname});
        this.setState({searchquery: occupationname});
      }
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
    this.setState({mainpageloading: false});
  }

  searchkeywords(event, data){
    this.resetsuggestions();
    const keywords = data.searchQuery;
    console.log("search keywords [" + keywords + "]");
    this.setState({searchquery: keywords});
    if(keywords.length > 3){
      this.setState({mainpageloading: true});
      this.searchboth(keywords);
    }
    else if(keywords.length === 0){
      window.location.href = '/'; 
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
    this.setState({helpwithskill: ''});
    this.setState({helpwithoccupation: ''});
    this.setState({inquirecustommessage: ''});
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

      this.suggestionselected(selectedtype,selectedid);
      let shortentype = 'o';
      if(selectedtype === 'skills'){
        shortentype = 's';
      }
      window.location.href = '/?m=' + shortentype + '&q=' + selectedid; 
    }
  }

  async suggestionselected(type,id){
    this.setState({mainpageloading: true});

    await this.setState({selectedid: id});
    await this.setState({selectedtype: type});

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
    this.setState({mainpageloading: false});
    const pagetitlestr = this.state.selectedvalue + ' by bSkild';
    document.title = pagetitlestr;
  }

  async lookupoccupationsforskill(id){
    var requeststr = this.state.searchendpoint + '/skills/' + id + '/occupations'
    //console.log('search skill occupations [' + requeststr + ']');
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
    var requeststr = this.state.searchendpoint + '/occupations/' + id + '/skills?15'
    //console.log('search occupation skills [' + requeststr + ']');
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
    var requeststr = this.state.searchendpoint + '/occupations/' + id + '/related?5'
    //console.log('search related occupations [' + requeststr + ']');
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
    await this.setState({helpwithskill: selectedskillid});  
    await this.inquirehelpmodalskills(true,this.state.selectedid,this.state.selectedvalue);
   }

  async inquirehelpmodalskills(state,occupationid,name){
    await this.setState({helpwithoccupation: occupationid});
    const custommessage = 'I need help with upskilling a specific skill for [' + name + ']';
    this.inquirehelpmodal(custommessage,state);
  }

  async inquirehelpmodaloccupation(state,occupationid,name){
    await this.setState({helpwithoccupation: occupationid});
    await this.setState({helpwithskill: ''}); 

    const custommessage = 'I need help with reskilling from [' + this.state.selectedvalue + '] to [' + name + ']';
    this.inquirehelpmodal(custommessage,state);
  }

  async inquirehelpmodal(message,state){
    await this.setState({inquirecustommessage: message});
    await this.setState({inquireroleopen: state});
  }

  async inquiryforwardedmodal(state){
    await this.setState({inquirecustommessage: ''});
    await this.setState({confirmformforwarded: state});
  }

  validateemail(event){
    const email = document.getElementById('inquiryemail').value;
    if(validator.isEmail(email)) { 
      this.setState({isemailvalid: true});
    }
    else{
       this.setState({isemailvalid: false});     
    }
  }

  validatename(event){
    const fname = document.getElementById('inquirynamefirst').value;
    const lname = document.getElementById('inquirynamelast').value;
    if( validator.isAlpha(fname) && validator.isAlpha(lname) ) { 
      this.setState({isnamevalid: true});
    }
    else{
       this.setState({isnamevalid: false});     
    }
  }

  forwardinquiry(){
    const fname = document.getElementById('inquirynamefirst').value;
    const lname = document.getElementById('inquirynamelast').value;
    const email = document.getElementById('inquiryemail').value;
    const company = document.getElementById('inquirycomp').value;

    if(email !== '' && this.state.isemailvalid && this.state.isnamevalid) { 
      console.log("forward inquiry");
      this.setState({inquireroleopen: false});
      this.setState({confirmformforwarded: true});

      this.submitinquiry(fname,lname,email,company,this.state.helpwithoccupation,this.state.helpwithskill);

      const custommessage = 'Thank you. We\'ll respond to you within 24 hours.';
      this.setState({inquirecustommessage: custommessage});
    }
  }

  async submitinquiry(fname,lname,email,company,occupation,skill){

    try{
      const response = await axios.post(this.state.searchendpoint + '/inquiries', 
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
  
  requestdemo(){
    const custommessage = 'I need help with general upskilling or reskilling';
    this.inquirehelpmodal(custommessage,true);
  }

  renderextracontent(mode,type,id,value){
    let render = ''; 
    if(mode === 'full' && type === 'occupations'){
      let renderskills = this.state.selectedoccupationskills.map((skillitem) => (
            <Table.Row key={'row' + skillitem.id}>
              <Table.Cell key={'row.cell1' + skillitem.id} selectable onClick={this.suggestionselected.bind(this,'skills',skillitem.id)}>
                <a href={ '/?q=' + skillitem.id + '&m=s' }>
                  <Popup content={skillitem.optionality + ' skill'}
                    trigger={<Icon name='list' color={skillitem.optionality !== 'optional' ? 'red'  : 'green'}/>}
                  />
                  {skillitem.name}
                </a>
              </Table.Cell>
              <Table.Cell key={'row.cell2' + skillitem.id}>
                {skillitem.reusability} {skillitem.type}
              </Table.Cell>
              <Table.Cell key={'row.cell3' + skillitem.id} width={5}>
                <Popup on='hover'
                  content={'We can help you improve the skill with the right training'}
                  trigger={
                    <Button icon='bell' content='UPSKILL NOW'
                      className='action'
                      onClick={this.setskillsneedhelp.bind(this,skillitem.id)}
                    />
                  }
                />                
              </Table.Cell>
            </Table.Row>     
        ));

      let renderroles = '';
      if(this.state.selectedoccupationrelated.length > 0){
        renderroles = this.state.selectedoccupationrelated.map((occupationitem) => (
            <Table.Row key={'row' + occupationitem.id}>
              <Table.Cell key={'row.cell1' + occupationitem.id} selectable onClick={this.suggestionselected.bind(this,'occupations',occupationitem.id)}>
                <a href={ '/?q=' + occupationitem.id + '&m=o' }><Icon name='user outline'/>{occupationitem.name}</a>
              </Table.Cell>
              <Table.Cell key={'row.cell2' + occupationitem.id} width={5}>
                <Popup on='hover'
                  content={'We can help you reskill for a career change'}
                  trigger={
                    <Button icon='bell' content='ENQUIRE NOW'
                      className='action'
                      onClick={this.inquirehelpmodaloccupation.bind(this,true,occupationitem.id,occupationitem.name)}
                    />
                  }
                />
              </Table.Cell>
            </Table.Row>  
             ));  
      }      
     
      render = (
      <div>
        <Table celled striped compact>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell colSpan='3'><Header as='h4'>Top related roles for career change or progression</Header></Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            { renderroles !== '' ? renderroles : <Table.Row><Table.Cell>No related roles</Table.Cell></Table.Row>}
          </Table.Body>         
        </Table>
        <Table celled striped compact>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell colSpan='3'><Header as='h4'>Main skills to perform this role</Header></Table.HeaderCell>
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
              <Table.Cell key={'row.cell1' + occupationitem.id} selectable onClick={this.suggestionselected.bind(this,'occupations',occupationitem.id)}>
                <a href={ '/?q=' + occupationitem.id + '&m=o' }><Icon name='user outline'/>{occupationitem.name}</a>
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
              <Table.HeaderCell colSpan='2'><Header as='h4'>Roles that require this skill</Header></Table.HeaderCell>
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
    console.log("loading results");

    let serprefreshed = [];
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
                <Card.Header onClick={this.suggestionselected.bind(this,item.type,item.key)}>
                  <a as='h1' href={ item.type === 'occupations' ? '/?q=' + item.key + '&m=o'  : '/?q=' + item.key + '&m=s' }>
                  {item.value}
                  </a>
                </Card.Header>
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
                          { item.type === 'occupations' ? 'Description'  : 'Description'}
                        </Header>
                      </Table.HeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    <Table.Row key='descriptionrow'>
                      <Table.Cell key='descriptioncell'>
                      {item.desc}
                      <br/><br/>
                      {
                        mode !== 'lite' && item.alts[0] !== '' &&
                        <b>Also known as: </b>
                      }
                      {
                        mode !== 'lite' && item.alts[0] !== '' &&
                        item.alts.map(alt => (
                          <span key={'alt_' + alt}>{alt}; </span>
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
    if(!this.state.mainpageloading && this.state.dropdownoptions.length > 0){
      results = (
        <div
          className={isMobile ? "bodymain mobile" : "bodymain"}
        > 
          <Card.Group stackable doubling>
            {this.state.serp}
          </Card.Group>
        </div>
      );
    }
    else if(!this.state.mainpageloading && this.state.selectedid === ''){
      results = (
        <div>
          <div
            className={isMobile ? "bodyapex mobile" : "bodyapex"}
          >
            <Grid>
              <Grid.Row columns={2} textAlign='left'>
                <Grid.Column width={8}>
                  <Header as='h2' style={{ fontSize: '30px' }} className="fontdark">
                    Be skilled where it matters
                  </Header>
                  <p className="fontdark" style={{ fontSize: '15px' }}>
                    Uncover opportunities to upskill or reskill to future-proof yourself and your workforce using a combination of open source and proprietary data and AI
                  </p>
                  <Button
                      className='action'
                      size='large' onClick={this.scrollto.bind(this,this.problemstatpanel)}>
                      FIND OUT MORE
                    </Button>
                </Grid.Column>
                <Grid.Column>
                </Grid.Column>
              </Grid.Row>
            </Grid>
          </div>
          <div
            className={isMobile ? "bodydark mobile" : "bodydark"}
            ref={(div) => { this.problemstatpanel = div; }}
          >
            <Grid celled='internally' columns='equal' doubling stackable>
              <Grid.Row textAlign='left'>
                <Grid.Column>
                  <Header as='h4' style={{ fontSize: '19px' }} className="fontlight">
                    New roles and skills continue to emerge while existing ones evolve or become redundant
                  </Header>
                  <p className="fontlight" style={{ fontSize: '15px' }}>
                  Employers and workers alike do not have the tools and the data needed to deal with the changes, which results in mismatch between supply and demand in the labour market
                  </p>
                </Grid.Column>
                <Grid.Column verticalAlign="middle">
                  <List key='problemstat2' floated="left" className="fontlight" style={{ fontSize: '15px' }}>
                    <List.Item key='problemstat21'>
                      <List.Icon name='check circle' />
                      <List.Content>
                      Throughout 2020 in the US, <a href='https://www.forbes.com/sites/ryancraig/2020/07/17/fixing-the-worlds-most-inefficient-market/' target="_blank" rel="noreferrer">tens of millions of workers were unemployed while millions of jobs go unfilled</a>.
                      </List.Content>
                    </List.Item>
                    <List.Item key='problemstat23'>
                      <List.Icon name='check circle' />
                      <List.Content>
                        It is estimated that <a href='https://www.forbes.com/sites/kenrapoza/2020/05/15/some-42-of-jobs-lost-in-pandemic-are-gone-for-good/' target="_blank" rel="noreferrer">some 40% of the jobs</a> lost in the US during the pandemic may never come back.
                      </List.Content>
                    </List.Item>
                    <List.Item key='problemstat22'>
                      <List.Icon name='check circle' />
                      <List.Content>
                      By 2022, it is expected that <a href='https://www.bcg.com/en-au/publications/2020/fixing-global-skills-mismatch' target="_blank" rel="noreferrer">27% of available jobs</a> will be in roles that do not yet exist.
                      </List.Content>
                    </List.Item>
                  </List>
                </Grid.Column>
              </Grid.Row>
            </Grid>
          </div>

          <div
            className={isMobile ? "bodylight mobile" : "bodylight"}
          >
            <Grid celled='internally' columns='equal' doubling stackable>
              <Grid.Row textAlign='left'>
                <Grid.Column>
                  <Header as='h4' style={{ fontSize: '19px' }} className="fontdark">
                    At the same time, improving productivity and retention requires employees to be continuously learning and growing
                  </Header>
                  <p className="fontdark" style={{ fontSize: '15px' }}>
                    The cost of maintaining a specialist function to identify and fulfill development or progression opportunities can remain out of reach for small to medium sized businesses
                  </p>
                </Grid.Column>
                <Grid.Column verticalAlign="middle">
                  <List key='problemstat1' floated="left" className="fontdark" style={{ fontSize: '15px' }}>

                    <List.Item key='problemstat11'>
                      <List.Icon name='check circle' />
                      <List.Content>
                        The average cost of losing an employee is <a href='https://www.benefitnews.com/news/avoidable-turnover-costing-employers-big' target="_blank" rel="noreferrer">about 33% of their annual salary</a>.
                      </List.Content>
                    </List.Item>

                    <List.Item key='problemstat12'>
                      <List.Icon name='check circle' />
                      <List.Content>
                        Organisations who are committed to talent mobility (through workforce repurposing) <a href='https://hbr.org/2016/05/dont-underestimate-the-power-of-lateral-career-moves-for-professional-growth' target="_blank" rel="noreferrer">performs better financially</a>.
                      </List.Content>
                    </List.Item>

                    <List.Item key='problemstat13'>
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
            className={isMobile ? "bodydark mobile" : "bodydark"}
            ref={(div) => { this.whatwedopanel = div; }}
          >
            <Grid celled='internally' columns='equal' doubling stackable>
              <Grid.Row textAlign='left'>
                <Grid.Column>
                  <Header as='h4' style={{ fontSize: '19px' }} className="fontlight">
                    Using a combination of open source and proprietary data and AI, <span className="positive">we help you</span> uncover development and progression opportunities in your workforce and realise them
                  </Header>
                  <p className="fontlight" style={{ fontSize: '15px' }}>

                  </p>
                </Grid.Column>
                <Grid.Column verticalAlign="middle">
                  <List key='valueprop' floated="left" className="fontlight" style={{ fontSize: '15px' }}>
                    <List.Item key='valueprop1'>
                      <List.Icon name='check circle' />
                      <List.Content>
                       Understand the skills profile of your workforce in terms of niche vs transferable skills, hard-to-find skills, etc.
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
                        Identify opportunities for lateral moves to put existing skills to good use and introduce new challenges to stimulate employees.
                      </List.Content>
                    </List.Item>
                  </List>
                </Grid.Column>
              </Grid.Row>
            </Grid>
          </div>

          <div className={isMobile ? "bodylight mobile" : "bodylight"}
          >
           <Grid celled='internally' columns='equal' doubling stackable>
              <Grid.Column>
                <Header as='h4' style={{ fontSize: '19px' }} className="fontdark">
                  Here are some of the most in-demand jobs this week
                </Header>
                <Card.Group>
                  {this.state.occupationsindemand}
                </Card.Group>
              </Grid.Column>
            </Grid>
          </div>

          <div
            className={isMobile ? "bodydark mobile" : "bodydark"}
            ref={(div) => { this.contactuspanel = div; }}
          >
            <Grid celled='internally' columns='equal' doubling stackable>
              <Grid.Column>
                <Header as='h4' style={{ fontSize: '19px' }} className="fontlight">
                  Want to improve your organisation's ability to upskill and reskill your workforce
                  and retain talent but not sure where to begin? Reach out to us now
                  to find out how <span className="positive">we can help you</span>
                </Header>
                <p className="fontlight" style={{ fontSize: '15px' }}>
                  
                </p>
              </Grid.Column>
              <Grid.Column verticalAlign="middle">
                <Grid columns={2} doubling stackable>
                  <Grid.Column>
                    <Button 
                      className='action'
                      size='large' onClick={this.requestdemo.bind(this)}>
                      REQUEST A DEMO
                    </Button>
                  </Grid.Column>
                  <Grid.Column>
                    <Button
                      className='action'
                      size='large' onClick={this.scrollto.bind(this,this.trynowpanel)}>
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
    else if(!this.state.mainpageloading){
      results = (
        <div
          className={isMobile ? "bodymain mobile" : "bodymain"}
        >
          <Message icon negative>
            <Icon name='exclamation circle'/>
            <Message.Content>
              <Message.Header>Oops, there has been a problem.</Message.Header>
              Please click <a href={ this.state.selectedtype === 'occupations' ? '/?q=' + this.state.selectedid + '&m=o' : '/?q=' + this.state.selectedid + '&m=s' }>here</a> to refresh the page.
              If the problem persists, <a href='/'>return to the home page</a> and try again.
            </Message.Content>
          </Message>
        </div>
      );
    }

    return (
      <div>

        <Modal
          basic
          onClose={this.inquirehelpmodal.bind(this,'',false)}
          open={this.state.inquireroleopen}
          size='fullscreen'
          centered={true}
        >
          <Header textAlign='left'>
            {this.state.inquirecustommessage}
          </Header>
          <Modal.Content>
            <Grid doubling stackable>
              <Grid.Row columns={2} divided>
                <Grid.Column>
                  {
                    !this.state.isnamevalid && 
                    <Label basic color='red' pointing='below'>
                    Invalid first name
                    </Label>
                  } 
                  <Input id="inquirynamefirst" label='First name' onChange={this.validatename.bind(this)} placeholder='First name...' fluid />
                </Grid.Column>
                <Grid.Column>
                  {
                    !this.state.isnamevalid && 
                    <Label basic color='red' pointing='below'>
                    Invalid last name
                    </Label>
                  } 
                  <Input id="inquirynamelast" label='Last name' onChange={this.validatename.bind(this)} placeholder='Last name...' fluid />
                </Grid.Column>
              </Grid.Row>
              <Grid.Row columns={2} divided>
                <Grid.Column>
                  <Input id="inquiryemail" label='Email&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' onChange={this.validateemail.bind(this)} placeholder='Email address...' fluid />
                  {
                    !this.state.isemailvalid && 
                    <Label basic color='red' pointing='above'>
                    Invalid email
                    </Label>
                  } 
                </Grid.Column>
                <Grid.Column>
                  <Input id="inquirycomp" label='Company&nbsp;&nbsp;' placeholder='Company name' fluid />
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

        <Loader active={this.state.mainpageloading} size='medium'>
        Loading
        </Loader>

        <div
          className={isMobile ? "navheader mobile" : "navheader"} 
          ref={(div) => { this.trynowpanel = div; }}           
        > 
          <Grid doubling stackable>
            <Grid.Row columns={2}>
              <Grid.Column width={5} verticalAlign='middle' textAlign='left'>
                <span style={{ paddingLeft: '0.2em'}}></span>
                <Image as='a' spaced='left' inline
                href='./' size='tiny' src='./logo_small.png'/>
                <span className="menulink">
                  <a href="/#" onClick={this.scrollto.bind(this,this.whatwedopanel)}>ABOUT</a>
                </span>
                <span className="menulink">
                  <a href="/#" onClick={this.scrollto.bind(this,this.contactuspanel)}>CONTACT US</a>
                </span>
              </Grid.Column>
              <Grid.Column verticalAlign='middle'>
                <Dropdown name="keywords" icon='search'
                  style={ isMobile ? { width: '23em'} : {width: '38em'} }
                  inline search selection allowAdditions
                  additionLabel='Search with '
                  minCharacters={2}
                  selectOnBlur={false}
                  searchQuery={this.state.searchquery}
                  value={this.state.searchquery}
                  options={this.state.dropdownoptions}
                  noResultsMessage = "No results found"
                  onSearchChange={this.searchkeywords.bind(this)}
                  onChange={this.selectsuggestion.bind(this)}
                  placeholder='What role or skill do you need help with?'
                  onAddItem={this.searchkeywords.bind(this)}
                />
              </Grid.Column>
            </Grid.Row>
          </Grid>
        </div>

        { results }

        {
          !this.state.mainpageloading &&
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
        }
      </div>
    )
  }
}
export default App;
