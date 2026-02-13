import { RANGE_START, RANGE_END } from './constants';

type DiffOp = {
  op: 'equal' | 'delete' | 'insert';
  text: string;
  id?: string;
};

const ANSI = {
  reset: '\x1b[0m',
  strikethrough: '\x1b[9m',
  underline: '\x1b[4m',
  underlineColorReset: '\x1b[59m',
};

// Color indices for 256-color mode (editor-friendly palette for dark backgrounds)
const COLOR_INDICES = [
  147, // lavender
  110, // soft blue
  216, // peach
  182, // mauve
  73,  // muted teal
  222, // soft gold
];

// Foreground colors for strikethrough (needs colored text)
const FG_COLORS = [
  '\x1b[38;5;147m', // lavender
  '\x1b[38;5;110m', // soft blue
  '\x1b[38;5;216m', // peach
  '\x1b[38;5;182m', // mauve
  '\x1b[38;5;73m',  // muted teal
  '\x1b[38;5;222m', // soft gold
];

export function visualizeDiff(diff: DiffOp[]): string {
  const idToColorIndex = new Map<string, number>();

  return diff
    .map((op) => {
      if (op.op === 'equal') {
        return op.text;
      }

      const id = op.id ?? '';
      if (!idToColorIndex.has(id)) {
        idToColorIndex.set(id, idToColorIndex.size % COLOR_INDICES.length);
      }
      const colorIndex = idToColorIndex.get(id)!;

      if (op.op === 'delete') {
        // Strikethrough needs colored text
        return `${ANSI.strikethrough}${FG_COLORS[colorIndex]}${op.text}${ANSI.reset}`;
      } else {
        // Underline can have separate color from text
        const underlineColor = `\x1b[58;5;${COLOR_INDICES[colorIndex]}m`;
        return `${ANSI.underline}${underlineColor}${op.text}${ANSI.reset}`;
      }
    })
    .join('');
}

export function logDiff(...args: (string | DiffOp[] | null)[]): void {
  const output = args
    .map((arg) => {
      if (arg === null) return 'null';
      if (typeof arg === 'string') return arg;
      return visualizeDiff(arg);
    })
    .join(' ')
    .replaceAll(RANGE_START, '⟦')
    .replaceAll(RANGE_END, '⟧');
  console.log(output);
}
