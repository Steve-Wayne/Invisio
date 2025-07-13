import { handleWorkflowFailure } from '../controllers/eventsHandler.js';

const payload = {
  workflow_run: {
    status: 'completed',
    conclusion: 'failure',
    name: 'Node.js CI',
    html_url: 'https://github.com/example/repo/actions/runs/123',
  },
  repository: {
    name: 'repo',
    owner: { login: 'example' },
  },
  installation: { id: 1 },
};

handleWorkflowFailure(payload).then(() => {
  console.log('Workflow failure event handled (Node.js).');
});
