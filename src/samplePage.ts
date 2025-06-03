// Simple sample page data for demonstration
export const samplePage = {
  id: 'sample-page',
  title: 'Sample Page',
  content: `
    <h2>Welcome to the Sample Page</h2>
    <p>This is a <b>sample</b> wiki page. You can add <i>formatting</i>, images, and crosslinks like [[AnotherPage]].</p>
    <img src="https://placekitten.com/300/200" alt="Sample" style="max-width:100%" />
    <hr />
    <div data-block-type="restricted" data-usergroups='["admins","editors"]'>
      <p><b>Restricted Block:</b> This content is only visible to admins and editors. Here is a secret map:</p>
      <img src="https://placehold.co/400x200/secret/fff?text=Secret+Map" alt="Secret Map" style="max-width:100%" />
    </div>
    <hr />
    <p>Another public block for everyone to see.</p>
  `,
};
