import { Command } from 'commander';
import {
  getLatestDeployURL,
  getStudyConfig,
  mturkPostStudy,
  prolificCreateDraftStudy,
  prolificCreateStudyObject,
} from './cli-utils.js';
import { mturkConfig } from './cli-utils.js';
import firebaseConfig from '../config/firebase-config.js';
import { MTurkClient } from '@aws-sdk/client-mturk';

const program = new Command();
program
  .option('-p --prolific', 'use Prolific')
  .option('-m --mturk', 'use MTurk')
  .argument('<experiment-name>', 'name of experiment directory')
  .showHelpAfterError();

program.parse();
const options = program.opts();

if (
  (options.prolific && options.mturk) ||
  (!options.prolific && !options.mturk)
) {
  console.log(
    'Error: You must specify where to create the draft study, either --prolific (-p) or --mturk (-m).'
  );
  process.exit(1);
}

// Get study configuration file
const expName = program.args[0];
if (expName === 'compensation' && !options.mturk) {
  console.log('Error: Compensation studies are for MTurk only.');
  process.exit(1);
}
let config = await getStudyConfig(expName);
console.log(config);

// Get study history (for latest deploy)
let studyURL = await getLatestDeployURL(expName);

if (options.prolific) {
  // PROLIFIC
  // Create study
  try {
    let studyObject = await prolificCreateStudyObject(
      expName,
      studyURL,
      config
    );
    await prolificCreateDraftStudy(studyObject);
  } catch (e) {
    console.log(e.message);
  }
} else if (options.mturk) {
  // MTURK
  // Set up MTurk connection
  const client = new MTurkClient({
    region: 'us-east-1',
    endpoint: mturkConfig.sandboxEndpoint,
  });

  await mturkPostStudy(
    client,
    expName,
    studyURL,
    config,
    firebaseConfig,
    mturkConfig,
    {
      compensation: false,
      sandbox: true,
    }
  );
}
