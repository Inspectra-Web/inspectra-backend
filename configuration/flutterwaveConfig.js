import Flutterwave from 'flutterwave-node-v3';
import { envConfig } from './environmentConfig.js';

const flw = new Flutterwave(
  envConfig.FLUTTERWAVE_LIVE_PUBLIC_KEY,
  envConfig.FLUTTERWAVE_LIVE_SECRET_KEY
);

export default flw;
