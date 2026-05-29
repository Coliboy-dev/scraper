import chalk from 'chalk';

function timestamp() {
  return chalk.gray(new Date().toLocaleTimeString('fr-FR'));
}

export const logger = {
  banner() {
    console.log(chalk.cyan('╔═══════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║') + chalk.bold.white('          SITE SCRAPER — Rétro-ingénierie web          ') + chalk.cyan('║'));
    console.log(chalk.cyan('╚═══════════════════════════════════════════════════════╝'));
    console.log();
  },

  info(msg) {
    console.log(`${timestamp()} ${chalk.blue('ℹ')} ${msg}`);
  },

  step(n, total, msg) {
    console.log();
    console.log(chalk.bold.yellow(`[${n}/${total}] ${msg}...`));
  },

  done(msg) {
    console.log(`${chalk.green('✓')} ${msg}`);
  },

  warn(msg) {
    console.log(`${chalk.yellow('⚠')} ${msg}`);
  },

  error(msg) {
    console.log(`${chalk.red('✗')} ${msg}`);
  },

  sub(msg) {
    console.log(`  ${chalk.gray('→')} ${msg}`);
  },

  asset(type, name) {
    console.log(`  ${chalk.gray('+')} ${chalk.cyan(type.padEnd(7))} ${name}`);
  },

  footer(stats) {
    console.log();
    console.log(chalk.cyan('╔══════════════════════════════════════╗'));
    console.log(chalk.cyan('║') + chalk.bold.green('           SCRAPING TERMINÉ           ') + chalk.cyan('║'));
    console.log(chalk.cyan('╚══════════════════════════════════════╝'));
    console.log();
    console.log(chalk.bold('Résumé :'));
    for (const [key, val] of Object.entries(stats)) {
      console.log(`  ${chalk.white(key.padEnd(22))}: ${chalk.cyan(val)}`);
    }
    console.log();
  },
};
