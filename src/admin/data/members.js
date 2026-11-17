import { BR } from './branches';

export const token = (m) => m?.qr_token || m?.member_code || ('FTV-' + (BR[m?.branch]?.no || '01') + '-' + (m?.num || '001') + '-' + (m?.hex || '000000'));
