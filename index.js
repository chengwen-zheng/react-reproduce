import ReactFake from './ReactFake';
import HelloMessage from './App.jsx';
import React from 'react';
main();

function main() {
    ReactFake.render(<HelloMessage name = 'leon'/>, document.getElementById('root'));
}