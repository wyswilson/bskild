import React from 'react';
import axios from 'axios';
import { Dropdown} from 'semantic-ui-react'
import './App.css';
import _ from 'lodash'

class App extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      searchendpoint: 'http://bskild.xyz/v1',
      valueselected: '',
      valueoptions: []
    };
  }
  updatesuggestions(query,suggestions,type){
    const updatedsuggestions = _.map(suggestions, (item) => (
        {
          key: item.id,
          text: item.name,
          value: item.name,
          icon: 'user outline' ? type === 'skills' : 'list'
        }
      ));
    console.log(updatedsuggestions);
    
    if(type === 'occupations'){
      this.setState({ valueoptions: updatedsuggestions });
      this.searchskills(query);
    }
    else{
      this.setState({ 
        valueoptions: this.state.valueoptions.concat(updatedsuggestions)
      });
    }
  }

  searchskills(query){
    var skillrequeststr = this.state.searchendpoint + '/skills/' + query
    console.log('search skills [' + skillrequeststr + ']');
    axios.get(skillrequeststr)
      .then(response => { 
        if(response.status === 200){
          console.log('search skills [' + response.data['message'] + ']');
          this.updatesuggestions(query,response.data['skills'],"skills");
        }
        else{
          console.log('search skills [' + response.data['message'] + ']');          
        }
      })
      .catch(error => {
        console.log('search skills [server unreachable]');
      });
  }
  searchoccupations(query){
    var occupationrequeststr = this.state.searchendpoint + '/occupations/' + query
    console.log('search occupations [' + occupationrequeststr + ']');
    axios.get(occupationrequeststr)
      .then(response => { 
        if(response.status === 200){
          console.log('search occupations [' + response.data['message'] + ']');
          this.updatesuggestions(query,response.data['occupations'],"occupations");
        }
        else{
          console.log('search occupations [' + response.data['message'] + ']');          
        }
      })
      .catch(error => {
        console.log('search occupations [server unreachable]');
      });
  }
  searchkeywords(event, data){
    const keywords = data.searchQuery;

    if(keywords.length > 3){
      this.searchoccupations(keywords);
    }
  }
  dosomething(event, data){
    const field = data.name;
    const value = data.value;
  }
  render() {
    return (
      <div>

        <Dropdown name="keywords"
            search
            selection
            value={this.state.valueselected}
            options={this.state.valueoptions}
            noResultsMessage = "No results found"
            onSearchChange={this.searchkeywords.bind(this)}
            onChange={this.dosomething.bind(this)}
        />

      </div>
    )
  }
}
export default App;
