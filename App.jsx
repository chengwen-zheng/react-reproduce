
import Story from './Story.jsx';
import ReactFake from './ReactFake';

class App extends ReactFake.Component {
    render() {
        console.log(this.props.stories);
      return (
        <div>
          <h1>ReactFake Stories</h1>
          <ul>
            {this.props.stories.map(story => {
              return <Story name={story.name} url={story.url} />;
            })}
          </ul>
        </div>
      );
    }
}

export default App;