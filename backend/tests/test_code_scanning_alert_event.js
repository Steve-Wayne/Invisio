import { handleCodeScanningAlertEvent } from '../controllers/eventsHandler.js';

const testPayloads = [
  {
    lang: 'JavaScript',
    payload: {
      action: 'created',
      alert: {
        rule: { id: 'js/injection', description: 'Possible SQL injection' },
        most_recent_instance: { ref: 'refs/heads/main' },
      },
      repository: {
        name: 'repo-js',
        owner: { login: 'example' },
      },
      installation: { id: 1 },
    },
  },
  {
    lang: 'Python',
    payload: {
      action: 'created',
      alert: {
        rule: { id: 'py/taint', description: 'Possible command injection' },
        most_recent_instance: { ref: 'refs/heads/main' },
      },
      repository: {
        name: 'repo-py',
        owner: { login: 'example' },
      },
      installation: { id: 1 },
    },
  },
  {
    lang: 'Java',
    payload: {
      action: 'created',
      alert: {
        rule: { id: 'java/xss', description: 'Cross-site scripting' },
        most_recent_instance: { ref: 'refs/heads/main' },
      },
      repository: {
        name: 'repo-java',
        owner: { login: 'example' },
      },
      installation: { id: 1 },
    },
  },
  {
    lang: 'Go',
    payload: {
      action: 'created',
      alert: {
        rule: { id: 'go/unsafe-pointer', description: 'Unsafe pointer usage' },
        most_recent_instance: { ref: 'refs/heads/main' },
      },
      repository: {
        name: 'repo-go',
        owner: { login: 'example' },
      },
      installation: { id: 1 },
    },
  },
];

async function runAll() {
  for (const { lang, payload } of testPayloads) {
    await handleCodeScanningAlertEvent(payload);
    console.log(`Code scanning alert event handled (${lang}).`);
  }
}

runAll();
