import * as React from 'react';
import {createGameBindings} from './videogames-kit/adapters/react-ui.mjs';
import './videogames-kit/styles/game-ui.css';
import './videogames-kit/styles/integration.css';
export const {useGamePreferences,GameKitControls}=createGameBindings(React);
export {getGameSettings,getGameController,toggleGameFullscreen} from './videogames-kit/src/integration.mjs';
