import React from 'react';
import axios from 'axios';
import { Label, Icon, Dropdown, Header, Grid, Card } from 'semantic-ui-react'
import './app.css';
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
      serp:''
    };
  }

  async searchskills(query){
    let suggestions = [];

    var skillrequeststr = this.state.searchendpoint + '/skills/' + query + '?lite'
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

  async searchoccupations(query){
    let suggestions = [];

    var occupationrequeststr = this.state.searchendpoint + '/occupations/' + query + '?lite'
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
    const options1 = await this.searchoccupations(query);
    await this.updatesuggestions(options1,'occupations');
    const options2 = await this.searchskills(query);
    await this.updatesuggestions(options2,'skills');
    await this.refreshresults();
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
        content: (
          <Header size='small' color={type === 'occupations' ? 'blue'  : 'orange'} icon={type === 'occupations' ? 'user outline'  : 'list'} content={item.name} subheader={item.desc.split(" ").splice(0,20).join(" ") + '...'} />
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
      const options = await this.searchskills(id);
      await this.resetsuggestions();
      await this.updatesuggestions(options,'skills');
      await this.refreshresults();
    }
    else if(type === 'occupations'){
      const options = await this.searchoccupations(id);
      await this.resetsuggestions();
      await this.updatesuggestions(options,'occupations');
      await this.refreshresults();
    }
  }

  refreshresults(){
    console.log("refreshing results");
    const serprefreshed = this.state.dropdownoptions.map( (item) => (
         <Card key={item.key}
          color={item.type === 'occupations' ? 'blue'  : 'orange'}
          onClick={this.suggestionselected.bind(this,item.type,item.key,item.value)}
         >
          <Card.Content>
            <Label corner='right'>
              <Icon
                name={item.type === 'occupations' ? 'user outline'  : 'list'}
                color={item.type === 'occupations' ? 'blue'  : 'orange'}
              />
            </Label>
            <Card.Header>{item.value}</Card.Header>
            <Card.Meta>
              {item.type}
            </Card.Meta>
            <Card.Description>
              {item.desc}
            </Card.Description>
          </Card.Content>
          <Card.Content extra>
          </Card.Content>
        </Card>
           ));
    console.log(serprefreshed);
    this.setState({serp: serprefreshed});
  }

  render() {
    let results = ''; 
    if(this.state.serp !== ''){
      results = (
        <Card.Group>{this.state.serp}</Card.Group>
      )
    }

    return (
      <div
        className={isMobile ? "bodymain mobile" : "bodymain"}
      >
        <Grid stackable columns={1}>
          <Grid.Column>
            <Dropdown name="keywords" fluid
                search compact
                selection allowAdditions
                additionLabel='Search with '
                minCharacters={3}
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
          <Grid.Column>
            {results}
          </Grid.Column>
        </Grid>
      </div>
    )
  }
}
export default App;
