import ReactFake from './ReactFake';
import App from './App.jsx';
import React from 'react';


const stories = [
    { name: "Didact introduction", url: "http://bit.ly/2pX7HNn" },
    { name: "Rendering DOM elements ", url: "http://bit.ly/2qCOejH" },
    { name: "Element creation and JSX", url: "http://bit.ly/2qGbw8S" },
    { name: "Instances and reconciliation", url: "http://bit.ly/2q4A746" },
    { name: "Components and state", url: "http://bit.ly/2rE16nh" },
    { name: "Fiber: Incremental reconciliation", url: "http://bit.ly/2gaF1sS" }
  ];

ReactFake.render(<App stories = {stories}/>, document.getElementById('root'));
