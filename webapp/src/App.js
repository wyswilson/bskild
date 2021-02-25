import React from 'react';

import { BrowserRouter, Switch, Redirect, Route } from 'react-router-dom';
import PrivateRoute from './utils/private-route';

import Login from './Login';
import Profile from './Profile';
import Home from './Home';

class App extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      //apihost: 'http://127.0.0.1:88',
      apihost: 'https://inven3s.xyz'
    };
  }


  componentDidMount() {
    
  }


  render() {
    return (
      <div>
        <BrowserRouter>
          <div>
            <Switch>
              <Route path="/home" component={Home} />
              <Route path="/login" component={Login} />
              <PrivateRoute path="/profile" component={Profile} />
              <Route>
                <Redirect to="/home" />
              </Route>
            </Switch>
          </div>
        </BrowserRouter>
      </div>
    )
  }
}
export default App;

