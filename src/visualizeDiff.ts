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

// Color indices for 256-color mode
const COLOR_INDICES = [
  196, // red
  33,  // blue
  200, // magenta
  226, // yellow
  51,  // cyan
  46,  // green
];

// Foreground colors for strikethrough (needs colored text)
const FG_COLORS = [
  '\x1b[38;5;196m', // red
  '\x1b[38;5;33m',  // blue
  '\x1b[38;5;200m', // magenta
  '\x1b[38;5;226m', // yellow
  '\x1b[38;5;51m',  // cyan
  '\x1b[38;5;46m',  // green
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

export function logDiff(...args: (string | DiffOp[])[]): void {
  const output = args
    .map((arg) => (typeof arg === 'string' ? arg : visualizeDiff(arg)))
    .join(' ');
  console.log(output);
}
