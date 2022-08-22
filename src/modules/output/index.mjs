import chalk from 'chalk';

class Output {

    warning(value) {
        console.log(chalk.hex('#FFA500')(value));

        return this;
    }

    error(value) {
        console.log(chalk.red(value));

        return this;
    }

    info(value) {
        console.log(chalk.green(value));

        return this;
    }
}

export default new Output();
