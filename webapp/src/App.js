import React from 'react';
import axios from 'axios';
import { Dropdown, Header, Grid, Card } from 'semantic-ui-react'
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
      serp: <Card></Card>
    };
  }

  updatesuggestions(suggestions,type){
    const updatedsuggestions = _.map(suggestions, (item) => (
      {
        key: item.id,
        text: item.name,
        value: item.name,
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
  }

  async searchskills(query){
    let suggestions = [];

    var skillrequeststr = this.state.searchendpoint + '/skills/' + query
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

    var occupationrequeststr = this.state.searchendpoint + '/occupations/' + query
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
    await this.resetsuggestions();
    const options1 = await this.searchoccupations(query);
    await this.updatesuggestions(options1,'occupations');
    const options2 = await this.searchskills(query);
    await this.updatesuggestions(options2,'skills');
    await this.refreshresults();
  }

  searchkeywords(event, data){
    const keywords = data.searchQuery;
    this.setState({searchquery: keywords});
    if(keywords.length > 3){
      this.searchboth(keywords);
    }
  }

  async setvalue(event, data){
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
      this.setState({selectedid: selectedid});
      this.setState({selectedtype: selectedtype});
      this.setState({selectedvalue: selectedvalue});

      if(selectedtype === 'skills'){
        const options = await this.searchskills(selectedid);
        await this.resetsuggestions();
        await this.updatesuggestions(options,'skills');
        await this.refreshresults();
      }
      else if(selectedtype === 'occupations'){
        const options = await this.searchoccupations(selectedid);
        await this.resetsuggestions();
        await this.updatesuggestions(options,'occupations');
        await this.refreshresults();
      }
    }
  }

  refreshresults(){
    console.log("refreshing results");
    const serprefreshed = this.state.rawresponse.map( (item) => (
         <Card key={item.id}>
          <Card.Content>
            <Card.Header>{item.name}</Card.Header>
            <Card.Meta>
              {item.type ? item.type + ', ' + item.reusability : ''}
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

  handleenter(event){
    if(event.code === 'Enter'){
      console.log("auto suggest not used");
      this.searchboth(this.state.searchquery);
    }
  }

  render() {
    return (
      <div
        className={isMobile ? "bodymain mobile" : "bodymain"}
      >
        <Grid stackable columns={1}>
          <Grid.Column>
            <Dropdown name="keywords" className="fullwidth"
                search clearable compact
                selection
                searchQuery={this.state.searchquery}
                value={this.state.searchquery}
                options={this.state.dropdownoptions}
                noResultsMessage = "No results found"
                onSearchChange={this.searchkeywords.bind(this)}
                onChange={this.setvalue.bind(this)}
                //onKeyDown={this.handleenter.bind(this)}
                placeholder='Occupation or skill'
            />
          </Grid.Column>
          <Grid.Column>
            <Card.Group>
            {this.state.serp}
            </Card.Group>
          </Grid.Column>
        
        </Grid>
      </div>
    )
  }
}
export default App;
