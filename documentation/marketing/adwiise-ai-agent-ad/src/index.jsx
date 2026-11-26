import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { Ad } from './Ad.jsx';
import { DURATION_FRAMES, FPS } from './timeline.js';

const Root = () => (
  <>
    <Composition id="Ad" component={Ad} durationInFrames={DURATION_FRAMES} fps={FPS} width={1920} height={1080} defaultProps={{ bgm: true }} />
    <Composition id="AdVertical" component={Ad} durationInFrames={DURATION_FRAMES} fps={FPS} width={1080} height={1920} defaultProps={{ bgm: true }} />
  </>
);

registerRoot(Root);
