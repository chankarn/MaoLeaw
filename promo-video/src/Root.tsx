import { Composition } from 'remotion';
import { Promo, PROMO_DURATION } from './Promo';

export const RemotionRoot = () => (
  <Composition id="Promo" component={Promo} durationInFrames={PROMO_DURATION} fps={30} width={1080} height={1920} />
);
