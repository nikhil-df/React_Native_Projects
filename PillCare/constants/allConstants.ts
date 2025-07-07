// theme.js

import { Dimensions, useColorScheme } from 'react-native';

// Color palettes
// Light Mode
const lightColors = {
  primary: '#6FCF97',    // (backgrounds, buttons)
  secondary: '#27AE60',  // (cards, highlights)
  accent: '#B2F2D7',     // (backgrounds, accents)
  background: '#E8F6EF', // (overall app background)
  card: '#FFFFFF',       // (cards, panels)
  text: '#222B45',       // (main text)
  subtext: '#7D8F9A',    // (secondary text)
};


// Dark Mode
const darkColors = {
  primary: '#27AE60',   
  secondary: '#6FCF97', 
  accent: '#145A32',    
  background: '#181A1B',
  card: '#222B45',      
  text: '#FAFAFA',      
  subtext: '#B2F2D7',   
};


export function useColors() {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkColors : lightColors;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
export { SCREEN_HEIGHT, SCREEN_WIDTH };

