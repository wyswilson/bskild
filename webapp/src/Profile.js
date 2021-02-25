import React from 'react';
import { isMobile } from 'react-device-detect';
import { getToken, removeUserSession } from './utils/common';

import { Image, Grid, Icon } from 'semantic-ui-react'

class Profile extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      apihost: 'http://bskild.xyz/v1',
      token: getToken()

    };
  }

  logout(){
    removeUserSession();
    this.props.history.push('/home');
  }

  componentDidMount() {
   
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
                style={{ paddingTop: '0.6em'}}
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
          <Grid celled='internally' columns='equal' doubling stackable>
            <Grid.Row columns={2} divided>
              <Grid.Column>
              hi
              </Grid.Column>
              <Grid.Column>
              ho
              </Grid.Column>
            </Grid.Row>
            <Grid.Row columns={2} divided>
              <Grid.Column>
              he
              </Grid.Column>
              <Grid.Column>
              </Grid.Column>
            </Grid.Row>
          </Grid>
        </div>
      </div>
    )
  }
}
export default Profile;
