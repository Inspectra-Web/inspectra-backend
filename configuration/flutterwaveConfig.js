import Flutterwave from 'flutterwave-node-v3';
import { envConfig } from './environmentConfig.js';

const flw = new Flutterwave(
  envConfig.FLUTTERWAVE_TEST_PUBLIC_KEY,
  envConfig.FLUTTERWAVE_TEST_SECRET_KEY
);

export default flw;
