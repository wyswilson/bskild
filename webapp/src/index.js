import React from 'react';

import ReactDOM from 'react-dom';
import Favicon from 'react-favicon';
import './index.css';
import 'semantic-ui-css/semantic.min.css';

import App from './App';

ReactDOM.render(
	<div>
		<Favicon url="./favicon.ico" />
		<App />
	</div>,
	document.getElementById('root')
);