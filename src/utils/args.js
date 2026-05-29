export function parseArgs(argv) {
  const args = {
    url: null,
    depth: 1,
    output: null,
    screenshots: true,
    zip: true,
  };

  for (const arg of argv.slice(2)) {
    if (arg.startsWith('http://') || arg.startsWith('https://')) {
      args.url = arg;
    } else if (arg.startsWith('--depth=')) {
      args.depth = parseInt(arg.split('=')[1], 10) || 1;
    } else if (arg.startsWith('--output=')) {
      args.output = arg.split('=').slice(1).join('=');
    } else if (arg === '--no-screenshots') {
      args.screenshots = false;
    } else if (arg === '--no-zip') {
      args.zip = false;
    }
  }

  return args;
}
