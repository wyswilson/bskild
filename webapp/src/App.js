import React from 'react';
import axios from 'axios';
import { Popup, List, Button, Label, Icon, Dropdown, Header, Grid, Card } from 'semantic-ui-react'
import _ from 'lodash'
import {isMobile} from 'react-device-detect';

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
      selectedoccupationrelated: []
    };
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
    this.resetsuggestions();
    const keywords = data.searchQuery;
    console.log("searchkeywords [" + keywords + "]");
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
        alts: item.alternatives,
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
    console.log(type + "-" + id);
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
      await this.refreshresults('full');
    }
  }

  showextracontent(event,selected){
    const selectedindex = selected.index;
    const activeindex = this.state.activeaccordion;
    console.log('user clicked on: ' + selectedindex);

    console.log('active was: ' + activeindex);
    //if(selectedindex === this.state.activeaccordion){
    //  this.setState({ activeaccordion: 0});
    //}
    //else{
      this.setState({ activeaccordion: selectedindex});
    //}
    const newactiveindex = this.state.activeaccordion;
    console.log('active is now: ' + newactiveindex);
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

  renderextracontent(mode,type,id,value){
    let render = ''; 
    if(mode === 'full' && type === 'occupations'){
      render = this.state.selectedoccupationskills.map((skillitem) => (
                 <List.Item key={skillitem.id}>
                  <Popup content={skillitem.optionality + ' skill'} trigger={
                  <List.Icon name='list' color={skillitem.optionality !== 'optional' ? 'red'  : 'green'} size='large' verticalAlign='middle'/>
                  }/>
                  <List.Content>
                    <List.Header as='a' onClick={this.suggestionselected.bind(this,'skills',skillitem.id,skillitem.name)}
                    >
                      {skillitem.name}
                    </List.Header>
                    <List.Description>
                      {skillitem.reusability} {skillitem.type}
                    </List.Description>
                  </List.Content>
                </List.Item>
             ));

      render = (
        <List divided verticalAlign='middle'>
          <Header as='h4'>Required skills and knowledge</Header>
        {render}
        </List>
      );
            
    }
    else if(mode === 'full' && type === 'skills'){
      render = this.state.selectedskilloccupations.map((occupationitem) => (
                 <List.Item key={occupationitem.id}>
                  <List.Icon name='user outline' size='large' verticalAlign='middle'/>
                  <List.Content>
                    <List.Header as='a' onClick={this.suggestionselected.bind(this,'occupations',occupationitem.id,occupationitem.name)}
                    >
                      {occupationitem.name}
                    </List.Header>
                    <List.Description>
                      
                    </List.Description>
                  </List.Content>
                </List.Item>
             ));
      render = (
        <List divided verticalAlign='middle'>
        {render}
        </List>
      );
    }
    else{
      render = (
        <Button animated='vertical' size='medium' fluid
          onClick={this.suggestionselected.bind(this,type,id,value)}
        >
          <Button.Content hidden>find out more</Button.Content>
          <Button.Content visible>
            <Icon name='arrow circle right' />
          </Button.Content>
        </Button>);
    }
    return render;
  }

  refreshresults(mode){
    console.log("refreshing results");
    let serprefreshed = [];
    console.log(this.state.dropdownoptions);
    this.state.dropdownoptions.forEach(function(item) {
      serprefreshed.push(
             <Card key={item.key}
              fluid={mode !== 'lite' ? true : false}
             >
              <Card.Content>
                <Label corner='right'>
                  <Icon
                    name={item.type === 'occupations' ? 'user outline'  : 'list'}
                  />
                </Label>
                <Card.Header>{item.value}</Card.Header>
                <Card.Meta>
                  {item.type}
                </Card.Meta>
                <Card.Description>
                  {item.desc}<br/>
                  Also known as 
                </Card.Description>
              </Card.Content>
              <Card.Content extra>
              { this.renderextracontent(mode,item.type,item.key,item.value) }
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
          <Grid celled='internally' columns='equal' stackable>
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
          <Grid celled='internally' columns='equal' stackable>
            <Grid.Row textAlign='left'>
              <Grid.Column>
                <Header as='h3' style={{ fontSize: '24px' }} className="fontdark">
                Better managing the development and progression in your workforce is key to retention and efficiency
                </Header>
              </Grid.Column>
              <Grid.Column verticalAlign="middle">
                <List floated="left" className="fontdark">

                  <List.Item>
                    <List.Icon name='check circle' />
                    <List.Content>
                      The average cost of losing an employee is <a href='https://www.benefitnews.com/news/avoidable-turnover-costing-employers-big' target="_blank" rel="noreferrer">about 33% of their annual salary</a>.
                    </List.Content>
                  </List.Item>

                  <List.Item>
                    <List.Icon name='check circle' />
                    <List.Content>
                      Organisations who are committed to talent mobility <a href='https://hbr.org/2016/05/dont-underestimate-the-power-of-lateral-career-moves-for-professional-growth' target="_blank" rel="noreferrer">performs better financially</a>.
                    </List.Content>
                  </List.Item>

                  <List.Item>
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
          <Grid celled='internally' columns='equal' stackable>
            <Grid.Row textAlign='left'>
              <Grid.Column>
                <Header as='h3' style={{ fontSize: '24px' }} className="fontlight">
                  We help you uncover development and progression opportunities in your workforce and realise them in a few ways
                </Header>
              </Grid.Column>
              <Grid.Column verticalAlign="middle">
                <List floated="left" className="fontlight">
                  <List.Item>
                    <List.Icon name='check circle' />
                    <List.Content>
                     Understand the skills profile of your workforce and the critical areas in terms of hard to fill roles.
                    </List.Content>
                  </List.Item>

                  <List.Item>
                    <List.Icon name='check circle' />
                    <List.Content>
                      Recommend opportunities to upskill based on the profile and follow up with options to fullfill the training needs.
                    </List.Content>
                  </List.Item>

                  <List.Item>
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

          <Grid celled='internally' columns='equal' stackable>
            <Grid.Column>
              <Header as='h3' style={{ fontSize: '24px' }} className="fontdark">
                Interested in finding out more?
              </Header>
              <p className="fontdark">
                Do you want to improve your organisation's ability 
                in managing and retaining talent but not sure where to begin?
              </p>
            </Grid.Column>
            <Grid.Column verticalAlign="middle">
              <Grid columns={1} doubling stackable>
                <Grid.Column>
                  Enter email address
                </Grid.Column>
                <Grid.Row columns={2}>
                  <Grid.Column width={7}>
                    <Button className='kuning button fullwidth'>
                      REGISTER NOW</Button>
                  </Grid.Column>
                  <Grid.Column width={9}>
                    
                  </Grid.Column>
                </Grid.Row>
              </Grid>
            </Grid.Column>
          </Grid>
        </div>
      </div>
      );

    }

    return (
      <div>
        <div
          className={isMobile ? "navheader mobile" : "navheader"}            
        >
          <Grid columns={1} doubling stackable>
            <Grid.Column>
              <Dropdown name="keywords" fluid
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
                  placeholder='Occupation or skill'
                  onAddItem={this.searchkeywords.bind(this)}
              />
            </Grid.Column>
          </Grid>
        </div>
        {results}
        <div
          className={isMobile ? "navfooter mobile" : "navfooter"}
        >
          <List horizontal verticalAlign="middle">
            <List.Item className="footheader">
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
