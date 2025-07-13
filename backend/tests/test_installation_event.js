import { handleInstallationEvent } from '../controllers/eventsHandler.js';

const payload = {
  repositories: [
    { full_name: 'example/repo1', name: 'repo1' },
    { full_name: 'example/repo2', name: 'repo2' },
  ],
  installation: { id: 1, account: { login: 'example' } },
};

handleInstallationEvent(payload).then(() => {
  console.log('Installation event handled (multi-repo).');
});